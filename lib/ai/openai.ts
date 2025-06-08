import OpenAI from "openai";
import { z } from "zod";

// Environment validation
const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "OpenAI API key is required"),
  OPENAI_ORG_ID: z.string().optional(),
  OPENAI_PROJECT_ID: z.string().optional(),
});

const env = envSchema.parse({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_ORG_ID: process.env.OPENAI_ORG_ID,
  OPENAI_PROJECT_ID: process.env.OPENAI_PROJECT_ID,
});

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  organization: env.OPENAI_ORG_ID,
  project: env.OPENAI_PROJECT_ID,
});

// Supported OpenAI models with their configurations
export const OPENAI_MODELS = {
  "gpt-4": {
    id: "gpt-4-turbo-preview",
    name: "GPT-4 Turbo",
    maxTokens: 128000,
    maxResponseTokens: 4096,
    costPer1kTokens: { input: 0.01, output: 0.03 },
    personality: "analytical",
  },
  "gpt-3.5-turbo": {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    maxTokens: 16385,
    maxResponseTokens: 4096,
    costPer1kTokens: { input: 0.0015, output: 0.002 },
    personality: "balanced",
  },
} as const;

export type OpenAIModelId = keyof typeof OPENAI_MODELS;

// Message type for OpenAI API
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Response type for streaming
export interface StreamingResponse {
  success: boolean;
  content?: string;
  error?: string;
  tokenCount?: number;
  model?: string;
  finished?: boolean;
}

// System prompts for different AI personalities
export const SYSTEM_PROMPTS = {
  "gpt-4": `You are GPT-4, an analytical genius AI assistant with a logical, precise, and methodical thinking approach. You excel at technical discussions, problem-solving, and providing thorough, well-structured responses. Your personality is focused and geometric in nature.`,
  "gpt-3.5-turbo": `You are GPT-3.5 Turbo, a balanced and efficient AI assistant. You provide helpful, clear, and concise responses while maintaining a friendly and approachable tone. You're versatile and adaptable to various conversation topics.`,
};

// Token counting utility (approximate)
export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

// Calculate total tokens for a conversation
export function calculateConversationTokens(messages: ChatMessage[]): number {
  return messages.reduce((total, message) => {
    return (
      total + estimateTokens(message.content) + estimateTokens(message.role)
    );
  }, 0);
}

// Prepare messages for OpenAI API with system prompt
export function prepareMessages(
  conversationMessages: ChatMessage[],
  modelId: OpenAIModelId
): ChatMessage[] {
  const systemPrompt = SYSTEM_PROMPTS[modelId];
  const systemMessage: ChatMessage = {
    role: "system",
    content: systemPrompt,
  };

  return [systemMessage, ...conversationMessages];
}

// Create streaming chat completion
export async function createStreamingChatCompletion(
  messages: ChatMessage[],
  modelId: OpenAIModelId,
  options: {
    temperature?: number;
    maxTokens?: number;
    userId?: string;
  } = {}
) {
  const model = OPENAI_MODELS[modelId];
  const preparedMessages = prepareMessages(messages, modelId);

  // Validate token count
  const totalTokens = calculateConversationTokens(preparedMessages);
  if (totalTokens > model.maxTokens * 0.8) {
    throw new Error(
      `Conversation too long. Token count: ${totalTokens}, Max: ${model.maxTokens}`
    );
  }

  try {
    const stream = await openai.chat.completions.create({
      model: model.id,
      messages: preparedMessages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? model.maxResponseTokens,
      user: options.userId,
    });

    return stream;
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error(
      error instanceof Error
        ? `OpenAI API Error: ${error.message}`
        : "Unknown OpenAI API error"
    );
  }
}

// Error handling utility
export function handleOpenAIError(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    switch (error.status) {
      case 401:
        return "Invalid API key. Please check your OpenAI configuration.";
      case 429:
        return "Rate limit exceeded. Please wait a moment and try again.";
      case 500:
        return "OpenAI service temporarily unavailable. Please try again later.";
      default:
        return `OpenAI API error: ${error.message}`;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred while communicating with OpenAI.";
}
