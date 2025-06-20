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
import { aiLogger, loggers } from "@/lib/utils/logger";
import { BYOKManager } from "./byok-manager";
import {
  TEXT_ONLY_FILE_SUPPORT,
  VISION_FILE_SUPPORT,
} from "../file-capabilities";

// OpenAI API model response interface
interface OpenAIModelResponse {
  object: "list";
  data: Array<{
    id: string;
    object: "model";
    created: number;
    owned_by: string;
    permission?: any[];
    root?: string;
    parent?: string;
  }>;
}

// Cache for dynamic models
let cachedModels: Record<string, AIModel> = {};
let modelsLastFetched: number = 0;
const MODELS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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
  private _models: Record<string, AIModel> = EXTENDED_OPENAI_MODELS;
  private _modelsLoaded = false;

  get models(): Record<string, AIModel> {
    return this._models;
  }

  get isConfigured(): boolean {
    // Always return true to allow BYOK - actual key checking happens at runtime
    // This allows users to add their own keys even if no environment key is set
    return true;
  }

  // Load models dynamically
  async ensureModelsLoaded(userId?: string): Promise<void> {
    if (!this._modelsLoaded || Object.keys(this._models).length === 0) {
      this._models = await fetchOpenAIModels(userId);
      this._modelsLoaded = true;
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

    // Convert multimodal messages to OpenAI format
    const openaiMessages = await this.formatMessagesForOpenAI(
      messages,
      model,
      options
    );

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
      loggers.aiError(
        "openai",
        modelId,
        error instanceof Error ? error : String(error)
      );

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

  // Legacy sync methods - deprecated, use async versions instead
  getModel(modelId: string): AIModel | undefined {
    return this.models[modelId as OpenAIModelId];
  }

  listModels(): AIModel[] {
    return Object.values(this.models);
  }

  // Format messages for OpenAI API with multimodal support
  private async formatMessagesForOpenAI(
    messages: ChatMessage[],
    model: AIModel,
    options: StreamingOptions = {}
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

    // Apply system prompt handling with personalization
    return prepareMessagesWithSystemPrompt(
      openaiMessages,
      model,
      options.personalization
    );
  }

  // Test connection to OpenAI
  async testConnection(userId?: string): Promise<boolean> {
    try {
      const client = await getOpenAIClient(userId);
      await this.ensureModelsLoaded(userId);

      // Get the first available model for testing
      const availableModels = Object.keys(this.models);
      if (availableModels.length === 0) {
        return false;
      }

      // Test with a simple chat completion
      await client.chat.completions.create({
        model: availableModels[0],
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 1,
        stream: false,
      });
      return true;
    } catch (error) {
      loggers.aiError(
        "openai",
        "connection-test",
        error instanceof Error ? error : String(error)
      );
      return false;
    }
  }
}

// Export singleton instance
export const openaiProvider = new OpenAIProvider();

// Fetch models from OpenAI API
async function fetchOpenAIModels(
  userId?: string
): Promise<Record<string, AIModel>> {
  const now = Date.now();

  // Return cached models if they're still fresh
  if (
    cachedModels &&
    Object.keys(cachedModels).length > 0 &&
    now - modelsLastFetched < MODELS_CACHE_DURATION
  ) {
    return cachedModels;
  }

  try {
    const client = await getOpenAIClient(userId);

    // Fetch models from OpenAI API
    const response = await client.models.list();
    const models: Record<string, AIModel> = {};

    for (const modelData of response.data) {
      // Only include chat models (skip embeddings, audio, etc.)
      if (
        (!modelData.id.includes("gpt-") &&
          !modelData.id.includes("o1") &&
          !modelData.id.includes("o3") &&
          !modelData.id.includes("o4")) ||
        modelData.id.includes("embedding") ||
        modelData.id.includes("whisper") ||
        modelData.id.includes("tts") ||
        modelData.id.includes("davinci") ||
        modelData.id.includes("ada") ||
        modelData.id.includes("babbage") ||
        modelData.id.includes("curie")
      ) {
        continue;
      }

      const config = generateOpenAIModelConfig(modelData.id);
      if (!config) continue; // Skip unsupported models

      models[modelData.id] = {
        id: modelData.id,
        name: config.name,
        provider: "openai",
        maxTokens: config.contextWindow,
        maxResponseTokens: config.maxResponseTokens,
        contextWindow: config.contextWindow,
        personality: config.personality,
        description: config.description,
        visualConfig: config.visualConfig,
        capabilities: config.capabilities,
        pricing: config.pricing,
      };
    }

    // Cache the results
    cachedModels = models;
    modelsLastFetched = now;

    console.log(
      `🚀 OpenAI: Fetched ${Object.keys(models).length} models dynamically`
    );
    return models;
  } catch (error) {
    console.error("Failed to fetch OpenAI models:", error);

    // Fall back to static models if available
    if (Object.keys(EXTENDED_OPENAI_MODELS).length > 0) {
      console.log("🔄 OpenAI: Using static models due to fetch error");
      return EXTENDED_OPENAI_MODELS;
    }

    // Return empty object if no fallback and fetch failed
    return {};
  }
}

// Generate model configuration based on model ID
function generateOpenAIModelConfig(modelId: string): AIModel | null {
  // GPT-4 variants (including 4.1, 4.5, etc.)
  if (modelId.includes("gpt-4")) {
    const isVision = modelId.includes("vision");
    const isO1 = modelId.includes("o1");
    const isTurbo = modelId.includes("turbo");
    const isOmni = modelId.includes("omni") || modelId.includes("4o");
    const is41 = modelId.includes("4.1") || modelId.includes("4-1");
    const is45 = modelId.includes("4.5") || modelId.includes("4-5");

    let contextWindow = 128000;
    let maxResponseTokens = 4096;
    let pricing = { inputCostPer1kTokens: 0.01, outputCostPer1kTokens: 0.03 };

    // O1 models have different pricing and limits
    if (isO1) {
      contextWindow = 128000;
      maxResponseTokens = 32768;
      pricing = { inputCostPer1kTokens: 0.015, outputCostPer1kTokens: 0.06 };
    }

    // 4o models are multimodal
    if (isOmni) {
      contextWindow = 128000;
      maxResponseTokens = 4096;
      pricing = { inputCostPer1kTokens: 0.0025, outputCostPer1kTokens: 0.01 };
    }

    // GPT-4.1 models (multimodal by default)
    if (is41) {
      contextWindow = 200000; // GPT-4.1 has larger context
      maxResponseTokens = 16384;
      pricing = { inputCostPer1kTokens: 0.0025, outputCostPer1kTokens: 0.01 };
    }

    // Most modern GPT-4 variants support vision (except o1)
    const supportsVision =
      isVision ||
      isOmni ||
      is41 ||
      is45 ||
      modelId.includes("mini") ||
      modelId.includes("nano");

    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: "openai",
      maxTokens: contextWindow,
      maxResponseTokens,
      contextWindow,
      personality: isO1 ? "reasoning" : "analytical",
      description: isO1
        ? "Advanced reasoning and problem-solving capabilities"
        : supportsVision
        ? "GPT-4 with vision capabilities for image analysis"
        : "Most capable OpenAI model for complex tasks",
      visualConfig: {
        color: isO1
          ? "from-purple-600 to-indigo-600"
          : supportsVision
          ? "from-purple-500 to-blue-500"
          : isOmni
          ? "from-blue-600 to-cyan-600"
          : "from-blue-500 to-cyan-500",
        avatar: isO1 ? "🧩" : supportsVision ? "👁️" : isOmni ? "🌐" : "🧠",
        style: "geometric",
      },
      capabilities: {
        streaming: !isO1, // O1 models don't support streaming
        functionCalling: !isO1, // O1 models don't support function calling
        multiModal: supportsVision && !isO1, // O1 models don't support vision yet
        fileSupport:
          supportsVision && !isO1
            ? VISION_FILE_SUPPORT
            : TEXT_ONLY_FILE_SUPPORT,
      },
      pricing,
    };
  }

  // O-series models (o1, o3, o4)
  if (modelId.match(/^o[1-9]/)) {
    const isO1 = modelId.includes("o1");
    const isO3 = modelId.includes("o3");
    const isO4 = modelId.includes("o4");
    const isMini = modelId.includes("mini");

    let contextWindow = 128000;
    let maxResponseTokens = 32768;
    let pricing = { inputCostPer1kTokens: 0.015, outputCostPer1kTokens: 0.06 };

    // O4 models have vision (according to docs)
    const supportsVision = isO4;

    // O4-mini specific pricing
    if (isO4 && isMini) {
      pricing = { inputCostPer1kTokens: 0.0025, outputCostPer1kTokens: 0.01 };
    }

    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: "openai",
      maxTokens: contextWindow,
      maxResponseTokens,
      contextWindow,
      personality: "reasoning",
      description: supportsVision
        ? "Advanced reasoning with vision capabilities"
        : "Advanced reasoning and problem-solving capabilities",
      visualConfig: {
        color: supportsVision
          ? "from-purple-500 to-blue-500"
          : "from-purple-600 to-indigo-600",
        avatar: supportsVision ? "👁️" : "🧩",
        style: "geometric",
      },
      capabilities: {
        streaming: false, // O-series models don't support streaming currently
        functionCalling: false, // O-series models don't support function calling currently
        multiModal: supportsVision,
        fileSupport: supportsVision
          ? VISION_FILE_SUPPORT
          : TEXT_ONLY_FILE_SUPPORT,
      },
      pricing,
    };
  }

  // GPT-3.5 variants
  if (modelId.includes("gpt-3.5")) {
    return {
      id: modelId,
      name: formatModelName(modelId),
      provider: "openai",
      maxTokens: 16385,
      maxResponseTokens: 4096,
      contextWindow: 16385,
      personality: "balanced",
      description: "Fast and efficient for most tasks",
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
    };
  }

  return null;
}

// Helper function to format model names
function formatModelName(modelId: string): string {
  return modelId
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/Gpt/g, "GPT")
    .replace(/Turbo/g, "Turbo")
    .replace(/Preview/g, "Preview");
}
