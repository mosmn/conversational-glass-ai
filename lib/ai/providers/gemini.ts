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
import {
  TEXT_ONLY_FILE_SUPPORT,
  VISION_FILE_SUPPORT,
  ADVANCED_MULTIMODAL_SUPPORT,
  NO_FILE_SUPPORT,
} from "../file-capabilities";

// Environment validation
const geminiEnvSchema = z.object({
  GOOGLE_AI_API_KEY: z.string().optional(),
});

type GeminiEnv = z.infer<typeof geminiEnvSchema>;

// Validate environment
let env: GeminiEnv | null = null;
try {
  env = geminiEnvSchema.parse({
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  });
} catch (error) {
  console.warn("Gemini provider not configured:", error);
}

// Gemini-specific configuration
const GEMINI_CONFIG = {
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  defaultMaxTokens: 8192,
  defaultTemperature: 0.7,
  defaultTopP: 0.95,
  defaultTopK: 64,
};

// Gemini API response types
interface GeminiModelResponse {
  models: Array<{
    name: string;
    baseModelId: string;
    version: string;
    displayName: string;
    description: string;
    inputTokenLimit: number;
    outputTokenLimit: number;
    supportedGenerationMethods: string[];
    temperature?: number;
    maxTemperature?: number;
    topP?: number;
    topK?: number;
  }>;
  nextPageToken?: string;
}

// Cache for dynamic models
let cachedModels: Record<string, AIModel> = {};
let modelsLastFetched = 0;
const MODELS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Generate model configuration based on model characteristics
function generateGeminiModelConfig(
  baseModelId: string,
  displayName: string,
  description: string,
  inputTokenLimit: number
) {
  // Determine personality and visual config based on model characteristics
  let personality = "balanced";
  let visualConfig = {
    color: "from-blue-400 to-purple-500",
    avatar: "🔮",
    style: "geometric" as const,
  };

  // Categorize based on model name patterns
  if (baseModelId.includes("flash")) {
    personality = "lightning-fast";
    visualConfig = {
      color: "from-yellow-400 to-orange-500",
      avatar: "⚡",
      style: "geometric" as const,
    };
  } else if (baseModelId.includes("pro")) {
    personality = "versatile-powerhouse";
    visualConfig = {
      color: "from-blue-400 to-purple-500",
      avatar: "🔮",
      style: "geometric" as const,
    };
  } else if (baseModelId.includes("8b")) {
    personality = "efficient-genius";
    visualConfig = {
      color: "from-green-400 to-blue-500",
      avatar: "🧠",
      style: "geometric" as const,
    };
  } else if (baseModelId.includes("2.0") || baseModelId.includes("exp")) {
    personality = "futuristic-innovator";
    visualConfig = {
      color: "from-purple-400 to-pink-500",
      avatar: "🚀",
      style: "geometric" as const,
    };
  }

  // Generate description based on characteristics
  let generatedDescription = description;
  if (!generatedDescription) {
    if (baseModelId.includes("flash")) {
      generatedDescription =
        "Fast and efficient model optimized for speed while maintaining quality";
    } else if (baseModelId.includes("pro")) {
      generatedDescription =
        "Most capable model with advanced reasoning and multimodal capabilities";
    } else if (baseModelId.includes("8b")) {
      generatedDescription = "Compact and efficient model for rapid responses";
    } else {
      generatedDescription = "Advanced AI model with versatile capabilities";
    }
  }

  return {
    personality,
    description: generatedDescription,
    visualConfig,
  };
}

// Fetch available models from Gemini API
async function fetchGeminiModels(
  userApiKey?: string,
  userId?: string
): Promise<Record<string, AIModel>> {
  const now = Date.now();

  // Return cached models if still fresh
  if (
    now - modelsLastFetched < MODELS_CACHE_DURATION &&
    Object.keys(cachedModels).length > 0
  ) {
    return cachedModels;
  }

  // Use BYOK manager to get API key with proper priority
  let apiKey: string | null = null;

  if (userApiKey) {
    apiKey = userApiKey;
  } else {
    // Use BYOK manager for consistent API key resolution
    const { BYOKManager } = await import("./byok-manager");
    const keyConfig = await BYOKManager.getApiKeyWithFallback(
      "gemini",
      "GOOGLE_AI_API_KEY",
      userId
    );
    apiKey = keyConfig?.apiKey || null;
  }

  if (!apiKey) {
    console.warn("🔴 Gemini: No API key configured");
    return {};
  }

  try {
    const url = `${GEMINI_CONFIG.baseUrl}/models?key=${apiKey}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch models: ${response.status} ${response.statusText}`
      );
    }

    const data: GeminiModelResponse = await response.json();
    const models: Record<string, AIModel> = {};

    for (const modelData of data.models) {
      // Only include models that support generateContent
      if (
        modelData.supportedGenerationMethods &&
        Array.isArray(modelData.supportedGenerationMethods) &&
        !modelData.supportedGenerationMethods.includes("generateContent")
      ) {
        continue;
      }

      // Skip models without supportedGenerationMethods entirely
      if (
        !modelData.supportedGenerationMethods ||
        !Array.isArray(modelData.supportedGenerationMethods)
      ) {
        continue;
      }

      // Use name field as the model ID (e.g., "models/gemini-1.5-pro")
      const modelId = modelData.name;
      const modelName = modelId.replace("models/", ""); // Remove "models/" prefix

      // Skip embedding-only models and other non-chat models
      if (
        modelName.includes("embedding") ||
        modelName.includes("aqa") ||
        modelName.includes("text-embedding") ||
        modelName.includes("embedding-preview")
      ) {
        continue;
      }

      const config = generateGeminiModelConfig(
        modelName,
        modelData.displayName,
        modelData.description,
        modelData.inputTokenLimit
      );

      // Estimate pricing based on model capabilities
      let inputCost = 0.00125; // Default Pro pricing
      let outputCost = 0.005;

      if (modelName.includes("flash")) {
        inputCost = 0.000075;
        outputCost = 0.0003;
      } else if (modelName.includes("8b")) {
        inputCost = 0.0000375;
        outputCost = 0.00015;
      }

      // Determine file support capabilities based on model name and version
      let fileSupport = TEXT_ONLY_FILE_SUPPORT; // Default to text extraction
      let multiModal = true; // Most Gemini models support multimodal

      if (modelName.includes("1.5") || modelName.includes("2.0")) {
        // Gemini 1.5+ and 2.0+ models have advanced multimodal capabilities
        fileSupport = {
          ...ADVANCED_MULTIMODAL_SUPPORT,
          // Override with Gemini-specific constraints
          images: {
            ...ADVANCED_MULTIMODAL_SUPPORT.images,
            maxFileSize: 20, // Gemini supports up to 20MB images
            requiresUrl: false, // Gemini can accept base64 data
            processingMethod: "both", // Gemini can do both vision and OCR
          },
          documents: {
            ...ADVANCED_MULTIMODAL_SUPPORT.documents,
            maxFileSize: 20,
            processingMethod: "nativeProcessing", // Gemini can process PDFs natively
            preserveFormatting: true,
          },
          overall: {
            ...ADVANCED_MULTIMODAL_SUPPORT.overall,
            maxTotalFileSize: 100, // Higher total for Gemini
            maxFilesPerMessage: 20,
          },
        };
      } else if (modelName.includes("vision") || modelName.includes("pro")) {
        // Older Pro models with vision
        fileSupport = VISION_FILE_SUPPORT;
      } else if (modelName.includes("nano") || modelName.includes("8b")) {
        // Smaller models might have limited capabilities
        fileSupport = TEXT_ONLY_FILE_SUPPORT;
        multiModal = false;
      }

      models[modelName] = {
        id: modelName,
        name:
          modelData.displayName ||
          modelName
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" "),
        provider: "gemini",
        maxTokens: modelData.inputTokenLimit || 30720, // Default if not provided
        maxResponseTokens: Math.min(
          modelData.outputTokenLimit || 8192,
          8192 // Cap at 8K for response
        ),
        contextWindow: modelData.inputTokenLimit || 30720, // Default if not provided
        personality: config.personality,
        description: config.description,
        visualConfig: config.visualConfig,
        capabilities: {
          streaming: true,
          functionCalling: true,
          multiModal,
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
      `🚀 Gemini: Fetched ${Object.keys(models).length} models dynamically`
    );
    return models;
  } catch (error) {
    console.error("Failed to fetch Gemini models:", error);

    // Fall back to cached models if available
    if (Object.keys(cachedModels).length > 0) {
      console.log("🔄 Gemini: Using cached models due to fetch error");
      return cachedModels;
    }

    // Return empty object if no cache and fetch failed
    return {};
  }
}

// Convert messages to Gemini format
function formatMessagesForGemini(
  messages: ChatMessage[],
  model: AIModel,
  personalization?: {
    displayName?: string;
    description?: string;
    traits?: string[];
    additionalInfo?: string;
  }
): {
  contents: any[];
  systemInstruction?: any;
} {
  const contents: any[] = [];
  let systemInstruction: string = "";

  for (const message of messages) {
    if (message.role === "system") {
      // System messages are always text
      const systemText =
        typeof message.content === "string"
          ? message.content
          : message.content.find((c) => c.type === "text")?.text || "";
      systemInstruction += (systemInstruction ? "\n\n" : "") + systemText;
    } else {
      const parts: any[] = [];

      if (typeof message.content === "string") {
        // Simple text message
        parts.push({ text: message.content });
      } else if (Array.isArray(message.content)) {
        // Multimodal message
        for (const contentItem of message.content) {
          if (contentItem.type === "text") {
            parts.push({ text: contentItem.text });
          } else if (contentItem.type === "image" && contentItem.image) {
            // Gemini native format
            parts.push({
              inlineData: {
                data: contentItem.image.data,
                mimeType: contentItem.image.mimeType,
              },
            });
          }
          // Skip content types that Gemini doesn't support
        }
      }

      // Only add if we have parts
      if (parts.length > 0) {
        contents.push({
          role: message.role === "assistant" ? "model" : "user",
          parts,
        });
      }
    }
  }

  return {
    contents,
    systemInstruction: systemInstruction
      ? { parts: [{ text: systemInstruction }] }
      : undefined,
  };
}

// Create streaming completion
async function* createGeminiStreamingCompletion(
  messages: ChatMessage[],
  modelId: string,
  options: StreamingOptions = {},
  userApiKey?: string
): AsyncIterable<StreamingChunk> {
  // Use BYOK manager to get API key with proper priority
  let apiKey: string | null = null;

  if (userApiKey) {
    apiKey = userApiKey;
  } else {
    // Use BYOK manager for consistent API key resolution
    const { BYOKManager } = await import("./byok-manager");
    const keyConfig = await BYOKManager.getApiKeyWithFallback(
      "gemini",
      "GOOGLE_AI_API_KEY",
      options.userId
    );
    apiKey = keyConfig?.apiKey || null;
  }

  if (!apiKey) {
    throw new AIProviderError(
      "Gemini API key is required. Please configure a GOOGLE_AI_API_KEY environment variable or add your own API key in Settings → API Keys.",
      "gemini"
    );
  }

  // Create a dummy model for formatting - this will be improved when model is available
  const dummyModel: AIModel = {
    id: modelId,
    name: modelId,
    provider: "gemini",
    maxTokens: 30720,
    maxResponseTokens: 8192,
    contextWindow: 30720,
    personality: "helpful",
    description: "Gemini model",
    visualConfig: {
      color: "blue",
      avatar: "🤖",
      style: "geometric",
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      multiModal: true,
      fileSupport: {} as any,
    },
    pricing: {
      inputCostPer1kTokens: 0.00125,
      outputCostPer1kTokens: 0.005,
    },
  };

  const { contents, systemInstruction } = formatMessagesForGemini(
    messages,
    dummyModel
  );

  const requestBody = {
    contents,
    systemInstruction,
    generationConfig: {
      maxOutputTokens: Math.min(
        options.maxTokens || GEMINI_CONFIG.defaultMaxTokens,
        8192 // Use default since model object is not available here
      ),
      temperature: options.temperature || GEMINI_CONFIG.defaultTemperature,
      topP: GEMINI_CONFIG.defaultTopP,
      topK: GEMINI_CONFIG.defaultTopK,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
    ],
  };

  const url = `${GEMINI_CONFIG.baseUrl}/models/${modelId}:streamGenerateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AIProviderError(
        `Gemini API error: ${response.status} - ${
          errorData.error?.message || response.statusText
        }`,
        "gemini",
        response.status
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new AIProviderError("No response body reader available", "gemini");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Try to extract complete JSON objects from the buffer
        let startIndex = 0;
        while (startIndex < buffer.length) {
          // Find the start of a JSON object
          const jsonStart = buffer.indexOf("{", startIndex);
          if (jsonStart === -1) break;

          // Find the matching closing brace
          let braceCount = 0;
          let jsonEnd = -1;
          for (let i = jsonStart; i < buffer.length; i++) {
            if (buffer[i] === "{") braceCount++;
            else if (buffer[i] === "}") {
              braceCount--;
              if (braceCount === 0) {
                jsonEnd = i;
                break;
              }
            }
          }

          // If we haven't found a complete JSON object, wait for more data
          if (jsonEnd === -1) break;

          const jsonStr = buffer.slice(jsonStart, jsonEnd + 1);

          try {
            const parsed = JSON.parse(jsonStr);

            if (parsed.candidates && parsed.candidates.length > 0) {
              const candidate = parsed.candidates[0];

              if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                  if (part.text) {
                    yield {
                      content: part.text,
                      tokenCount: estimateTokens(part.text),
                      finished: false,
                    };
                  }
                }
              }

              // Check if generation is finished
              if (candidate.finishReason) {
                if (candidate.finishReason === "STOP") {
                  yield { finished: true };
                  return;
                } else if (candidate.finishReason === "SAFETY") {
                  throw new AIProviderError(
                    "Gemini response blocked due to safety filters",
                    "gemini"
                  );
                } else if (candidate.finishReason === "RECITATION") {
                  throw new AIProviderError(
                    "Gemini response blocked due to recitation concerns",
                    "gemini"
                  );
                } else if (candidate.finishReason === "MAX_TOKENS") {
                  yield { finished: true };
                  return;
                }
              }
            }

            if (parsed.error) {
              throw new AIProviderError(
                `Gemini streaming error: ${
                  parsed.error.message || "Unknown error"
                }`,
                "gemini"
              );
            }
          } catch (parseError) {
            if (parseError instanceof AIProviderError) {
              throw parseError;
            }
            // Skip this chunk and continue - don't log every parse failure
            console.warn("Failed to parse Gemini streaming chunk, skipping...");
          }

          // Move to the next potential JSON object
          startIndex = jsonEnd + 1;
        }

        // Keep the remaining incomplete data in buffer
        if (startIndex > 0) {
          buffer = buffer.slice(startIndex);
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
      `Gemini API request failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      "gemini"
    );
  }
}

// Error handling
function handleGeminiError(error: unknown): string {
  if (error instanceof AIProviderError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Parse common Gemini API errors
    if (error.message.includes("quota")) {
      return "Gemini API quota exceeded. Please try again later.";
    }
    if (error.message.includes("API_KEY_INVALID")) {
      return "Invalid Google AI API key. Please check your configuration.";
    }
    if (error.message.includes("safety")) {
      return "Response blocked by Gemini safety filters. Please try rephrasing your request.";
    }
    if (error.message.includes("recitation")) {
      return "Response blocked due to potential copyright concerns.";
    }

    return `Gemini API error: ${error.message}`;
  }

  return "Unknown Gemini API error occurred";
}

// Token estimation (rough approximation)
function estimateTokens(text: string): number {
  // Gemini uses similar tokenization to other models
  // Rough approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

// Calculate total conversation tokens
function calculateConversationTokens(messages: ChatMessage[]): number {
  return messages.reduce((total, msg) => {
    if (typeof msg.content === "string") {
      return total + estimateTokens(msg.content);
    } else if (Array.isArray(msg.content)) {
      // Sum tokens for all text content items
      return (
        total +
        msg.content.reduce((contentTotal, item) => {
          if (item.type === "text") {
            return contentTotal + estimateTokens(item.text);
          }
          // For images and other content, add approximate token cost
          if (item.type === "image" || item.type === "image_url") {
            return contentTotal + 1275; // Approximate image token cost
          }
          return contentTotal;
        }, 0)
      );
    }
    return total;
  }, 0);
}

// Test connection
async function testGeminiConnection(userApiKey?: string): Promise<boolean> {
  // Use BYOK manager to get API key with proper priority
  let apiKey: string | null = null;

  if (userApiKey) {
    apiKey = userApiKey;
  } else {
    // Use BYOK manager for consistent API key resolution
    const { BYOKManager } = await import("./byok-manager");
    const keyConfig = await BYOKManager.getApiKeyWithFallback(
      "gemini",
      "GOOGLE_AI_API_KEY"
    );
    apiKey = keyConfig?.apiKey || null;
  }

  if (!apiKey) return false;

  try {
    const url = `${GEMINI_CONFIG.baseUrl}/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: "Hello" }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1,
        },
      }),
    });

    return response.ok || response.status === 400; // 400 is ok for test (validation error)
  } catch {
    return false;
  }
}

// Gemini Provider Implementation (Dynamic)
export class GeminiProvider implements AIProvider {
  name = "gemini";
  displayName = "Google Gemini";
  private _models: Record<string, AIModel> = {};
  private _modelsLoaded = false;

  get models(): Record<string, AIModel> {
    return this._models;
  }

  get isConfigured(): boolean {
    return true; // Always configured with BYOK support
  }

  // Load models dynamically
  async ensureModelsLoaded(
    userApiKey?: string,
    userId?: string
  ): Promise<void> {
    if (!this._modelsLoaded || Object.keys(this._models).length === 0) {
      this._models = await fetchGeminiModels(userApiKey, userId);
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
    const byokConfig = await BYOKManager.getUserApiKey(
      "gemini",
      options.userId
    );
    const userApiKey = byokConfig?.apiKey;

    // Ensure models are loaded with user's API key
    await this.ensureModelsLoaded(userApiKey, options.userId);

    const model = this.models[modelId];
    if (!model) {
      throw new AIProviderError(`Model '${modelId}' not found`, this.name);
    }

    // Use the existing streaming function with user's API key
    yield* createGeminiStreamingCompletion(
      messages,
      modelId,
      options,
      userApiKey
    );
  }

  handleError = handleGeminiError;
  testConnection = testGeminiConnection;
}

// Export instance
export const geminiProvider = new GeminiProvider();

export default geminiProvider;
