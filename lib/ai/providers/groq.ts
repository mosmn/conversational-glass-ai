import Groq from "groq-sdk";
import { z } from "zod";
import {
  AIProvider,
  AIModel,
  ChatMessage,
  StreamingChunk,
  StreamingOptions,
  GroqModelId,
  AIProviderError,
  TokenLimitExceededError,
} from "../types";
import {
  requireEnvVar,
  getOptionalEnvVar,
  estimateTokens,
  calculateConversationTokens,
  validateTokenLimits,
  prepareMessagesWithSystemPrompt,
  createErrorResponse,
} from "../utils";

// Environment validation
const envSchema = z.object({
  GROQ_API_KEY: z.string().min(1, "Groq API key is required"),
});

// Groq client initialization
let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    try {
      const env = envSchema.parse({
        GROQ_API_KEY: process.env.GROQ_API_KEY,
      });

      groqClient = new Groq({
        apiKey: env.GROQ_API_KEY,
      });
    } catch (error) {
      throw new AIProviderError(
        "Failed to initialize Groq client. Please check your API key configuration.",
        "groq",
        undefined,
        error
      );
    }
  }
  return groqClient;
}

// Groq models configuration with unique personalities and visual identities
export const GROQ_MODELS: Record<GroqModelId, AIModel> = {
  "llama-3.3-70b-versatile": {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B Versatile",
    provider: "groq",
    maxTokens: 131072, // 128K context
    maxResponseTokens: 8192,
    contextWindow: 131072,
    personality: "versatile-powerhouse",
    description:
      "🦙 Versatile Powerhouse - Deep reasoning meets practical wisdom",
    visualConfig: {
      color: "from-orange-500 to-red-500",
      avatar: "🦙",
      style: "organic",
    },
    capabilities: {
      streaming: true,
      functionCalling: false,
      multiModal: false,
    },
    pricing: {
      inputCostPer1kTokens: 0.00059,
      outputCostPer1kTokens: 0.00079,
    },
  },
  "llama-3.1-8b-instant": {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant",
    provider: "groq",
    maxTokens: 131072, // 128K context
    maxResponseTokens: 8192,
    contextWindow: 131072,
    personality: "lightning-fast",
    description: "⚡ Lightning Fast - Optimized for speed and efficiency",
    visualConfig: {
      color: "from-yellow-400 to-orange-500",
      avatar: "⚡",
      style: "sharp",
    },
    capabilities: {
      streaming: true,
      functionCalling: false,
      multiModal: false,
    },
    pricing: {
      inputCostPer1kTokens: 0.00005,
      outputCostPer1kTokens: 0.00008,
    },
  },
  "gemma2-9b-it": {
    id: "gemma2-9b-it",
    name: "Gemma 2 9B IT",
    provider: "groq",
    maxTokens: 8192,
    maxResponseTokens: 8192,
    contextWindow: 8192,
    personality: "efficient-genius",
    description:
      "💎 Efficient Genius - Smart, compact responses with maximum insight",
    visualConfig: {
      color: "from-emerald-400 to-teal-500",
      avatar: "💎",
      style: "geometric",
    },
    capabilities: {
      streaming: true,
      functionCalling: false,
      multiModal: false,
    },
    pricing: {
      inputCostPer1kTokens: 0.00002,
      outputCostPer1kTokens: 0.00002,
    },
  },
};

// Groq Provider Implementation
export class GroqProvider implements AIProvider {
  name = "groq";
  displayName = "Groq";
  models = GROQ_MODELS;

  get isConfigured(): boolean {
    try {
      return !!process.env.GROQ_API_KEY;
    } catch {
      return false;
    }
  }

  estimateTokens = estimateTokens;
  calculateConversationTokens = calculateConversationTokens;

  async *createStreamingCompletion(
    messages: ChatMessage[],
    modelId: string,
    options: StreamingOptions = {}
  ): AsyncIterable<StreamingChunk> {
    const model = this.models[modelId as GroqModelId];
    if (!model) {
      throw new AIProviderError(`Model '${modelId}' not found`, this.name);
    }

    // Prepare messages with system prompt
    const preparedMessages = prepareMessagesWithSystemPrompt(messages, model);

    // Validate token limits
    const tokenValidation = validateTokenLimits(
      preparedMessages,
      model,
      options.maxTokens
    );

    if (!tokenValidation.valid) {
      throw new TokenLimitExceededError(
        calculateConversationTokens(preparedMessages),
        model.contextWindow,
        this.name
      );
    }

    try {
      const client = getGroqClient();

      const stream = await client.chat.completions.create({
        model: model.id,
        messages: preparedMessages,
        stream: true,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? model.maxResponseTokens,
        user: options.userId,
      });

      let totalTokens = 0;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          const tokenCount = estimateTokens(delta.content);
          totalTokens += tokenCount;

          yield {
            content: delta.content,
            finished: false,
            tokenCount,
          };
        }

        // Check if stream is finished
        if (chunk.choices[0]?.finish_reason) {
          yield {
            finished: true,
            tokenCount: totalTokens,
          };
          break;
        }
      }
    } catch (error) {
      console.error("Groq streaming error:", error);

      const errorMessage = this.handleError(error);
      yield {
        error: errorMessage,
        finished: true,
      };
    }
  }

  handleError(error: unknown): string {
    // Handle Groq-specific errors
    if (error && typeof error === "object" && "status" in error) {
      const groqError = error as { status?: number; message?: string };

      switch (groqError.status) {
        case 401:
          return "Invalid Groq API key. Please check your configuration.";
        case 429:
          return "Groq rate limit exceeded. Please wait a moment and try again.";
        case 500:
          return "Groq service temporarily unavailable. Please try again later.";
        case 503:
          return "Groq service is currently overloaded. Please try again later.";
        default:
          return `Groq API error: ${groqError.message || "Unknown error"}`;
      }
    }

    if (error instanceof TokenLimitExceededError) {
      return error.message;
    }

    return createErrorResponse(
      error,
      this.name,
      "An unexpected error occurred with Groq"
    );
  }

  // Helper method to get model by ID
  getModel(modelId: string): AIModel | undefined {
    return this.models[modelId as GroqModelId];
  }

  // Helper method to list available models
  listModels(): AIModel[] {
    return Object.values(this.models);
  }

  // Test connection to Groq
  async testConnection(): Promise<boolean> {
    try {
      const client = getGroqClient();
      // Groq doesn't have a direct models endpoint, so we'll test with a simple completion
      await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 1,
        stream: false,
      });
      return true;
    } catch {
      return false;
    }
  }

  // Get performance characteristics for UI display
  getModelPerformance(modelId: string) {
    const model = this.getModel(modelId);
    if (!model) return null;

    // Groq is known for extremely fast inference
    const baseSpeedMultiplier = {
      "llama-3.1-8b": 10, // Extremely fast
      "gemma2-9b": 8, // Very fast
      "llama-3.3-70b": 5, // Fast for its size
    };

    const speedKey = modelId
      .replace("-instant", "")
      .replace("-versatile", "") as keyof typeof baseSpeedMultiplier;
    const speedMultiplier = baseSpeedMultiplier[speedKey] || 5;

    return {
      inferenceSpeed: "ultra-fast",
      tokensPerSecond: speedMultiplier * 100, // Estimated tokens per second
      costEfficiency: "excellent",
      specialties: this.getModelSpecialties(modelId),
    };
  }

  // Get model specialties for UI hints
  private getModelSpecialties(modelId: string): string[] {
    const specialties: Record<string, string[]> = {
      "llama-3.3-70b": [
        "Complex reasoning",
        "Long-form content",
        "Multi-step problems",
        "Creative writing",
        "Code generation",
      ],
      "llama-3.1-8b": [
        "Quick responses",
        "Simple queries",
        "Code snippets",
        "Summaries",
        "Q&A",
      ],
      "gemma2-9b": [
        "Efficient responses",
        "Technical explanations",
        "Balanced reasoning",
        "Concise answers",
        "Educational content",
      ],
    };

    return specialties[modelId] || ["General assistance"];
  }
}

// Export singleton instance
export const groqProvider = new GroqProvider();
