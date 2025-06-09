import {
  AIProvider,
  AIModel,
  ChatMessage,
  StreamingChunk,
  StreamingOptions,
  AIProviderError,
} from "../types";
import { z } from "zod";
import { BYOKManager } from "./byok-manager";

// Environment validation
const openrouterEnvSchema = z.object({
  OPENROUTER_API_KEY: z.string().optional(),
});

type OpenrouterEnv = z.infer<typeof openrouterEnvSchema>;

// Validate environment
let env: OpenrouterEnv | null = null;
try {
  env = openrouterEnvSchema.parse({
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  });
} catch (error) {
  console.warn("OpenRouter provider not configured:", error);
}

// OpenRouter-specific configuration
const OPENROUTER_CONFIG = {
  baseUrl: "https://openrouter.ai/api/v1",
  defaultMaxTokens: 4096,
  defaultTemperature: 0.7,
  appName: "Conversational Glass AI",
  appUrl: "https://conversational-glass-ai.vercel.app",
};

// OpenRouter model definitions with personality and visual styling
// This is a curated list of the most popular and reliable models
const openrouterModels: Record<string, AIModel> = {
  // OpenAI Models via OpenRouter
  "openai/gpt-4o": {
    id: "openai/gpt-4o",
    name: "GPT-4 Omni",
    provider: "openrouter",
    maxTokens: 128000,
    maxResponseTokens: 4096,
    contextWindow: 128000,
    personality: "advanced-multimodal",
    description: "Most advanced GPT model with vision and audio capabilities",
    visualConfig: {
      color: "from-blue-500 to-purple-600",
      avatar: "🚀",
      style: "geometric" as const,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      multiModal: true,
    },
    pricing: {
      inputCostPer1kTokens: 0.005,
      outputCostPer1kTokens: 0.015,
    },
  },
  "openai/gpt-4-turbo": {
    id: "openai/gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openrouter",
    maxTokens: 128000,
    maxResponseTokens: 4096,
    contextWindow: 128000,
    personality: "analytical-powerhouse",
    description: "Latest GPT-4 with improved reasoning and knowledge",
    visualConfig: {
      color: "from-blue-400 to-cyan-500",
      avatar: "🧠",
      style: "geometric" as const,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      multiModal: false,
    },
    pricing: {
      inputCostPer1kTokens: 0.01,
      outputCostPer1kTokens: 0.03,
    },
  },
  "openai/gpt-3.5-turbo": {
    id: "openai/gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openrouter",
    maxTokens: 16385,
    maxResponseTokens: 4096,
    contextWindow: 16385,
    personality: "balanced-efficient",
    description: "Fast and reliable for most tasks",
    visualConfig: {
      color: "from-green-400 to-blue-500",
      avatar: "💚",
      style: "flowing" as const,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      multiModal: false,
    },
    pricing: {
      inputCostPer1kTokens: 0.0015,
      outputCostPer1kTokens: 0.002,
    },
  },

  // Anthropic Models via OpenRouter
  "anthropic/claude-3.5-sonnet": {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "openrouter",
    maxTokens: 200000,
    maxResponseTokens: 8192,
    contextWindow: 200000,
    personality: "thoughtful-creative",
    description: "Anthropic's most capable model for complex reasoning",
    visualConfig: {
      color: "from-orange-400 to-red-500",
      avatar: "🎭",
      style: "flowing" as const,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      multiModal: true,
    },
    pricing: {
      inputCostPer1kTokens: 0.003,
      outputCostPer1kTokens: 0.015,
    },
  },
  "anthropic/claude-3-haiku": {
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku",
    provider: "openrouter",
    maxTokens: 200000,
    maxResponseTokens: 4096,
    contextWindow: 200000,
    personality: "fast-efficient",
    description: "Fastest Claude model for quick tasks",
    visualConfig: {
      color: "from-pink-400 to-rose-500",
      avatar: "🌸",
      style: "sharp" as const,
    },
    capabilities: {
      streaming: true,
      functionCalling: false,
      multiModal: true,
    },
    pricing: {
      inputCostPer1kTokens: 0.00025,
      outputCostPer1kTokens: 0.00125,
    },
  },

  // Google Models via OpenRouter
  "google/gemini-pro-1.5": {
    id: "google/gemini-pro-1.5",
    name: "Gemini Pro 1.5",
    provider: "openrouter",
    maxTokens: 2000000,
    maxResponseTokens: 8192,
    contextWindow: 2000000,
    personality: "versatile-multimodal",
    description: "Google's most advanced model with massive context",
    visualConfig: {
      color: "from-blue-400 to-purple-500",
      avatar: "🔮",
      style: "geometric" as const,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      multiModal: true,
    },
    pricing: {
      inputCostPer1kTokens: 0.00125,
      outputCostPer1kTokens: 0.005,
    },
  },
  "google/gemini-flash-1.5": {
    id: "google/gemini-flash-1.5",
    name: "Gemini Flash 1.5",
    provider: "openrouter",
    maxTokens: 1000000,
    maxResponseTokens: 8192,
    contextWindow: 1000000,
    personality: "lightning-fast",
    description: "Ultra-fast Gemini model with large context",
    visualConfig: {
      color: "from-yellow-400 to-orange-500",
      avatar: "⚡",
      style: "geometric" as const,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      multiModal: true,
    },
    pricing: {
      inputCostPer1kTokens: 0.000075,
      outputCostPer1kTokens: 0.0003,
    },
  },

  // Meta Models via OpenRouter
  "meta-llama/llama-3.2-90b-instruct": {
    id: "meta-llama/llama-3.2-90b-instruct",
    name: "Llama 3.2 90B",
    provider: "openrouter",
    maxTokens: 131072,
    maxResponseTokens: 8192,
    contextWindow: 131072,
    personality: "open-source-powerhouse",
    description: "Meta's latest and most capable open-source model",
    visualConfig: {
      color: "from-purple-400 to-pink-500",
      avatar: "🦙",
      style: "flowing" as const,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      multiModal: false,
    },
    pricing: {
      inputCostPer1kTokens: 0.0008,
      outputCostPer1kTokens: 0.0008,
    },
  },
  "meta-llama/llama-3.2-11b-vision-instruct": {
    id: "meta-llama/llama-3.2-11b-vision-instruct",
    name: "Llama 3.2 11B Vision",
    provider: "openrouter",
    maxTokens: 131072,
    maxResponseTokens: 8192,
    contextWindow: 131072,
    personality: "vision-specialist",
    description: "Llama model with vision capabilities",
    visualConfig: {
      color: "from-indigo-400 to-purple-500",
      avatar: "👁️",
      style: "flowing" as const,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      multiModal: true,
    },
    pricing: {
      inputCostPer1kTokens: 0.0002,
      outputCostPer1kTokens: 0.0002,
    },
  },

  // Specialized Models
  "qwen/qwen-2.5-72b-instruct": {
    id: "qwen/qwen-2.5-72b-instruct",
    name: "Qwen 2.5 72B",
    provider: "openrouter",
    maxTokens: 32768,
    maxResponseTokens: 8192,
    contextWindow: 32768,
    personality: "multilingual-expert",
    description: "Alibaba's advanced multilingual model",
    visualConfig: {
      color: "from-red-400 to-orange-500",
      avatar: "🌏",
      style: "geometric" as const,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      multiModal: false,
    },
    pricing: {
      inputCostPer1kTokens: 0.0008,
      outputCostPer1kTokens: 0.0008,
    },
  },
  "mistralai/mistral-large": {
    id: "mistralai/mistral-large",
    name: "Mistral Large",
    provider: "openrouter",
    maxTokens: 128000,
    maxResponseTokens: 8192,
    contextWindow: 128000,
    personality: "european-excellence",
    description: "Mistral's flagship model from Europe",
    visualConfig: {
      color: "from-violet-400 to-purple-500",
      avatar: "🇪🇺",
      style: "sharp" as const,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      multiModal: false,
    },
    pricing: {
      inputCostPer1kTokens: 0.003,
      outputCostPer1kTokens: 0.009,
    },
  },
};

// Token estimation (simple word-based estimation)
function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 0.75 words
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words * 1.33);
}

// Calculate total tokens for conversation
function calculateConversationTokens(messages: ChatMessage[]): number {
  return messages.reduce((total, message) => {
    return total + estimateTokens(message.content);
  }, 0);
}

// Format messages for OpenRouter API (OpenAI compatible)
function formatMessagesForOpenRouter(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

// Create streaming completion
async function* createOpenRouterStreamingCompletion(
  messages: ChatMessage[],
  modelId: string,
  options: StreamingOptions = {},
  customApiKey?: string
): AsyncIterable<StreamingChunk> {
  const apiKey = customApiKey || env?.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new AIProviderError(
      "OpenRouter API key not found. Please add your OpenRouter API key in Settings.",
      "openrouter"
    );
  }

  const model = openrouterModels[modelId];
  if (!model) {
    throw new AIProviderError(
      `Model ${modelId} not found in OpenRouter provider`,
      "openrouter"
    );
  }

  const openrouterMessages = formatMessagesForOpenRouter(messages);

  const requestBody = {
    model: modelId,
    messages: openrouterMessages,
    max_tokens: Math.min(
      options.maxTokens || OPENROUTER_CONFIG.defaultMaxTokens,
      model.maxResponseTokens || 4096
    ),
    temperature: options.temperature || OPENROUTER_CONFIG.defaultTemperature,
    stream: true,
    // OpenRouter specific headers for attribution
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  };

  try {
    const response = await fetch(
      `${OPENROUTER_CONFIG.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": OPENROUTER_CONFIG.appUrl,
          "X-Title": OPENROUTER_CONFIG.appName,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AIProviderError(
        `OpenRouter API error: ${response.status} - ${
          errorData.error?.message || response.statusText
        }`,
        "openrouter",
        response.status
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new AIProviderError(
        "No response body reader available",
        "openrouter"
      );
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;

          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6));

              if (data.choices?.[0]?.delta?.content) {
                yield {
                  content: data.choices[0].delta.content,
                  tokenCount: estimateTokens(data.choices[0].delta.content),
                  finished: false,
                };
              }

              if (data.choices?.[0]?.finish_reason) {
                yield {
                  finished: true,
                };
                return;
              }
            } catch (parseError) {
              console.warn("Failed to parse OpenRouter SSE data:", parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    if (error instanceof AIProviderError) {
      throw error;
    }

    throw new AIProviderError(
      `OpenRouter streaming error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      "openrouter"
    );
  }
}

// Error handling
function handleOpenRouterError(error: unknown): string {
  if (error instanceof AIProviderError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Parse common OpenRouter API errors
    if (error.message.includes("rate_limit") || error.message.includes("429")) {
      return "OpenRouter rate limit exceeded. Please try again later.";
    }
    if (
      error.message.includes("invalid_api_key") ||
      error.message.includes("401")
    ) {
      return "Invalid OpenRouter API key. Please check your API key in Settings.";
    }
    if (
      error.message.includes("insufficient_quota") ||
      error.message.includes("402")
    ) {
      return "Insufficient OpenRouter credits. Please add credits to your account.";
    }
    if (
      error.message.includes("model_not_found") ||
      error.message.includes("404")
    ) {
      return "Model not available on OpenRouter. Please try a different model.";
    }

    return `OpenRouter API error: ${error.message}`;
  }

  return "Unknown OpenRouter API error occurred";
}

// Test connection with custom API key
async function testOpenRouterConnection(apiKey?: string): Promise<{
  success: boolean;
  error?: string;
  models?: string[];
}> {
  const testKey = apiKey || env?.OPENROUTER_API_KEY;

  if (!testKey) {
    return { success: false, error: "No API key provided" };
  }

  try {
    // Test with a simple completion request
    const response = await fetch(
      `${OPENROUTER_CONFIG.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${testKey}`,
          "HTTP-Referer": OPENROUTER_CONFIG.appUrl,
          "X-Title": OPENROUTER_CONFIG.appName,
        },
        body: JSON.stringify({
          model: "openai/gpt-3.5-turbo",
          messages: [{ role: "user", content: "test" }],
          max_tokens: 1,
        }),
      }
    );

    if (response.ok || response.status === 400) {
      // 400 is fine for validation (model exists but request is invalid)
      return { success: true };
    } else if (response.status === 401) {
      return { success: false, error: "Invalid API key" };
    } else if (response.status === 402) {
      return { success: false, error: "Insufficient credits" };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || `HTTP ${response.status}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

// Get available models (for dynamic discovery)
async function getAvailableModels(apiKey?: string): Promise<string[]> {
  const testKey = apiKey || env?.OPENROUTER_API_KEY;

  if (!testKey) {
    return Object.keys(openrouterModels);
  }

  try {
    const response = await fetch(`${OPENROUTER_CONFIG.baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${testKey}`,
        "HTTP-Referer": OPENROUTER_CONFIG.appUrl,
        "X-Title": OPENROUTER_CONFIG.appName,
      },
    });

    if (response.ok) {
      const data = await response.json();
      return (
        data.data?.map((model: any) => model.id) ||
        Object.keys(openrouterModels)
      );
    }
  } catch (error) {
    console.warn("Failed to fetch OpenRouter models:", error);
  }

  // Fallback to static list
  return Object.keys(openrouterModels);
}

// OpenRouter provider implementation with BYOK support
export const openrouterProvider: AIProvider = {
  name: "openrouter",
  displayName: "OpenRouter",
  models: openrouterModels,
  isConfigured: true, // Always configured with BYOK support
  createStreamingCompletion: async function* (
    messages: ChatMessage[],
    modelId: string,
    options: StreamingOptions = {}
  ): AsyncIterable<StreamingChunk> {
    // Get user's API key through BYOK manager
    const byokConfig = await BYOKManager.getUserApiKey(
      "openrouter",
      options.userId
    );
    const userApiKey = byokConfig?.apiKey;

    yield* createOpenRouterStreamingCompletion(
      messages,
      modelId,
      options,
      userApiKey
    );
  },
  handleError: handleOpenRouterError,
  estimateTokens,
  calculateConversationTokens,
  testConnection: async (userApiKey?: string) => {
    const result = await testOpenRouterConnection(userApiKey);
    return result.success;
  },
};

// Extended provider with BYOK support
export interface OpenRouterProviderWithBYOK extends AIProvider {
  createStreamingCompletionWithKey: (
    messages: ChatMessage[],
    modelId: string,
    apiKey: string,
    options?: StreamingOptions
  ) => AsyncIterable<StreamingChunk>;
  testConnectionWithKey: (apiKey: string) => Promise<{
    success: boolean;
    error?: string;
    models?: string[];
  }>;
  getAvailableModels: (apiKey?: string) => Promise<string[]>;
}

export const openrouterProviderWithBYOK: OpenRouterProviderWithBYOK = {
  ...openrouterProvider,
  createStreamingCompletionWithKey: (messages, modelId, apiKey, options) =>
    createOpenRouterStreamingCompletion(messages, modelId, options, apiKey),
  testConnectionWithKey: testOpenRouterConnection,
  getAvailableModels,
};
