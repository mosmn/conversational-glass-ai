// Query Optimization API Route
// POST /api/search/optimize-query - Generate optimized search query using AI

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import Groq from "groq-sdk";

// Schema for query optimization requests
const queryOptimizationSchema = z.object({
  userQuery: z.string().min(1).max(500),
  conversationContext: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
        timestamp: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  searchType: z
    .enum(["general", "news", "academic", "shopping"])
    .optional()
    .default("general"),
});

// Initialize Groq client
function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is required");
  }
  return new Groq({ apiKey });
}

async function optimizeSearchQuery(
  userQuery: string,
  conversationContext: Array<{
    role: string;
    content: string;
    timestamp?: string;
  }> = [],
  searchType: string = "general"
): Promise<{ optimizedQuery: string; reasoning: string }> {
  try {
    const contextString = conversationContext
      .slice(-6) // Last 6 messages for context
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    const systemPrompt = `You are a search query optimization expert. Your job is to create the most effective web search query based on the user's question and conversation context.

CRITICAL CONTEXT ANALYSIS:
- Always analyze the conversation context carefully to understand what the user is really asking about
- Pay special attention to pronouns (them, it, this, that, these, those) and replace them with specific nouns from context
- Look for subjects, topics, or entities mentioned in recent messages that the user might be referring to
- If the user says "look for them", "find them", "search for them", determine what "them" refers to from the conversation

Guidelines:
- Create a concise, specific search query that will return the most relevant results
- Remove conversational fluff and focus on key searchable terms
- Add relevant keywords and modifiers that might help find better results
- For ${searchType} searches, optimize for that specific type of content
- Keep the query under 100 characters for best search engine performance
- If the query is vague or uses pronouns, use context to make it specific

Examples of context-aware optimization:
- User asks "what are top AI startups" → Assistant responds → User says "look for them" → Optimize to "top AI startups 2025"
- User mentions Tesla → User says "find more about it" → Optimize to "Tesla latest news information"
- User discusses climate change → User says "search for solutions" → Optimize to "climate change solutions"

Respond with JSON in this exact format:
{
  "optimizedQuery": "your optimized search query here",
  "reasoning": "brief explanation of why you chose this query and what context clues you used"
}`;

    const userPrompt = `Original user query: "${userQuery}"

Recent conversation context (analyze for key topics, subjects, and what pronouns might refer to):
${contextString}

TASK: Optimize this search query for a ${searchType} web search. If the query uses pronouns or is vague, use the conversation context to make it specific and searchable.`;

    const groq = getGroqClient();
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // Fast and efficient for query optimization
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5, // Slightly higher for better context understanding
      max_tokens: 250,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content);
    return {
      optimizedQuery: parsed.optimizedQuery || userQuery,
      reasoning: parsed.reasoning || "Used original query",
    };
  } catch (error) {
    console.warn("Query optimization failed:", error);
    return {
      optimizedQuery: userQuery,
      reasoning: "Failed to optimize query, using original",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userQuery, conversationContext, searchType } =
      queryOptimizationSchema.parse(body);

    const optimization = await optimizeSearchQuery(
      userQuery,
      conversationContext,
      searchType
    );

    return NextResponse.json({
      success: true,
      data: optimization,
    });
  } catch (error) {
    console.error("Query optimization API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
