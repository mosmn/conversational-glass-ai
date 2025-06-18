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
import {
  ModelId,
  ChatMessage as AIMessage,
  AIProviderError,
} from "@/lib/ai/types";
import { FileProcessor } from "@/lib/ai/file-processor";
import { estimateTokens } from "@/lib/ai/utils";
import {
  generateConversationTitle,
  needsTitle,
} from "@/lib/ai/title-generator";

// Request validation schema - now supports all provider models dynamically
const sendMessageSchema = z.object({
  conversationId: z
    .string()
    .uuid("Invalid conversation ID format. Please use a valid UUID."),
  content: z.string().max(10000),
  model: z.string().min(1, "Model ID is required"),
  displayContent: z.string().max(10000).optional(), // Original user content for display (used when content is search-enhanced)
  searchResults: z
    .array(
      z.object({
        title: z.string(),
        url: z.string(),
        snippet: z.string(),
        publishedDate: z.string().optional(),
        provider: z.string(),
        score: z.number().optional(),
        favicon: z.string().optional(),
      })
    )
    .nullable()
    .optional(), // Search results to store with assistant message; can be null or undefined
  searchQuery: z.string().optional(), // Original search query
  searchProvider: z.string().optional(), // Search provider used
  attachments: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        size: z.number(),
        type: z.string(),
        url: z.string(),
        extractedText: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        category: z.string().optional(),
        metadata: z
          .object({
            width: z.number().optional(),
            height: z.number().optional(),
            pages: z.number().optional(),
            wordCount: z.number().optional(),
            hasImages: z.boolean().optional(),
          })
          .optional(),
      })
    )
    .optional(),
  retryMessageId: z.string().optional(), // Optional ID of assistant message to replace during retry
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

    // ------------------------------------------------------------------
    // Defensive guard: clients may include explicit `null` for optional
    // search-related fields when web search is disabled. Although the Zod
    // schema now allows null, older compiled code or downstream logic may
    // still expect these fields to be undefined. To ensure robust
    // handling we strip out any null values here before validation.
    // ------------------------------------------------------------------
    if (body.searchResults === null) delete body.searchResults;
    if (body.searchQuery === null) delete body.searchQuery;
    if (body.searchProvider === null) delete body.searchProvider;

    const {
      conversationId,
      content,
      model,
      displayContent,
      attachments,
      retryMessageId,
      searchResults,
      searchQuery,
      searchProvider,
    } = sendMessageSchema.parse(body);

    // Validate that we have either content or attachments
    if (!content.trim() && (!attachments || attachments.length === 0)) {
      return NextResponse.json(
        { error: "Message content or attachments required" },
        { status: 400 }
      );
    }

    // Validate model availability
    console.log(`🔍 Validating model: ${model}`);
    const aiModel = await getModelById(model as ModelId);
    console.log(
      `🔍 getModelById result:`,
      aiModel ? `Found: ${aiModel.name}` : "Not found"
    );

    if (!aiModel) {
      console.error(`❌ Model '${model}' not found in available models`);
      return NextResponse.json(
        { error: `Model '${model}' is not available or configured` },
        { status: 400 }
      );
    }

    const provider = getProviderForModel(model as ModelId);
    console.log(
      `🔍 getProviderForModel result:`,
      provider ? `Found: ${provider.name}` : "Not found"
    );

    if (!provider) {
      console.error(`❌ Provider for model '${model}' not found`);
      return NextResponse.json(
        { error: `Provider for model '${model}' is not configured` },
        { status: 400 }
      );
    }

    // Find user in database and get personalization data
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Extract personalization data from user preferences
    const personalization = user.preferences?.personalization || {};

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

    // CRITICAL FIX: Update conversation model if it's different from the request model
    // This ensures branch conversations reflect the current model selection
    if (conversation.model !== model) {
      console.log(
        `🔄 Updating conversation model from '${conversation.model}' to '${model}'`
      );
      await db
        .update(conversations)
        .set({
          model,
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));
    }

    // Handle retry logic
    let userMessage;
    let assistantMessage;

    if (retryMessageId) {
      // For retry, we don't create a new user message - we reuse the existing one
      // and replace the assistant message
      console.log(
        `🔄 Retry mode: Replacing assistant message ${retryMessageId}`
      );

      // Find the existing assistant message
      const existingMessages = await MessageQueries.getConversationMessages(
        conversationId,
        user.id,
        100 // Get enough messages to find the context
      );

      const assistantMessageIndex = existingMessages.messages.findIndex(
        (msg) => msg.id === retryMessageId && msg.role === "assistant"
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
        if (existingMessages.messages[i].role === "user") {
          precedingUserMessage = existingMessages.messages[i];
          break;
        }
      }

      if (!precedingUserMessage) {
        return NextResponse.json(
          { error: "No user message found to retry" },
          { status: 400 }
        );
      }

      // Use the existing user message
      userMessage = precedingUserMessage;

      // Update the assistant message to start fresh
      await MessageQueries.updateMessage(retryMessageId, user.id, {
        content: "",
        model,
        tokenCount: 0,
        metadata: {
          streamingComplete: false,
          regenerated: true, // Mark as regenerated
        },
      });

      // Use the existing assistant message
      assistantMessage = {
        id: retryMessageId,
        role: "assistant",
        content: "",
        model,
        tokenCount: 0,
        metadata: {
          streamingComplete: false,
          regenerated: true,
        },
      };

      console.log(`🔄 Retry setup complete for message ${retryMessageId}`);
    } else {
      // Normal message flow - create new messages
      // Save user message to database immediately
      // Use displayContent if provided (for search-enhanced messages), otherwise use content
      const userDisplayContent = displayContent || content;
      userMessage = await MessageQueries.addMessage({
        conversationId,
        userId: user.id,
        role: "user",
        content: userDisplayContent, // Always save the original user content for display
        model: null, // User messages don't have a model
        tokenCount: estimateTokens(userDisplayContent),
        metadata: {
          streamingComplete: true,
          regenerated: false,
          // Store enhanced content separately if search was used
          ...(displayContent && displayContent !== content
            ? { enhancedContent: content }
            : {}),
          attachments: attachments?.map((att) => ({
            type:
              att.category ||
              (att.type.split("/")[0] as "image" | "pdf" | "text"),
            url: att.url,
            filename: att.name,
            size: att.size,
            // Cast to any to avoid strict metadata typing issues
            extractedText: (att as any).extractedText, // Store extracted text for historical access
            metadata: att.metadata, // Store metadata like pages, dimensions, etc.
          })),
        } as any,
      });

      // Create placeholder assistant message for streaming
      assistantMessage = await MessageQueries.addMessage({
        conversationId,
        userId: user.id,
        role: "assistant",
        content: "",
        model,
        tokenCount: 0,
        metadata: {
          streamingComplete: false,
          regenerated: false,
        },
      });
    }

    // Get conversation history for context
    const conversationHistory = await MessageQueries.getConversationMessages(
      conversationId,
      user.id,
      50 // Last 50 messages for context
    );

    console.log(
      "📚 Conversation history:",
      conversationHistory.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content.substring(0, 50) + "...",
        hasAttachments: !!m.metadata?.attachments?.length,
        attachmentCount: m.metadata?.attachments?.length || 0,
        attachments: m.metadata?.attachments?.map((att: any) => ({
          filename: att.filename,
          type: att.type,
        })),
      }))
    );

    // Process files for the current user message
    let processedFiles: any[] = [];
    if (attachments && attachments.length > 0) {
      console.log("🔍 Processing files for model:", aiModel.name);
      console.log(
        "📎 Attachments:",
        attachments.map((att) => ({
          name: att.name,
          type: att.type,
          hasText: !!att.extractedText,
        }))
      );
      console.log("🤖 Model capabilities:", {
        multiModal: aiModel.capabilities.multiModal,
        fileSupport: aiModel.capabilities.fileSupport,
      });

      const processingResult = await FileProcessor.processFilesForProvider(
        attachments,
        aiModel,
        {
          convertToBase64:
            provider.name === "gemini" || provider.name === "claude",
          includeTextExtraction: true,
          optimizeImages: true,
        }
      );

      if (!processingResult.success) {
        console.warn("File processing errors:", processingResult.errors);
      }

      processedFiles = processingResult.processedFiles;
      console.log(
        "✅ Processed files:",
        processedFiles.map((f) => ({
          name: f.name,
          category: f.category,
          hasGeminiFormat: !!f.geminiFormat,
          hasOpenaiFormat: !!f.openaiFormat,
          hasClaudeFormat: !!f.claudeFormat,
          hasTextExtraction: !!f.extractedText,
        }))
      );
    }

    // Prepare messages for AI API (exclude the empty assistant message we just created)
    const chatMessages: AIMessage[] = [];

    for (const msg of conversationHistory.messages.filter(
      (m) => m.id !== assistantMessage.id
    )) {
      // Handle the current user message with new attachments
      if (msg.id === userMessage.id && processedFiles.length > 0) {
        console.log("📨 Formatting current message with new files");
        console.log(
          "🔍 Model supports multimodal:",
          aiModel.capabilities.multiModal
        );
        console.log("📁 Total files:", processedFiles.length);
        console.log(
          "🖼️ Image files:",
          processedFiles.filter((f) => f.category === "image").length
        );
        console.log(
          "📄 Document files:",
          processedFiles.filter((f) => f.category !== "image").length
        );

        // Always use the improved formatMessageWithFiles method
        // It handles both multimodal content AND text extraction properly
        const formattedContent = FileProcessor.formatMessageWithFiles(
          msg.content,
          processedFiles,
          provider.name,
          aiModel
        );
        console.log("✨ Using enhanced file formatting");

        chatMessages.push({
          role: msg.role as "system" | "user" | "assistant",
          content: formattedContent,
        });
      }
      // Handle historical messages that have attachments
      else if (
        msg.metadata?.attachments &&
        msg.metadata.attachments.length > 0
      ) {
        console.log(
          "📎 Processing historical message with attachments:",
          msg.metadata.attachments.length
        );

        // For historical messages, use a simpler approach to avoid reprocessing files
        // that may no longer be accessible or cause performance issues
        let messageWithFiles = msg.content;

        if (msg.metadata.attachments.length > 0) {
          messageWithFiles += "\n\nPreviously attached files:";

          // Cast attachments to any to access extended properties safely
          const histAttachments = msg.metadata.attachments as any[];

          for (const att of histAttachments) {
            messageWithFiles += `\n📎 ${att.filename}`;
            if (att.type) {
              messageWithFiles += ` (${att.type})`;
            }

            // If we have stored extracted text in metadata, use it
            if ((att as any).extractedText) {
              const maxLength = 1000;
              const truncatedText =
                (att as any).extractedText.length > maxLength
                  ? (att as any).extractedText.substring(0, maxLength) + "..."
                  : (att as any).extractedText;
              messageWithFiles += `\nContent: ${truncatedText}`;
            }
          }
        }

        console.log("📝 Using simplified historical file format");
        chatMessages.push({
          role: msg.role as "system" | "user" | "assistant",
          content: messageWithFiles,
        });
      }
      // NEW: Use enhanced content generated by web search if available
      else if ((msg.metadata as any)?.enhancedContent) {
        chatMessages.push({
          role: msg.role as "system" | "user" | "assistant",
          // Prefer the enhancedContent (includes web search context) for the AI model
          content: (msg.metadata as any).enhancedContent,
        });
      }
      // Regular message without files or enhanced content
      else {
        chatMessages.push({
          role: msg.role as "system" | "user" | "assistant",
          content: msg.content,
        });
      }
    }

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // CRITICAL DEBUG: Log the exact model being used for AI provider call
          console.log("🚀 AI Provider Call - Final Debug:");
          console.log(
            "  🤖 Model being passed to createStreamingCompletion:",
            model
          );
          console.log("  📝 Model as ModelId:", model as ModelId);
          console.log("  💬 Conversation ID:", conversationId);
          console.log("  👤 User ID:", user.id);
          console.log("  🏢 Provider name:", provider.name);
          console.log("  🧠 AI Model name:", aiModel.name);

          // Create multi-provider streaming completion with user context for BYOK
          const aiStream = createStreamingCompletion(
            chatMessages,
            model as ModelId,
            {
              userId: user.id, // Pass database user ID for BYOK lookup
              conversationId,
              personalization, // Pass user personalization data
            }
          );

          let assistantContent = "";
          let totalTokenCount = 0;
          const startTime = Date.now();

          // Server-side performance optimizations
          let chunkCount = 0;
          let lastDBUpdate = 0;

          // Process streaming chunks with direct forwarding
          for await (const chunk of aiStream) {
            if (chunk.error) {
              // Handle streaming error
              const errorChunk = {
                type: "error",
                error: chunk.error,
                finished: true,
                messageId: assistantMessage.id,
                userMessageId: userMessage.id,
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`)
              );

              // Delete the failed messages instead of saving error content
              try {
                await MessageQueries.deleteMessage(
                  assistantMessage.id,
                  user.id
                );
                await MessageQueries.deleteMessage(userMessage.id, user.id);
                console.log(
                  "🗑️ Deleted failed messages due to streaming error:",
                  chunk.error
                );
              } catch (deleteError) {
                console.error("Failed to delete error messages:", deleteError);
                // Fallback: mark as error without content
                await MessageQueries.updateMessage(
                  assistantMessage.id,
                  user.id,
                  {
                    content: "",
                    metadata: {
                      streamingComplete: false,
                      regenerated: false,
                      error: true,
                      deleted: true,
                    } as any,
                  }
                );
              }

              controller.close();
              return;
            }

            if (chunk.content) {
              chunkCount++;

              // CRITICAL DEBUG: Log server-side content processing
              console.log("🖥️ SERVER CHUNK DEBUG:", {
                chunkContent: `"${chunk.content}"`,
                chunkLength: chunk.content.length,
                assistantContentBefore: assistantContent.length,
                assistantContentAfterWillBe:
                  assistantContent.length + chunk.content.length,
                chunkCount,
                provider: provider.name,
                model: aiModel.name,
              });

              // Add content directly to stream and accumulate
              assistantContent += chunk.content;
              totalTokenCount += chunk.tokenCount || 0;

              // Send content chunk to client immediately (no server-side batching)
              const responseChunk = {
                type: "content",
                content: chunk.content,
                finished: false,
                provider: provider.name,
                model: aiModel.name,
                messageId: assistantMessage.id,
                userMessageId: userMessage.id,
              };

              console.log("📤 SENDING TO CLIENT:", {
                responseChunkContent: `"${responseChunk.content}"`,
                responseChunkLength: responseChunk.content?.length || 0,
              });

              try {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(responseChunk)}\n\n`)
                );
              } catch (controllerError) {
                // Controller is closed (likely due to client abort) - exit gracefully
                console.log("🛑 Controller closed, stopping stream gracefully");
                break;
              }

              // Non-blocking database updates with reduced frequency for performance
              const now = Date.now();
              if (
                now - lastDBUpdate >= 2000 &&
                assistantContent.length % 2000 === 0
              ) {
                lastDBUpdate = now;
                // Use setTimeout to make DB update non-blocking
                setTimeout(async () => {
                  try {
                    await MessageQueries.updateMessage(
                      assistantMessage.id,
                      user.id,
                      {
                        content: assistantContent,
                        tokenCount: totalTokenCount,
                      }
                    );
                  } catch (dbError) {
                    console.warn("Non-blocking DB update failed:", dbError);
                  }
                }, 0);
              }
            }

            // Check if stream is finished
            if (chunk.finished) {
              break;
            }
          }

          // Mark streaming as complete and save final content
          const finalMessage = await MessageQueries.markStreamingComplete(
            assistantMessage.id,
            assistantContent,
            totalTokenCount
          );

          // Update assistant message metadata with completion info
          await MessageQueries.updateMessage(assistantMessage.id, user.id, {
            metadata: {
              streamingComplete: true,
              regenerated: false,
              processingTime: (Date.now() - startTime) / 1000,
              provider: provider.name,
              model: aiModel.name,
              // Include search results if provided
              ...(searchResults && searchResults.length > 0
                ? {
                    searchResults,
                    searchQuery,
                    searchProvider,
                  }
                : {}),
            } as any,
          });

          // Generate title if this is the first meaningful exchange
          const shouldGenerateTitle = await checkAndGenerateTitle(
            conversation,
            userMessage.content,
            assistantContent
          );

          // Send final completion chunk (only if controller is still open)
          const completionChunk: any = {
            type: "completed",
            finished: true,
            messageId: assistantMessage.id,
            userMessageId: userMessage.id,
            totalTokens: totalTokenCount,
            processingTime: (Date.now() - startTime) / 1000,
            titleGenerated: shouldGenerateTitle,
          };
          if (searchResults && searchResults.length > 0) {
            completionChunk.searchResults = searchResults;
            completionChunk.searchQuery = searchQuery;
            completionChunk.searchProvider = searchProvider;
          }

          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(completionChunk)}\n\n`)
            );
            controller.close();
          } catch (controllerError) {
            // Controller already closed - this is fine
            console.log(
              "🛑 Controller already closed, stream completed gracefully"
            );
          }
        } catch (error) {
          console.error("Streaming error:", error);

          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          // Delete the failed messages instead of saving error content
          try {
            await MessageQueries.deleteMessage(assistantMessage.id, user.id);
            await MessageQueries.deleteMessage(userMessage.id, user.id);
            console.log(
              "🗑️ Deleted failed messages due to streaming error:",
              errorMessage
            );
          } catch (deleteError) {
            console.error("Failed to delete error messages:", deleteError);
            // Fallback: mark as error without content
            await MessageQueries.updateMessage(assistantMessage.id, user.id, {
              content: "",
              metadata: {
                streamingComplete: false,
                regenerated: false,
                error: true,
                deleted: true,
              } as any,
            });
          }

          const errorChunk = {
            type: "error",
            error: errorMessage,
            finished: true,
            messageId: assistantMessage.id,
            userMessageId: userMessage.id,
          };

          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`)
            );
            controller.close();
          } catch (controllerError) {
            // Controller already closed - this is fine for error handling too
            console.log("🛑 Controller already closed during error handling");
          }
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
    console.error("Chat API error:", error);

    if (error instanceof z.ZodError) {
      console.error("Zod validation error details:", error.errors);
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Unexpected error in chat API:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Checks if a conversation needs a title and generates one if needed
 */
async function checkAndGenerateTitle(
  conversation: any,
  userMessage: string,
  assistantMessage: string
): Promise<boolean> {
  try {
    // Check if conversation needs a title
    if (!needsTitle(conversation.title)) {
      return false;
    }

    // Generate new title
    const newTitle = await generateConversationTitle(
      userMessage,
      assistantMessage
    );

    // Update conversation title in database
    await db
      .update(conversations)
      .set({
        title: newTitle,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversation.id));

    console.log(
      `✨ Generated title for conversation ${conversation.id}: "${newTitle}"`
    );
    return true;
  } catch (error) {
    console.error("Title generation failed:", error);
    return false;
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
