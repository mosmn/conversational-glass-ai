import {
  AIProvider,
  AIModel,
  ChatMessage,
  StreamingChunk,
  StreamingOptions,
  AIProviderError,
  ClaudeModelId,
} from "../types";
import { z } from "zod";
import { BYOKManager } from "./byok-manager";
import {
  VISION_FILE_SUPPORT,
  TEXT_ONLY_FILE_SUPPORT,
} from "../file-capabilities";

// Claude-specific configuration
const CLAUDE_CONFIG = {
  baseUrl: "https://api.anthropic.com/v1",
  apiVersion: "2023-06-01",
  defaultMaxTokens: 4096,
  defaultTemperature: 0.7,
};

// Anthropic API model response interface
interface AnthropicModelResponse {
  object: "list";
  data: Array<{
    id: string;
    object: "model";
    created: number;
    owned_by: string;
    type: string;
    display_name: string;
  }>;
}

// Cache for dynamic models
let cachedModels: Record<string, AIModel> = {};
let modelsLastFetched: number = 0;
const MODELS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Claude model definitions with personality and visual styling
export const claudeModels: Record<ClaudeModelId, AIModel> = {
  "claude-3-5-sonnet-20241022": {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "claude",
    maxTokens: 200000,
    maxResponseTokens: 8192,
    contextWindow: 200000,
    personality:
      "Thoughtful and analytical, excellent at reasoning and creative tasks",
    description:
      "Most intelligent model with advanced reasoning, coding, and creative capabilities",
    visualConfig: {
      color: "from-orange-400 to-red-500",
      avatar: "🎭",
      style: "flowing" as const,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      multiModal: true,
      fileSupport: {
        ...VISION_FILE_SUPPORT,
        // Claude 3.5 Sonnet specific constraints
        images: {
          ...VISION_FILE_SUPPORT.images,
          maxFileSize: 100, // Claude supports large images
          maxImagesPerMessage: 20, // High limit for Claude
          requiresUrl: false, // Claude accepts base64
          processingMethod: "vision", // Native vision processing
        },
        documents: {
          ...VISION_FILE_SUPPORT.documents,
          maxFileSize: 100, // Large document support
          processingMethod: "textExtraction", // Claude uses text extraction for PDFs
        },
        overall: {
          ...VISION_FILE_SUPPORT.overall,
          maxTotalFileSize: 200, // Very high total
          maxFilesPerMessage: 25,
        },
      },
    },
    pricing: {
      inputCostPer1kTokens: 0.003,
      outputCostPer1kTokens: 0.015,
    },
  },
  "claude-3-haiku-20240307": {
    id: "claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    provider: "claude",
    maxTokens: 200000,
    maxResponseTokens: 4096,
    contextWindow: 200000,
    personality:
      "Fast and efficient, great for quick tasks and concise responses",
    description:
      "Fastest Claude model, optimized for speed and cost-efficiency",
    visualConfig: {
      color: "from-pink-400 to-rose-500",
      avatar: "🌸",
      style: "sharp" as const,
    },
    capabilities: {
      streaming: true,
      functionCalling: false,
      multiModal: true,
      fileSupport: {
        ...VISION_FILE_SUPPORT,
        // Claude 3 Haiku has more limited capabilities
        images: {
          ...VISION_FILE_SUPPORT.images,
          maxFileSize: 25, // Smaller limit for Haiku
          maxImagesPerMessage: 5, // Lower limit
          requiresUrl: false,
          processingMethod: "vision",
        },
        documents: {
          ...VISION_FILE_SUPPORT.documents,
          maxFileSize: 25,
          processingMethod: "textExtraction",
        },
        overall: {
          ...VISION_FILE_SUPPORT.overall,
          maxTotalFileSize: 50, // Lower total for efficiency
          maxFilesPerMessage: 10,
        },
      },
    },
    pricing: {
      inputCostPer1kTokens: 0.00025,
      outputCostPer1kTokens: 0.00125,
    },
  },
};

// Convert messages to Claude format
function formatMessagesForClaude(messages: ChatMessage[]): {
  messages: any[];
  system: string;
} {
  const claudeMessages: any[] = [];
  let systemMessage = "";

  for (const message of messages) {
    if (message.role === "system") {
      // System messages are always text
      const systemText =
        typeof message.content === "string"
          ? message.content
          : message.content.find((c) => c.type === "text")?.text || "";
      systemMessage += (systemMessage ? "\n\n" : "") + systemText;
    } else {
      if (typeof message.content === "string") {
        // Simple text message
        claudeMessages.push({
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
          } else if (contentItem.type === "image" && contentItem.source) {
            // Claude format
            content.push({
              type: "image",
              source: contentItem.source,
            });
          }
          // Skip content types that Claude doesn't support
        }

        claudeMessages.push({
          role: message.role,
          content:
            content.length === 1 && content[0].type === "text"
              ? content[0].text
              : content,
        });
      }
    }
  }

  return { messages: claudeMessages, system: systemMessage };
}

// Create streaming completion
async function* createClaudeStreamingCompletion(
  messages: ChatMessage[],
  modelId: string,
  options: StreamingOptions = {}
): AsyncIterable<StreamingChunk> {
  // Get API key using BYOK manager (with graceful fallback to environment)
  const keyConfig = await BYOKManager.getApiKeyWithFallback(
    "claude",
    "ANTHROPIC_API_KEY",
    options.userId
  );

  if (!keyConfig) {
    throw new AIProviderError(
      "Anthropic API key not found. Please add your Claude API key in Settings > API Keys or configure ANTHROPIC_API_KEY environment variable.",
      "claude"
    );
  }

  const model = claudeModels[modelId as ClaudeModelId];
  if (!model) {
    throw new AIProviderError(
      `Model ${modelId} not found in Claude provider`,
      "claude"
    );
  }

  const { messages: claudeMessages, system } =
    formatMessagesForClaude(messages);

  const requestBody = {
    model: modelId,
    messages: claudeMessages,
    system: system || undefined,
    max_tokens: Math.min(
      options.maxTokens || CLAUDE_CONFIG.defaultMaxTokens,
      model.maxResponseTokens || 4096
    ),
    temperature: options.temperature || CLAUDE_CONFIG.defaultTemperature,
    stream: true,
  };

  try {
    const response = await fetch(`${CLAUDE_CONFIG.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": keyConfig.apiKey,
        "anthropic-version": CLAUDE_CONFIG.apiVersion,
        "anthropic-beta": "messages-2023-12-15",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AIProviderError(
        `Claude API error: ${response.status} - ${
          errorData.error?.message || response.statusText
        }`,
        "claude",
        response.status
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new AIProviderError("No response body reader available", "claude");
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
          if (line.trim() === "") continue;

          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            if (data === "[DONE]") {
              yield { finished: true };
              return;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === "content_block_delta") {
                const content = parsed.delta?.text;
                if (content) {
                  yield {
                    content,
                    tokenCount: content.length / 4, // Rough estimate
                    finished: false,
                  };
                }
              } else if (parsed.type === "message_stop") {
                yield { finished: true };
                return;
              } else if (parsed.type === "error") {
                throw new AIProviderError(
                  `Claude streaming error: ${
                    parsed.error?.message || "Unknown error"
                  }`,
                  "claude"
                );
              }
            } catch (parseError) {
              if (parseError instanceof AIProviderError) {
                throw parseError;
              }
              console.warn("Failed to parse Claude streaming chunk:", data);
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
      `Claude API request failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      "claude"
    );
  }
}

// Error handling
function handleClaudeError(error: unknown): string {
  if (error instanceof AIProviderError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Parse common Claude API errors
    if (error.message.includes("rate_limit")) {
      return "Claude API rate limit exceeded. Please try again later.";
    }
    if (error.message.includes("invalid_api_key")) {
      return "Invalid Anthropic API key. Please check your configuration.";
    }
    if (error.message.includes("insufficient_quota")) {
      return "Insufficient Claude API quota. Please check your billing.";
    }

    return `Claude API error: ${error.message}`;
  }

  return "Unknown Claude API error occurred";
}

// Token estimation (rough approximation)
function estimateTokens(text: string): number {
  // Claude uses a similar tokenization to GPT models
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
async function testClaudeConnection(userId?: string): Promise<boolean> {
  try {
    const keyConfig = await BYOKManager.getApiKeyWithFallback(
      "claude",
      "ANTHROPIC_API_KEY",
      userId
    );

    if (!keyConfig) return false;

    const response = await fetch(`${CLAUDE_CONFIG.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": keyConfig.apiKey,
        "anthropic-version": CLAUDE_CONFIG.apiVersion,
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 1,
      }),
    });

    return response.ok || response.status === 400; // 400 is ok for test (validation error)
  } catch {
    return false;
  }
}

// Fetch models from Anthropic API
async function fetchAnthropicModels(
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
    const keyConfig = await BYOKManager.getApiKeyWithFallback(
      "claude",
      "ANTHROPIC_API_KEY",
      userId
    );

    if (!keyConfig) {
      console.log("🔄 Claude: No API key available, using static models");
      return claudeModels;
    }

    const response = await fetch(`${CLAUDE_CONFIG.baseUrl}/models`, {
      headers: {
        "x-api-key": keyConfig.apiKey,
        "anthropic-version": CLAUDE_CONFIG.apiVersion,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn("Failed to fetch Claude models, using static fallback");
      return claudeModels;
    }

    const data: AnthropicModelResponse = await response.json();
    const models: Record<string, AIModel> = {};

    for (const modelData of data.data) {
      // Only include model type (according to Anthropic API docs)
      if (modelData.type !== "model") {
        continue;
      }

      const config = generateClaudeModelConfig(
        modelData.id,
        modelData.display_name
      );
      if (!config) continue;

      models[modelData.id] = config;
    }

    // If we didn't get any models from the API, fall back to static
    if (Object.keys(models).length === 0) {
      console.log("🔄 Claude: No valid models from API, using static models");
      return claudeModels;
    }

    // Cache the results
    cachedModels = models;
    modelsLastFetched = now;

    console.log(
      `🚀 Claude: Fetched ${Object.keys(models).length} models dynamically`
    );
    return models;
  } catch (error) {
    console.error("Failed to fetch Claude models:", error);
    console.log("🔄 Claude: Using static models due to fetch error");
    return claudeModels;
  }
}

// Generate model configuration based on model ID
function generateClaudeModelConfig(
  modelId: string,
  displayName?: string
): AIModel | null {
  // Check if we have a static model configuration
  if (claudeModels[modelId as ClaudeModelId]) {
    return claudeModels[modelId as ClaudeModelId];
  }

  // Generate configuration for unknown models
  if (modelId.includes("claude")) {
    const isHaiku = modelId.includes("haiku");
    const isSonnet = modelId.includes("sonnet");
    const isOpus = modelId.includes("opus");

    let personality = "Helpful AI assistant";
    let description = "Claude AI model";
    let contextWindow = 200000;
    let maxResponseTokens = 4096;
    let pricing = { inputCostPer1kTokens: 0.003, outputCostPer1kTokens: 0.015 };
    let visualConfig: {
      color: string;
      avatar: string;
      style: "flowing" | "sharp" | "geometric";
    } = {
      color: "from-orange-400 to-red-500",
      avatar: "🎭",
      style: "flowing",
    };

    if (isHaiku) {
      personality = "Fast and efficient, great for quick tasks";
      description = "Fast Claude model optimized for speed";
      pricing = {
        inputCostPer1kTokens: 0.00025,
        outputCostPer1kTokens: 0.00125,
      };
      visualConfig = {
        color: "from-pink-400 to-rose-500",
        avatar: "🌸",
        style: "sharp",
      };
    } else if (isSonnet) {
      personality = "Thoughtful and analytical, excellent for reasoning";
      description = "Balanced Claude model with strong capabilities";
      maxResponseTokens = 8192;
    } else if (isOpus) {
      personality = "Most capable, excellent for complex reasoning";
      description = "Most powerful Claude model";
      maxResponseTokens = 8192;
      pricing = { inputCostPer1kTokens: 0.015, outputCostPer1kTokens: 0.075 };
      visualConfig = {
        color: "from-purple-500 to-indigo-600",
        avatar: "👑",
        style: "geometric",
      };
    }

    return {
      id: modelId,
      name: displayName || formatModelName(modelId),
      provider: "claude",
      maxTokens: contextWindow,
      maxResponseTokens,
      contextWindow,
      personality,
      description,
      visualConfig,
      capabilities: {
        streaming: true,
        functionCalling: !isHaiku, // Haiku doesn't support tools
        multiModal: true,
        fileSupport: VISION_FILE_SUPPORT,
      },
      pricing,
    };
  }

  return null;
}

// Helper function to format model names
function formatModelName(modelId: string): string {
  return modelId
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/Claude/g, "Claude")
    .replace(/Anthropic/g, "Anthropic");
}

// Claude Provider Implementation
class ClaudeProvider implements AIProvider {
  name = "claude";
  displayName = "Anthropic Claude";
  private _models: Record<string, AIModel> = claudeModels;
  private _modelsLoaded = false;

  get models(): Record<string, AIModel> {
    return this._models;
  }

  get isConfigured(): boolean {
    return true; // Always true to allow BYOK
  }

  // Load models dynamically
  async ensureModelsLoaded(userId?: string): Promise<void> {
    if (!this._modelsLoaded || Object.keys(this._models).length === 0) {
      this._models = await fetchAnthropicModels(userId);
      this._modelsLoaded = true;
    }
  }

  createStreamingCompletion = createClaudeStreamingCompletion;
  handleError = handleClaudeError;
  estimateTokens = estimateTokens;
  calculateConversationTokens = calculateConversationTokens;

  async testConnection(userId?: string): Promise<boolean> {
    await this.ensureModelsLoaded(userId);
    return testClaudeConnection(userId);
  }

  // Helper methods
  getModel(modelId: string): AIModel | undefined {
    return this.models[modelId as ClaudeModelId];
  }

  listModels(): AIModel[] {
    return Object.values(this.models);
  }
}

// Export singleton instance
export const claudeProvider = new ClaudeProvider();

export default claudeProvider;
