import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { MessageQueries } from "@/lib/db/queries";
import {
  createStreamingCompletion,
  getModelById,
  getProviderForModel,
} from "@/lib/ai/providers";
import { ModelId, ChatMessage as AIMessage } from "@/lib/ai/types";
import { estimateTokens } from "@/lib/ai/utils";
import {
  generateConversationTitle,
  needsTitle,
} from "@/lib/ai/title-generator";

// Request validation schema for retry
const retryMessageSchema = z.object({
  conversationId: z
    .string()
    .uuid("Invalid conversation ID format. Please use a valid UUID."),
  messageId: z.string().min(1, "Message ID is required"),
  model: z.string().min(1, "Model ID is required"),
});

export async function POST(request: NextRequest) {
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
    const { conversationId, messageId, model } = retryMessageSchema.parse(body);

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

    // Get conversation messages to find context
    const conversationHistory = await MessageQueries.getConversationMessages(
      conversationId,
      user.id,
      100 // Get enough messages to find the context
    );

    // Find the assistant message to retry
    const assistantMessageIndex = conversationHistory.messages.findIndex(
      (msg) => msg.id === messageId && msg.role === "assistant"
    );

    if (assistantMessageIndex === -1) {
      return NextResponse.json(
        { error: "Assistant message to retry not found" },
        { status: 404 }
      );
    }

    // Find the user message that preceded this assistant message
    let precedingUserMessage = null;
    for (let i = assistantMessageIndex - 1; i >= 0; i--) {
      if (conversationHistory.messages[i].role === "user") {
        precedingUserMessage = conversationHistory.messages[i];
        break;
      }
    }

    if (!precedingUserMessage) {
      return NextResponse.json(
        { error: "No user message found to retry" },
        { status: 400 }
      );
    }

    console.log(`🔄 Retrying message ${messageId} with model ${model}`);

    // Update the assistant message to start fresh
    await MessageQueries.updateMessage(messageId, user.id, {
      content: "",
      model,
      tokenCount: 0,
      metadata: {
        streamingComplete: false,
        regenerated: true,
      },
    });

    // Build conversation history for AI context (up to the user message)
    const chatMessages: AIMessage[] = [];
    for (let i = 0; i < assistantMessageIndex; i++) {
      const msg = conversationHistory.messages[i];
      chatMessages.push({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      });
    }

    const startTime = Date.now();
    let assistantContent = "";
    let totalTokenCount = 0;

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const safeEnqueue = (data: string) => {
          try {
            controller.enqueue(encoder.encode(data));
          } catch (error) {
            console.log("🛑 Controller closed, stopping enqueue");
          }
        };

        const safeClose = () => {
          try {
            controller.close();
          } catch (error) {
            console.log("🛑 Controller already closed");
          }
        };

        try {
          // Create AI streaming completion
          const aiStream = createStreamingCompletion(
            chatMessages,
            model as ModelId,
            {
              userId: user.id,
              conversationId,
            }
          );

          // Process streaming chunks
          for await (const chunk of aiStream) {
            if (chunk.error) {
              // Handle streaming error
              const errorChunk = {
                type: "error",
                error: chunk.error,
                finished: true,
                messageId,
              };

              safeEnqueue(`data: ${JSON.stringify(errorChunk)}\n\n`);

              // Update message with error status
              await MessageQueries.updateMessage(messageId, user.id, {
                content: `Error: ${chunk.error}`,
                metadata: {
                  streamingComplete: false,
                  regenerated: true,
                },
              });

              safeClose();
              return;
            }

            if (chunk.content) {
              assistantContent += chunk.content;
              totalTokenCount += chunk.tokenCount || 0;

              // Send chunk to client
              const responseChunk = {
                type: "content",
                content: chunk.content,
                finished: false,
                provider: provider.name,
                model: aiModel.name,
                messageId,
              };

              safeEnqueue(`data: ${JSON.stringify(responseChunk)}\n\n`);

              // Update message in database periodically
              if (assistantContent.length % 1000 === 0) {
                await MessageQueries.updateMessage(messageId, user.id, {
                  content: assistantContent,
                  tokenCount: totalTokenCount,
                });
              }
            }

            // Check if stream is finished
            if (chunk.finished) {
              break;
            }
          }

          // Mark streaming as complete and save final content
          await MessageQueries.markStreamingComplete(
            messageId,
            assistantContent,
            totalTokenCount
          );

          // Update message metadata
          await MessageQueries.updateMessage(messageId, user.id, {
            metadata: {
              streamingComplete: true,
              regenerated: true,
              processingTime: (Date.now() - startTime) / 1000,
            },
          });

          // Send final completion chunk
          const completionChunk = {
            type: "completed",
            finished: true,
            messageId,
            totalTokens: totalTokenCount,
            processingTime: (Date.now() - startTime) / 1000,
          };

          safeEnqueue(`data: ${JSON.stringify(completionChunk)}\n\n`);
          safeClose();
        } catch (error) {
          console.error("Retry streaming error:", error);

          // Update message with error
          await MessageQueries.updateMessage(messageId, user.id, {
            content: `Error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            metadata: {
              streamingComplete: false,
              regenerated: true,
            },
          });

          const errorChunk = {
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
            finished: true,
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
    console.error("Retry API error:", error);

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
