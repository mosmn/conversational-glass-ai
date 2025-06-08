import OpenAI from "openai";
import { z } from "zod";
import {
  AIProvider,
  AIModel,
  ChatMessage,
  StreamingChunk,
  StreamingOptions,
  OpenAIModelId,
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
  OPENAI_API_KEY: z.string().min(1, "OpenAI API key is required"),
  OPENAI_ORG_ID: z.string().optional(),
  OPENAI_PROJECT_ID: z.string().optional(),
});

// OpenAI client initialization
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    try {
      const env = envSchema.parse({
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENAI_ORG_ID: process.env.OPENAI_ORG_ID,
        OPENAI_PROJECT_ID: process.env.OPENAI_PROJECT_ID,
      });

      openaiClient = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
        organization: env.OPENAI_ORG_ID,
        project: env.OPENAI_PROJECT_ID,
      });
    } catch (error) {
      throw new AIProviderError(
        "Failed to initialize OpenAI client. Please check your API key configuration.",
        "openai",
        undefined,
        error
      );
    }
  }
  return openaiClient;
}

// OpenAI models configuration
export const OPENAI_MODELS: Record<OpenAIModelId, AIModel> = {
  "gpt-4": {
    id: "gpt-4-turbo-preview",
    name: "GPT-4 Turbo",
    provider: "openai",
    maxTokens: 128000,
    maxResponseTokens: 4096,
    contextWindow: 128000,
    personality: "analytical",
    description: "Logical, precise, methodical thinking",
    visualConfig: {
      color: "from-blue-500 to-cyan-500",
      avatar: "🧠",
      style: "geometric",
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
  "gpt-3.5-turbo": {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    maxTokens: 16385,
    maxResponseTokens: 4096,
    contextWindow: 16385,
    personality: "balanced",
    description: "Balanced, efficient, and versatile",
    visualConfig: {
      color: "from-emerald-500 to-teal-500",
      avatar: "💚",
      style: "flowing",
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
};

// OpenAI Provider Implementation
export class OpenAIProvider implements AIProvider {
  name = "openai";
  displayName = "OpenAI";
  models = OPENAI_MODELS;

  get isConfigured(): boolean {
    try {
      return !!process.env.OPENAI_API_KEY;
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
    const model = this.models[modelId as OpenAIModelId];
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
      const client = getOpenAIClient();

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
      console.error("OpenAI streaming error:", error);

      const errorMessage = this.handleError(error);
      yield {
        error: errorMessage,
        finished: true,
      };
    }
  }

  handleError(error: unknown): string {
    if (error instanceof OpenAI.APIError) {
      switch (error.status) {
        case 401:
          return "Invalid OpenAI API key. Please check your configuration.";
        case 429:
          return "OpenAI rate limit exceeded. Please wait a moment and try again.";
        case 500:
          return "OpenAI service temporarily unavailable. Please try again later.";
        case 503:
          return "OpenAI service is currently overloaded. Please try again later.";
        default:
          return `OpenAI API error: ${error.message}`;
      }
    }

    if (error instanceof TokenLimitExceededError) {
      return error.message;
    }

    return createErrorResponse(
      error,
      this.name,
      "An unexpected error occurred with OpenAI"
    );
  }

  // Helper method to get model by ID
  getModel(modelId: string): AIModel | undefined {
    return this.models[modelId as OpenAIModelId];
  }

  // Helper method to list available models
  listModels(): AIModel[] {
    return Object.values(this.models);
  }

  // Test connection to OpenAI
  async testConnection(): Promise<boolean> {
    try {
      const client = getOpenAIClient();
      await client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const openaiProvider = new OpenAIProvider();
