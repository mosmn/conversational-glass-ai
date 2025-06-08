import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations, messages, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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
import { estimateTokens } from "@/lib/ai/utils";

// Request validation schema - now supports all provider models
const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  model: z.enum([
    // OpenAI models
    "gpt-4",
    "gpt-3.5-turbo",
    // Groq models
    "llama-3.3-70b",
    "llama-3.1-8b",
    "gemma2-9b",
  ]),
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
    const { conversationId, content, model } = sendMessageSchema.parse(body);

    // Validate model availability
    const aiModel = getModelById(model as ModelId);
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

    // Save user message to database
    const [userMessage] = await db
      .insert(messages)
      .values({
        conversationId,
        userId: user.id,
        role: "user",
        content,
        model: null, // User messages don't have a model
        tokenCount: estimateTokens(content),
        metadata: {
          streamingComplete: true,
          regenerated: false,
        },
      })
      .returning();

    // Get conversation history for context
    const conversationMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    // Prepare messages for AI API
    const chatMessages: AIMessage[] = conversationMessages.map((msg) => ({
      role: msg.role as "system" | "user" | "assistant",
      content: msg.content,
    }));

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Create multi-provider streaming completion
          const aiStream = createStreamingCompletion(
            chatMessages,
            model as ModelId,
            {
              userId: clerkUserId,
              conversationId,
            }
          );

          let assistantContent = "";
          let totalTokenCount = 0;

          // Process streaming chunks
          for await (const chunk of aiStream) {
            if (chunk.error) {
              // Handle streaming error
              const errorChunk = {
                type: "error",
                error: chunk.error,
                finished: true,
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`)
              );
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
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(responseChunk)}\n\n`)
              );
            }

            // Check if stream is finished
            if (chunk.finished) {
              break;
            }
          }

          // Save assistant message to database
          const [assistantMessage] = await db
            .insert(messages)
            .values({
              conversationId,
              userId: user.id,
              role: "assistant",
              content: assistantContent,
              model,
              tokenCount: totalTokenCount,
              metadata: {
                streamingComplete: true,
                regenerated: false,
                processingTime: Date.now() / 1000,
                provider: provider.name,
                modelConfig: {
                  name: aiModel.name,
                  personality: aiModel.personality,
                  contextWindow: aiModel.contextWindow,
                },
              },
            })
            .returning();

          // Update conversation metadata safely
          const currentMetadata = conversation.metadata || {
            totalMessages: 0,
            lastModel: model,
            tags: [],
            sentiment: null,
            summary: null,
          };

          await db
            .update(conversations)
            .set({
              model,
              metadata: {
                totalMessages: currentMetadata.totalMessages + 2,
                lastModel: model,
                lastProvider: provider.name,
                tags: currentMetadata.tags,
                sentiment: currentMetadata.sentiment,
                summary: currentMetadata.summary,
              },
              updatedAt: new Date(),
            })
            .where(eq(conversations.id, conversationId));

          // Send completion signal
          const completionChunk = {
            type: "completion",
            content: assistantContent,
            finished: true,
            messageId: assistantMessage.id,
            tokenCount: totalTokenCount,
            provider: provider.name,
            model: aiModel.name,
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(completionChunk)}\n\n`)
          );

          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);

          let errorMessage = "An unexpected error occurred";

          if (error instanceof AIProviderError) {
            errorMessage = error.message;
          } else if (error instanceof Error) {
            errorMessage = error.message;
          }

          const errorChunk = {
            type: "error",
            error: errorMessage,
            finished: true,
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
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);

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

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
