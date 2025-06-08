import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { conversations, messages, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  createStreamingChatCompletion,
  handleOpenAIError,
  OpenAIModelId,
  ChatMessage,
  estimateTokens,
} from "@/lib/ai/openai";

// Request validation schema
const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  model: z.enum(["gpt-4", "gpt-3.5-turbo"]),
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

    // Prepare messages for OpenAI API
    const chatMessages: ChatMessage[] = conversationMessages.map((msg) => ({
      role: msg.role as "system" | "user" | "assistant",
      content: msg.content,
    }));

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Create OpenAI streaming completion
          const openaiStream = await createStreamingChatCompletion(
            chatMessages,
            model as OpenAIModelId,
            { userId: clerkUserId }
          );

          let assistantContent = "";
          let tokenCount = 0;

          // Process streaming chunks
          for await (const chunk of openaiStream) {
            const delta = chunk.choices[0]?.delta;

            if (delta?.content) {
              assistantContent += delta.content;
              tokenCount += estimateTokens(delta.content);

              // Send chunk to client
              const responseChunk = {
                type: "content",
                content: delta.content,
                finished: false,
              };

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(responseChunk)}\n\n`)
              );
            }

            // Check if stream is finished
            if (chunk.choices[0]?.finish_reason) {
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
              tokenCount,
              metadata: {
                streamingComplete: true,
                regenerated: false,
                processingTime: Date.now() / 1000, // Simple timestamp
              },
            })
            .returning();

          // Update conversation metadata safely
          const currentMetadata = conversation.metadata || {
            totalMessages: 0,
            lastModel: "gpt-4",
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
            tokenCount,
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(completionChunk)}\n\n`)
          );

          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);

          const errorChunk = {
            type: "error",
            error: handleOpenAIError(error),
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
