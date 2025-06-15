import Groq from "groq-sdk";
import { z } from "zod";
import {
  AIProvider,
  AIModel,
  ChatMessage,
  StreamingChunk,
  StreamingOptions,
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
  NO_FILE_SUPPORT,
  VISION_FILE_SUPPORT,
} from "../file-capabilities";

// Environment validation
const envSchema = z.object({
  GROQ_API_KEY: z.string().optional(),
});

// Groq API model response interface
interface GroqModelResponse {
  object: "list";
  data: Array<{
    id: string;
    object: "model";
    created: number;
    owned_by: string;
    active: boolean;
    context_window: number;
    public_apps: null;
  }>;
}

// Groq client initialization
let groqClient: Groq | null = null;
let cachedModels: Record<string, AIModel> = {};
let modelsLastFetched: number = 0;
const MODELS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Client cache for BYOK
const clientCache = new Map<string, Groq>();

function getGroqClient(apiKey?: string): Groq {
  const key = apiKey || process.env.GROQ_API_KEY;

  if (!key) {
    throw new AIProviderError(
      "Groq API key is required. Please configure a GROQ_API_KEY environment variable or add your own API key in Settings → API Keys.",
      "groq"
    );
  }

  // Use cached client if available
  if (clientCache.has(key)) {
    return clientCache.get(key)!;
  }

  try {
    const client = new Groq({
      apiKey: key,
    });

    // Cache the client
    clientCache.set(key, client);

    return client;
  } catch (error) {
    throw new AIProviderError(
      "Failed to initialize Groq client. Please check your API key configuration.",
      "groq",
      undefined,
      error
    );
  }
}

// Generate personality and visual config based on model characteristics
function generateModelConfig(
  modelId: string,
  ownedBy: string,
  contextWindow: number
) {
  // Determine model type and characteristics
  const isWhisper = modelId.includes("whisper");
  const isGuard = modelId.includes("guard");
  const isLlama = modelId.includes("llama");
  const isGemma = modelId.includes("gemma");
  const isDistil = modelId.includes("distil");

  // Check for Llama 4 vision models (Scout and Maverick)
  const isLlama4Vision =
    modelId.includes("llama-4-scout") || modelId.includes("llama-4-maverick");

  const size = modelId.match(/(\d+)b/i)?.[1];
  const isLarge = size && parseInt(size) >= 70;
  const isSmall = size && parseInt(size) <= 8;

  // Skip audio models for chat
  if (isWhisper) {
    return null; // Don't include audio models in chat interface
  }

  let personality: string;
  let description: string;
  let avatar: string;
  let color: string;
  let style: "geometric" | "flowing" | "sharp" | "organic";
  let specialties: string[];
  let isVisionCapable = false;

  if (isGuard) {
    personality = "safety-guardian";
    description = "🛡️ Safety Guardian - Content moderation and risk assessment";
    avatar = "🛡️";
    color = "from-red-400 to-orange-500";
    style = "sharp";
    specialties = ["Content moderation", "Safety analysis", "Risk assessment"];
  } else if (isLlama4Vision) {
    personality = "vision-explorer";
    description =
      "👁️ Vision Explorer - Advanced image understanding and analysis";
    avatar = "👁️";
    color = "from-purple-500 to-pink-600";
    style = "organic";
    specialties = [
      "Image analysis",
      "Visual question answering",
      "OCR and text extraction",
      "Multi-modal conversations",
      "Document understanding",
    ];
    isVisionCapable = true;
  } else if (isLlama && isLarge) {
    personality = "wise-powerhouse";
    description =
      "🦕 Wise Powerhouse - Deep reasoning and complex problem solving";
    avatar = "🦕";
    color = "from-purple-500 to-blue-600";
    style = "organic";
    specialties = [
      "Complex reasoning",
      "Long-form content",
      "Code generation",
      "Creative writing",
    ];
  } else if (isLlama && isSmall) {
    personality = "swift-companion";
    description =
      "🦎 Swift Companion - Fast responses with reliable intelligence";
    avatar = "🦎";
    color = "from-green-400 to-blue-500";
    style = "organic";
    specialties = ["Quick responses", "Code snippets", "Summaries", "Q&A"];
  } else if (isLlama) {
    personality = "versatile-llama";
    description = "🦙 Versatile Llama - Balanced performance for diverse tasks";
    avatar = "🦙";
    color = "from-orange-500 to-red-500";
    style = "organic";
    specialties = [
      "Versatile responses",
      "Multi-step problems",
      "Technical analysis",
    ];
  } else if (isGemma) {
    personality = "efficient-genius";
    description =
      "💎 Efficient Genius - Compact intelligence with maximum insight";
    avatar = "💎";
    color = "from-emerald-400 to-teal-500";
    style = "geometric";
    specialties = [
      "Efficient responses",
      "Technical explanations",
      "Educational content",
    ];
  } else if (isDistil) {
    personality = "focused-specialist";
    description = "🎯 Focused Specialist - Optimized for specific tasks";
    avatar = "🎯";
    color = "from-blue-400 to-indigo-500";
    style = "sharp";
    specialties = [
      "Specialized tasks",
      "Optimized performance",
      "Focused responses",
    ];
  } else {
    // Generic model
    personality = "adaptable-assistant";
    description = `🤖 ${ownedBy} Model - Advanced AI assistance`;
    avatar = "🤖";
    color = "from-gray-400 to-slate-500";
    style = "geometric";
    specialties = ["General assistance", "Adaptive responses"];
  }

  return {
    personality,
    description,
    visualConfig: { color, avatar, style },
    specialties,
    isVisionCapable,
  };
}

// Fetch models from Groq API
async function fetchGroqModels(
  userApiKey?: string
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
    const client = getGroqClient(userApiKey);

    // Fetch models from Groq API
    const apiKey = userApiKey || process.env.GROQ_API_KEY;
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch models: ${response.status} ${response.statusText}`
      );
    }

    const data: GroqModelResponse = await response.json();
    const models: Record<string, AIModel> = {};

    for (const modelData of data.data) {
      // Only include active chat models (skip audio/TTS models)
      if (
        !modelData.active ||
        modelData.id.includes("whisper") ||
        modelData.id.includes("distil-whisper") ||
        modelData.id.includes("tts") ||
        modelData.id.includes("playai-tts") ||
        modelData.context_window < 1000 // Skip very small context models (likely not for chat)
      ) {
        continue;
      }

      const config = generateModelConfig(
        modelData.id,
        modelData.owned_by,
        modelData.context_window
      );
      if (!config) continue; // Skip unsupported models

      // Estimate pricing based on model size and type
      let inputCost = 0.0001; // Default cost
      let outputCost = 0.0001;
      let maxResponseTokens = 1024; // Conservative default for Groq models

      const size = modelData.id.match(/(\d+)b/i)?.[1];
      if (size) {
        const sizeNum = parseInt(size);
        if (sizeNum >= 70) {
          inputCost = 0.00059;
          outputCost = 0.00079;
          maxResponseTokens = Math.min(
            2048,
            Math.floor(modelData.context_window * 0.3)
          );
        } else if (sizeNum >= 30) {
          inputCost = 0.0003;
          outputCost = 0.0004;
          maxResponseTokens = Math.min(
            1536,
            Math.floor(modelData.context_window * 0.3)
          );
        } else if (sizeNum <= 8) {
          inputCost = 0.00005;
          outputCost = 0.00008;
          maxResponseTokens = Math.min(
            1024,
            Math.floor(modelData.context_window * 0.25)
          );
        }
      }

      // Special handling for guard models - they have very low max_tokens limits
      if (modelData.id.includes("guard")) {
        maxResponseTokens = 512; // Guard models typically have very low limits
      }

      // Vision models might have different limits
      if (config.isVisionCapable) {
        maxResponseTokens = Math.min(
          1024,
          Math.floor(modelData.context_window * 0.25)
        );
      }

      // Determine file support based on model capabilities
      let fileSupport = TEXT_ONLY_FILE_SUPPORT;

      // Special handling for vision models
      if (config.isVisionCapable) {
        // Enhanced vision support for Llama 4 Scout/Maverick
        fileSupport = {
          images: {
            supported: true,
            maxFileSize: 20, // 20MB max as per API docs
            maxDimensions: {
              width: 2048,
              height: 2048,
            },
            supportedFormats: ["jpeg", "jpg", "png", "gif", "webp"],
            processingMethod: "vision",
            requiresUrl: true, // Groq vision models work with URLs
            maxImagesPerMessage: 5, // Conservative limit
          },
          documents: {
            supported: true,
            maxFileSize: 10,
            supportedFormats: ["pdf", "txt", "md"],
            processingMethod: "textExtraction",
            maxDocumentsPerMessage: 3,
            preserveFormatting: false,
          },
          textFiles: {
            supported: true,
            maxFileSize: 10,
            supportedFormats: ["txt", "md", "csv", "json", "yaml", "xml"],
            encodingSupport: ["utf-8", "ascii"],
            maxFilesPerMessage: 5,
          },
          audio: {
            supported: false,
            maxFileSize: 0,
            supportedFormats: [],
            processingMethod: "transcription",
            maxFilesPerMessage: 0,
          },
          video: {
            supported: false,
            maxFileSize: 0,
            supportedFormats: [],
            processingMethod: "frameExtraction",
            maxFilesPerMessage: 0,
          },
          overall: {
            maxTotalFileSize: 40, // Total across all files
            maxFilesPerMessage: 8,
            requiresPreprocessing: false,
          },
        };
      } else if (
        modelData.id.includes("whisper") ||
        modelData.id.includes("tts")
      ) {
        fileSupport = NO_FILE_SUPPORT;
      }

      models[modelData.id] = {
        id: modelData.id,
        name: modelData.id
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
        provider: "groq",
        maxTokens: modelData.context_window,
        maxResponseTokens,
        contextWindow: modelData.context_window,
        personality: config.personality,
        description: config.description,
        visualConfig: config.visualConfig,
        capabilities: {
          streaming: true,
          functionCalling: false,
          multiModal: config.isVisionCapable,
          fileSupport,
        },
        pricing: {
          inputCostPer1kTokens: inputCost,
          outputCostPer1kTokens: outputCost,
        },
      };
    }

    // Cache the results
    cachedModels = models;
    modelsLastFetched = now;

    console.log(
      `🚀 Groq: Fetched ${Object.keys(models).length} models dynamically`
    );
    return models;
  } catch (error) {
    console.error("Failed to fetch Groq models:", error);

    // Fall back to cached models if available
    if (Object.keys(cachedModels).length > 0) {
      console.log("🔄 Groq: Using cached models due to fetch error");
      return cachedModels;
    }

    // Return empty object if no cache and fetch failed
    return {};
  }
}

// Dynamic model loading - no more hard-coded models!

// Groq Provider Implementation
export class GroqProvider implements AIProvider {
  name = "groq";
  displayName = "Groq";
  private _models: Record<string, AIModel> = {};
  private _modelsLoaded = false;

  get models(): Record<string, AIModel> {
    return this._models;
  }

  get isConfigured(): boolean {
    return true; // Always configured with BYOK support
  }

  // Load models dynamically
  async ensureModelsLoaded(userApiKey?: string): Promise<void> {
    if (!this._modelsLoaded || Object.keys(this._models).length === 0) {
      this._models = await fetchGroqModels(userApiKey);
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
    // Get user's API key through BYOK manager
    const byokConfig = await BYOKManager.getUserApiKey("groq", options.userId);
    const userApiKey = byokConfig?.apiKey;

    // Ensure models are loaded
    await this.ensureModelsLoaded(userApiKey);

    const model = this.models[modelId];
    if (!model) {
      throw new AIProviderError(`Model '${modelId}' not found`, this.name);
    }

    // Prepare messages with system prompt and personalization
    const preparedMessages = prepareMessagesWithSystemPrompt(
      messages,
      model,
      options.personalization
    );

    // Convert messages to Groq format
    const groqMessages = await this.formatMessagesForGroq(
      preparedMessages,
      model
    );

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
      const client = getGroqClient(userApiKey);

      const stream = await client.chat.completions.create({
        model: model.id,
        messages: groqMessages,
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

  // Format messages for Groq API with multimodal support
  private async formatMessagesForGroq(
    messages: ChatMessage[],
    model: AIModel
  ): Promise<any[]> {
    const groqMessages: any[] = [];

    for (const message of messages) {
      if (typeof message.content === "string") {
        // Simple text message
        groqMessages.push({
          role: message.role,
          content: message.content,
        });
      } else if (Array.isArray(message.content)) {
        // Multimodal message - convert to Groq format
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
            // Groq vision models support image_url format like OpenAI
            content.push({
              type: "image_url",
              image_url: contentItem.image_url,
            });
          }
          // Skip other content types that Groq doesn't support
        }

        groqMessages.push({
          role: message.role,
          content: content.length > 0 ? content : message.content,
        });
      } else {
        // Fallback for any other format
        groqMessages.push({
          role: message.role,
          content: message.content,
        });
      }
    }

    return groqMessages;
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
  async getModel(modelId: string): Promise<AIModel | undefined> {
    await this.ensureModelsLoaded();
    return this.models[modelId];
  }

  // Helper method to list available models
  async listModels(): Promise<AIModel[]> {
    await this.ensureModelsLoaded();
    return Object.values(this.models);
  }

  // Test connection to Groq
  async testConnection(userApiKey?: string): Promise<boolean> {
    try {
      const client = getGroqClient(userApiKey);
      await this.ensureModelsLoaded(userApiKey);

      // Get the first available model for testing
      const availableModels = Object.keys(this.models);
      if (availableModels.length === 0) {
        return false;
      }

      // Test with the first available model
      await client.chat.completions.create({
        model: availableModels[0],
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
  async getModelPerformance(modelId: string) {
    const model = await this.getModel(modelId);
    if (!model) return null;

    // Groq is known for extremely fast inference
    const baseSpeedMultiplier = {
      "llama-3.1-8b": 10, // Extremely fast
      "llama3-8b": 10, // Extremely fast
      "gemma2-9b": 8, // Very fast
      "llama-3.3-70b": 5, // Fast for its size
      "llama3-70b": 6, // Fast for its size
      "llama-guard": 9, // Very fast for safety checks
    };

    const speedKey = modelId
      .replace("-instant", "")
      .replace("-versatile", "")
      .replace("-8192", "")
      .replace("-it", "") as keyof typeof baseSpeedMultiplier;
    const speedMultiplier = baseSpeedMultiplier[speedKey] || 5;

    return {
      inferenceSpeed: "ultra-fast",
      tokensPerSecond: speedMultiplier * 100, // Estimated tokens per second
      costEfficiency: "excellent",
      specialties: await this.getModelSpecialties(modelId),
    };
  }

  // Get model specialties from the dynamic model config
  private async getModelSpecialties(modelId: string): Promise<string[]> {
    const model = await this.getModel(modelId);
    if (!model) return ["General assistance"];

    // Extract specialties from the model's description or use the config generated during fetch
    const config = generateModelConfig(modelId, "Meta", model.contextWindow); // Fallback owner
    return config?.specialties || ["General assistance"];
  }
}

// Export singleton instance
export const groqProvider = new GroqProvider();
