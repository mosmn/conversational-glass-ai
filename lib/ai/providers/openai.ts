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
import { BYOKManager } from "./byok-manager";
import {
  TEXT_ONLY_FILE_SUPPORT,
  VISION_FILE_SUPPORT,
} from "../file-capabilities";

// OpenAI client cache for different API keys
const clientCache = new Map<string, OpenAI>();

async function getOpenAIClient(userId?: string): Promise<OpenAI> {
  try {
    // Get API key using BYOK manager (with graceful fallback to environment)
    const keyConfig = await BYOKManager.getApiKeyWithFallback(
      "openai",
      "OPENAI_API_KEY",
      userId
    );

    if (!keyConfig) {
      throw new AIProviderError(
        "OpenAI API key not found. Please add your OpenAI API key in Settings > API Keys or configure OPENAI_API_KEY environment variable.",
        "openai"
      );
    }

    // Create cache key (using last 8 chars of API key + user indicator)
    const keyHash = keyConfig.apiKey.slice(-8);
    const userIndicator = keyConfig.isUserKey ? `user:${userId}` : "env";
    const cacheKey = `openai:${keyHash}:${userIndicator}`;

    // Use cached client if available
    const cachedClient = clientCache.get(cacheKey);
    if (cachedClient) {
      return cachedClient;
    }

    // Create new client
    const client = new OpenAI({
      apiKey: keyConfig.apiKey,
      organization: process.env.OPENAI_ORG_ID,
      project: process.env.OPENAI_PROJECT_ID,
    });

    // Cache the client
    clientCache.set(cacheKey, client);

    // Clean up old clients to prevent memory leaks
    if (clientCache.size > 10) {
      const firstKey = clientCache.keys().next().value;
      if (firstKey) {
        clientCache.delete(firstKey);
      }
    }

    return client;
  } catch (error) {
    throw new AIProviderError(
      "Failed to initialize OpenAI client. Please check your API key configuration.",
      "openai",
      undefined,
      error
    );
  }
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
      fileSupport: TEXT_ONLY_FILE_SUPPORT,
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
      fileSupport: TEXT_ONLY_FILE_SUPPORT,
    },
    pricing: {
      inputCostPer1kTokens: 0.0015,
      outputCostPer1kTokens: 0.002,
    },
  },
};

// We should also add GPT-4 Vision model
export const GPT_4_VISION_MODEL: AIModel = {
  id: "gpt-4-vision-preview",
  name: "GPT-4 Vision",
  provider: "openai",
  maxTokens: 128000,
  maxResponseTokens: 4096,
  contextWindow: 128000,
  personality: "analytical-visual",
  description: "GPT-4 with vision capabilities for image analysis",
  visualConfig: {
    color: "from-purple-500 to-blue-500",
    avatar: "👁️",
    style: "geometric",
  },
  capabilities: {
    streaming: true,
    functionCalling: true,
    multiModal: true,
    fileSupport: {
      ...VISION_FILE_SUPPORT,
      // Override with OpenAI-specific constraints
      images: {
        ...VISION_FILE_SUPPORT.images,
        maxFileSize: 20, // 20MB max for OpenAI
        requiresUrl: true, // OpenAI Vision requires image URLs or base64
        maxImagesPerMessage: 5, // OpenAI typical limit
      },
    },
  },
  pricing: {
    inputCostPer1kTokens: 0.01,
    outputCostPer1kTokens: 0.03,
  },
};

// Add the vision model to the models record
const EXTENDED_OPENAI_MODELS = {
  ...OPENAI_MODELS,
  "gpt-4-vision-preview": GPT_4_VISION_MODEL,
};

// OpenAI Provider Implementation
export class OpenAIProvider implements AIProvider {
  name = "openai";
  displayName = "OpenAI";
  models = EXTENDED_OPENAI_MODELS;

  get isConfigured(): boolean {
    // Always return true to allow BYOK - actual key checking happens at runtime
    // This allows users to add their own keys even if no environment key is set
    return true;
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

    // Convert multimodal messages to OpenAI format
    const openaiMessages = await this.formatMessagesForOpenAI(messages, model);

    // Validate token limits
    const tokenValidation = validateTokenLimits(
      openaiMessages,
      model,
      options.maxTokens
    );

    if (!tokenValidation.valid) {
      throw new TokenLimitExceededError(
        calculateConversationTokens(openaiMessages),
        model.contextWindow,
        this.name
      );
    }

    try {
      const client = await getOpenAIClient(options.userId);

      const stream = await client.chat.completions.create({
        model: model.id,
        messages: openaiMessages,
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
          return "Invalid OpenAI API key. Please check your API key in Settings > API Keys or verify your OPENAI_API_KEY environment variable.";
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

  // Format messages for OpenAI API with multimodal support
  private async formatMessagesForOpenAI(
    messages: ChatMessage[],
    model: AIModel
  ): Promise<any[]> {
    const openaiMessages: any[] = [];

    for (const message of messages) {
      if (typeof message.content === "string") {
        // Simple text message
        openaiMessages.push({
          role: message.role,
          content: message.content,
        });
      } else if (Array.isArray(message.content)) {
        // Multimodal message
        const content: any[] = [];

        for (const contentItem of message.content) {
          if (contentItem.type === "text") {
            content.push({
              type: "text",
              text: contentItem.text,
            });
          } else if (
            contentItem.type === "image_url" &&
            model.capabilities.multiModal
          ) {
            content.push({
              type: "image_url",
              image_url: contentItem.image_url,
            });
          }
          // Skip other content types that OpenAI doesn't support
        }

        openaiMessages.push({
          role: message.role,
          content:
            content.length === 1 && content[0].type === "text"
              ? content[0].text
              : content,
        });
      }
    }

    // Apply system prompt handling
    return prepareMessagesWithSystemPrompt(openaiMessages, model);
  }

  // Test connection to OpenAI
  async testConnection(userId?: string): Promise<boolean> {
    try {
      const client = await getOpenAIClient(userId);
      await client.models.list();
      return true;
    } catch (error) {
      console.error("OpenAI connection test failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const openaiProvider = new OpenAIProvider();
