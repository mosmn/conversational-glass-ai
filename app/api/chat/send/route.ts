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
    const { conversationId, content, model, attachments } =
      sendMessageSchema.parse(body);

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

    // Save user message to database immediately
    const userMessage = await MessageQueries.addMessage({
      conversationId,
      userId: user.id,
      role: "user",
      content,
      model: null, // User messages don't have a model
      tokenCount: estimateTokens(content),
      metadata: {
        streamingComplete: true,
        regenerated: false,
        attachments: attachments?.map((att) => ({
          type:
            att.category ||
            (att.type.split("/")[0] as "image" | "pdf" | "text"),
          url: att.url,
          filename: att.name,
          size: att.size,
          extractedText: att.extractedText, // Store extracted text for historical access
          metadata: att.metadata, // Store metadata like pages, dimensions, etc.
        })),
      },
    });

    // Create placeholder assistant message for streaming
    const assistantMessage = await MessageQueries.addMessage({
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

          for (const att of msg.metadata.attachments) {
            messageWithFiles += `\n📎 ${att.filename}`;
            if (att.type) {
              messageWithFiles += ` (${att.type})`;
            }

            // If we have stored extracted text in metadata, use it
            if (att.extractedText) {
              const maxLength = 1000;
              const truncatedText =
                att.extractedText.length > maxLength
                  ? att.extractedText.substring(0, maxLength) + "..."
                  : att.extractedText;
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
      // Regular message without files
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
          // Create multi-provider streaming completion with user context for BYOK
          const aiStream = createStreamingCompletion(
            chatMessages,
            model as ModelId,
            {
              userId: user.id, // Pass database user ID for BYOK lookup
              conversationId,
            }
          );

          let assistantContent = "";
          let totalTokenCount = 0;
          const startTime = Date.now();

          // Process streaming chunks
          for await (const chunk of aiStream) {
            if (chunk.error) {
              // Handle streaming error
              const errorChunk = {
                type: "error",
                error: chunk.error,
                finished: true,
                messageId: assistantMessage.id,
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`)
              );

              // Update the assistant message with error status
              await MessageQueries.updateMessage(assistantMessage.id, user.id, {
                content: `Error: ${chunk.error}`,
                metadata: {
                  streamingComplete: false,
                  regenerated: false,
                  error: true,
                },
              });

              controller.close();
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
                messageId: assistantMessage.id,
                userMessageId: userMessage.id,
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(responseChunk)}\n\n`)
              );

              // Update message in database periodically (every ~1000 chars or 5 seconds)
              if (assistantContent.length % 1000 === 0) {
                await MessageQueries.updateMessage(
                  assistantMessage.id,
                  user.id,
                  {
                    content: assistantContent,
                    tokenCount: totalTokenCount,
                  }
                );
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
            },
          });

          // Generate title if this is the first meaningful exchange
          const shouldGenerateTitle = await checkAndGenerateTitle(
            conversation,
            userMessage.content,
            assistantContent
          );

          // Send final completion chunk
          const completionChunk = {
            type: "completed",
            finished: true,
            messageId: assistantMessage.id,
            userMessageId: userMessage.id,
            totalTokens: totalTokenCount,
            processingTime: (Date.now() - startTime) / 1000,
            titleGenerated: shouldGenerateTitle,
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(completionChunk)}\n\n`)
          );
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);

          // Update message with error
          await MessageQueries.updateMessage(assistantMessage.id, user.id, {
            content: `Error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            metadata: {
              streamingComplete: false,
              regenerated: false,
              error: true,
            },
          });

          const errorChunk = {
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
            finished: true,
            messageId: assistantMessage.id,
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`)
          );
          controller.close();
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
