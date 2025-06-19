import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations, messages, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { MessageQueries } from "@/lib/db/queries";
import {
  createStreamingCompletion,
  getModelById,
  getProviderForModel,
} from "@/lib/ai/providers";
import { ModelId, ChatMessage as AIMessage } from "@/lib/ai/types";
import { streamPersistence } from "@/lib/streaming/persistence";
import { generateStreamId } from "@/lib/streaming/persistence";

// Request validation schema
const resumeStreamSchema = z.object({
  streamId: z.string().min(1, "Stream ID is required"),
  fromChunkIndex: z.number().min(0, "Chunk index must be non-negative"),
  conversationId: z
    .string()
    .uuid("Invalid conversation ID format. Please use a valid UUID."),
  messageId: z.string().min(1, "Message ID is required"),
  model: z.string().min(1, "Model ID is required"),
  lastKnownContent: z.string(),
});

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const {
      streamId,
      fromChunkIndex,
      conversationId,
      messageId,
      model,
      lastKnownContent,
    } = resumeStreamSchema.parse(body);

    console.log(`🔄 Resume stream request:`, {
      streamId,
      fromChunkIndex,
      conversationId,
      messageId,
      model,
      contentLength: lastKnownContent.length,
    });

    // Find user in database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify conversation ownership
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, user.id)
        )
      )
      .limit(1);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      );
    }

    // Get the stream state from persistence - FALLBACK STRATEGY
    let streamState = streamPersistence.getStreamState(streamId);

    if (!streamState) {
      console.error(`❌ Stream state not found for ID: ${streamId}`);

      // FALLBACK: Try to find any stream for this message ID and conversation
      const allStreams = streamPersistence.getIncompleteStreams();
      console.log(
        `📋 Available incomplete streams (${allStreams.length}):`,
        allStreams.map((s) => ({
          streamId: s.streamId,
          messageId: s.messageId,
          conversationId: s.conversationId,
          content: s.content?.substring(0, 50) + "...",
        }))
      );

      // Try to find a stream with matching messageId and conversationId
      const fallbackStream = allStreams.find(
        (s) => s.messageId === messageId && s.conversationId === conversationId
      );

      if (fallbackStream) {
        console.log(`🔄 Using fallback stream: ${fallbackStream.streamId}`);
        streamState = fallbackStream;
      } else {
        // Create a minimal stream state from the provided data
        console.log(`🆕 Creating new stream state from provided data`);
        streamState = {
          streamId,
          conversationId,
          messageId,
          content: lastKnownContent,
          chunkIndex: fromChunkIndex,
          totalTokens: 0,
          tokensPerSecond: 0,
          timeToFirstToken: 0,
          elapsedTime: 0,
          bytesReceived: lastKnownContent.length * 2,
          isComplete: false,
          isPaused: true,
          lastUpdateTime: Date.now(),
          model,
          provider: "unknown",
          originalPrompt: "",
          startTime: Date.now(),
        };

        // Save this new state
        streamPersistence.saveStreamState(streamState);
      }
    }

    console.log(`📊 Found stream state:`, {
      streamId,
      messageId,
      contentLength: streamState.content.length,
      lastKnownContentLength: lastKnownContent.length,
      totalTokens: streamState.totalTokens,
      chunkIndex: streamState.chunkIndex,
      isComplete: streamState.isComplete,
      hasError: !!streamState.error,
    });

    // Validate model availability
    const aiModel = await getModelById(model as ModelId);
    if (!aiModel) {
      return NextResponse.json(
        { error: `Model '${model}' is not available or configured` },
        { status: 400 }
      );
    }

    const provider = getProviderForModel(model as ModelId);
    if (!provider) {
      return NextResponse.json(
        { error: `Provider for model '${model}' is not configured` },
        { status: 400 }
      );
    }

    // Verify the message exists by checking if we have stream state for it
    // Since we already validated streamState exists, we can proceed

    // Get conversation history for context
    const conversationHistory = await MessageQueries.getConversationMessages(
      conversationId,
      user.id,
      50 // Last 50 messages for context
    );

    // Build the message history for the AI
    const chatMessages: AIMessage[] = [];

    // Add conversation history UP TO but not including the message being resumed
    for (const msg of conversationHistory.messages) {
      if (msg.id === messageId) {
        // Stop before the message we're resuming
        break;
      }

      chatMessages.push({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      });
    }

    // CRITICAL FIX: Find and include the user message that prompted the response being resumed
    let userPromptMessage = null;
    for (let i = conversationHistory.messages.length - 1; i >= 0; i--) {
      const msg = conversationHistory.messages[i];
      if (msg.id === messageId) {
        // Found the assistant message being resumed, look for the preceding user message
        for (let j = i - 1; j >= 0; j--) {
          if (conversationHistory.messages[j].role === "user") {
            userPromptMessage = conversationHistory.messages[j];
            break;
          }
        }
        break;
      }
    }

    // If we found the user message that prompted this response, include it if not already included
    if (userPromptMessage) {
      const isAlreadyIncluded = chatMessages.some(
        (msg) => msg.content === userPromptMessage.content
      );
      if (!isAlreadyIncluded) {
        chatMessages.push({
          role: "user",
          content: userPromptMessage.content,
        });
      }
    }

    // CRITICAL FIX: Add the partial assistant response and a follow-up instruction
    if (lastKnownContent && lastKnownContent.trim()) {
      // Add the partial assistant response without any markers
      chatMessages.push({
        role: "assistant",
        content: lastKnownContent,
      });

      // Add a clean user instruction for seamless continuation
      chatMessages.push({
        role: "user",
        content:
          "Continue your response from exactly where you left off. Do not add any ellipsis (...) or continuation markers. Just continue the thought seamlessly.",
      });
    }

    console.log(`📚 Using ${chatMessages.length} messages for context`);
    console.log(`🎯 User prompt found:`, !!userPromptMessage);
    console.log(`📝 Partial content length:`, lastKnownContent?.length || 0);
    console.log(
      `🔄 Context preview:`,
      chatMessages.slice(-2).map((m) => ({
        role: m.role,
        content:
          typeof m.content === "string"
            ? m.content.substring(0, 100) + "..."
            : "[Complex Content]",
      }))
    );

    // Generate a new stream ID for the resumed stream
    const newStreamId = generateStreamId(conversationId, messageId);

    // Update stream state with new stream ID and reset some tracking
    const resumedStreamState = {
      ...streamState,
      streamId: newStreamId,
      chunkIndex: fromChunkIndex,
      isPaused: false,
      lastUpdateTime: Date.now(),
      startTime: Date.now(),
    };

    // Save the resumed stream state
    streamPersistence.saveStreamState(resumedStreamState);

    console.log(
      `🔄 Resuming stream ${streamId} as new stream ${newStreamId} from chunk ${fromChunkIndex}`
    );

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        let assistantContent = lastKnownContent; // Start with existing content
        let totalTokenCount = streamState.totalTokens;
        let currentChunkIndex = fromChunkIndex;
        let isControllerClosed = false;
        const startTime = Date.now();

        // Helper function to safely enqueue data
        const safeEnqueue = (data: string) => {
          if (!isControllerClosed) {
            try {
              controller.enqueue(encoder.encode(data));
            } catch (error) {
              console.warn("Controller enqueue error:", error);
              isControllerClosed = true;
            }
          }
        };

        // Helper function to safely close controller
        const safeClose = () => {
          if (!isControllerClosed) {
            try {
              controller.close();
              isControllerClosed = true;
            } catch (error) {
              console.warn("Controller close error:", error);
              isControllerClosed = true;
            }
          }
        };

        try {
          console.log(
            `🔄 Starting AI stream resumption for message ${messageId}...`
          );
          console.log(
            `📝 Existing content length: ${assistantContent.length} chars`
          );
          console.log(`🎯 Resuming from chunk index: ${currentChunkIndex}`);

          // Restore the message content in case it was corrupted during interruption
          // This ensures we have the correct partial content before resuming
          await MessageQueries.updateMessage(messageId, user.id, {
            content: assistantContent || streamState.content || "",
            metadata: {
              streamingComplete: false,
              resumeAttempted: true,
              originalStreamId: streamId,
              currentStreamId: newStreamId,
            } as any,
          });

          console.log(`🔧 Restored message content before resumption`);

          // Create multi-provider streaming completion
          const aiStream = createStreamingCompletion(
            chatMessages,
            model as ModelId,
            {
              userId: user.id,
              conversationId,
            }
          );

          // Send resume notification
          safeEnqueue(
            `data: ${JSON.stringify({
              type: "resumed",
              streamId: newStreamId,
              originalStreamId: streamId,
              resumedFromChunk: fromChunkIndex,
              existingContent: lastKnownContent,
              messageId,
            })}\n\n`
          );

          // Process streaming chunks
          for await (const chunk of aiStream) {
            if (chunk.error) {
              // Handle streaming error
              const errorChunk = {
                type: "error",
                error: chunk.error,
                finished: true,
                streamId: newStreamId,
                messageId,
              };

              safeEnqueue(`data: ${JSON.stringify(errorChunk)}\n\n`);

              // Update message with error status
              await MessageQueries.updateMessage(messageId, user.id, {
                content:
                  assistantContent + `\n\n[Resume Error: ${chunk.error}]`,
                metadata: {
                  streamingComplete: false,
                  error: true,
                  resumeAttempted: true,
                  originalStreamId: streamId,
                } as any,
              });

              // Mark stream as errored
              streamPersistence.saveStreamState({
                ...resumedStreamState,
                error: chunk.error,
                isComplete: true,
              });

              safeClose();
              return;
            }

            if (chunk.content) {
              assistantContent += chunk.content;
              totalTokenCount += chunk.tokenCount || 0;
              currentChunkIndex++;

              // Update stream state
              const updatedStreamState = {
                ...resumedStreamState,
                content: assistantContent,
                chunkIndex: currentChunkIndex,
                totalTokens: totalTokenCount,
                lastUpdateTime: Date.now(),
                elapsedTime: Date.now() - startTime,
                tokensPerSecond: Math.round(
                  (totalTokenCount / (Date.now() - startTime)) * 1000
                ),
              };

              streamPersistence.saveStreamState(updatedStreamState);

              // Send chunk to client
              const responseChunk = {
                type: "content",
                content: chunk.content,
                finished: false,
                provider: provider.name,
                model: aiModel.name,
                streamId: newStreamId,
                messageId,
                chunkIndex: currentChunkIndex,
                totalTokens: totalTokenCount,
                isResumed: true,
              };

              safeEnqueue(`data: ${JSON.stringify(responseChunk)}\n\n`);

              // Update message in database periodically
              if (currentChunkIndex % 10 === 0) {
                await MessageQueries.updateMessage(messageId, user.id, {
                  content: assistantContent,
                  tokenCount: totalTokenCount,
                  metadata: {
                    streamingComplete: false,
                    resumeAttempted: true,
                    originalStreamId: streamId,
                    currentStreamId: newStreamId,
                  } as any,
                });
              }
            }

            // Check if stream is finished
            if (chunk.finished) {
              break;
            }
          }

          // Mark streaming as complete
          const finalMessage = await MessageQueries.markStreamingComplete(
            messageId,
            assistantContent,
            totalTokenCount
          );

          // Update message metadata with completion info
          await MessageQueries.updateMessage(messageId, user.id, {
            metadata: {
              streamingComplete: true,
              resumeAttempted: true,
              originalStreamId: streamId,
              currentStreamId: newStreamId,
              processingTime: (Date.now() - startTime) / 1000,
              provider: provider.name,
              model: aiModel.name,
            },
          });

          // Mark stream as complete and clean up
          streamPersistence.markStreamComplete(newStreamId);
          streamPersistence.removeStreamState(streamId); // Remove original interrupted stream

          // Send final completion chunk
          const completionChunk = {
            type: "completed",
            finished: true,
            streamId: newStreamId,
            originalStreamId: streamId,
            messageId,
            totalTokens: totalTokenCount,
            processingTime: (Date.now() - startTime) / 1000,
            resumedFromChunk: fromChunkIndex,
            finalChunkIndex: currentChunkIndex,
          };

          safeEnqueue(`data: ${JSON.stringify(completionChunk)}\n\n`);

          console.log(
            `✅ Stream successfully resumed and completed: ${newStreamId}`
          );
          safeClose();
        } catch (error) {
          console.error("Resume streaming error:", error);

          // Update message with error
          await MessageQueries.updateMessage(messageId, user.id, {
            content:
              assistantContent +
              `\n\n[Resume Error: ${
                error instanceof Error ? error.message : "Unknown error"
              }]`,
            metadata: {
              streamingComplete: false,
              error: true,
              resumeAttempted: true,
              originalStreamId: streamId,
            },
          });

          // Mark stream as errored
          streamPersistence.saveStreamState({
            ...resumedStreamState,
            error: error instanceof Error ? error.message : "Unknown error",
            isComplete: true,
          });

          const errorChunk = {
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
            finished: true,
            streamId: newStreamId,
            messageId,
          };

          safeEnqueue(`data: ${JSON.stringify(errorChunk)}\n\n`);
          safeClose();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Resume API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
