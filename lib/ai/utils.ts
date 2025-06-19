import { ChatMessage, AIModel, ModelId, SystemPromptTemplate } from "./types";

// Token counting utility (approximate)
export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English text
  // This is a conservative estimate that works across providers
  return Math.ceil(text.length / 4);
}

// Calculate total tokens for a conversation
export function calculateConversationTokens(messages: ChatMessage[]): number {
  return messages.reduce((total, message) => {
    let contentTokens = 0;

    if (typeof message.content === "string") {
      contentTokens = estimateTokens(message.content);
    } else if (Array.isArray(message.content)) {
      // Sum tokens for all text content items
      contentTokens = message.content.reduce((contentTotal, item) => {
        if (item.type === "text") {
          return contentTotal + estimateTokens(item.text);
        }
        // For images and other content, add approximate token cost
        if (item.type === "image" || item.type === "image_url") {
          return contentTotal + 1275; // Approximate image token cost
        }
        return contentTotal;
      }, 0);
    }

    return total + contentTokens + estimateTokens(message.role);
  }, 0);
}

// System prompt generation based on model personality
export function generateSystemPrompt(model: AIModel): SystemPromptTemplate {
  const basePrompts = {
    analytical: `You are ${model.name}, an analytical genius AI assistant with a logical, precise, and methodical thinking approach. You excel at technical discussions, problem-solving, and providing thorough, well-structured responses. Your personality is focused and geometric in nature.`,

    balanced: `You are ${model.name}, a balanced and efficient AI assistant. You provide helpful, clear, and concise responses while maintaining a friendly and approachable tone. You're versatile and adaptable to various conversation topics.`,

    "versatile-powerhouse": `You are ${model.name}, a versatile powerhouse AI assistant. You combine deep reasoning capabilities with practical wisdom. You're reliable, thorough, and excel at handling complex, multi-faceted problems. Your responses are comprehensive yet accessible.`,

    "lightning-fast": `You are ${model.name}, a lightning-fast AI assistant optimized for quick, efficient responses. You provide concise, accurate answers while maintaining high quality. You excel at rapid problem-solving and getting straight to the point.`,

    "efficient-genius": `You are ${model.name}, an efficient genius AI assistant. You deliver smart, compact responses that maximize insight per word. You're excellent at distilling complex concepts into clear, actionable insights.`,

    "creative-virtuoso": `You are ${model.name}, a creative virtuoso AI assistant. You're sophisticated, thoughtful, and nuanced in your approach. You excel at creative tasks, artistic discussions, and bringing unique perspectives to conversations.`,

    "futuristic-innovator": `You are ${model.name}, a futuristic innovator AI assistant. You're cutting-edge, adaptive, and lightning-fast. You excel at exploring new ideas, technological discussions, and pushing the boundaries of what's possible.`,
  };

  const prompt =
    basePrompts[model.personality as keyof typeof basePrompts] ||
    basePrompts.balanced;

  return {
    role: "system",
    content: prompt,
  };
}

// Enhanced system prompt generation with user personalization
export function generatePersonalizedSystemPrompt(
  model: AIModel,
  personalization?: {
    displayName?: string;
    description?: string;
    traits?: string[];
    additionalInfo?: string;
  }
): SystemPromptTemplate {
  // Start with base personality prompt
  const basePrompts = {
    analytical: `You are ${model.name}, an analytical genius AI assistant with a logical, precise, and methodical thinking approach. You excel at technical discussions, problem-solving, and providing thorough, well-structured responses. Your personality is focused and geometric in nature.`,

    balanced: `You are ${model.name}, a balanced and efficient AI assistant. You provide helpful, clear, and concise responses while maintaining a friendly and approachable tone. You're versatile and adaptable to various conversation topics.`,

    "versatile-powerhouse": `You are ${model.name}, a versatile powerhouse AI assistant. You combine deep reasoning capabilities with practical wisdom. You're reliable, thorough, and excel at handling complex, multi-faceted problems. Your responses are comprehensive yet accessible.`,

    "lightning-fast": `You are ${model.name}, a lightning-fast AI assistant optimized for quick, efficient responses. You provide concise, accurate answers while maintaining high quality. You excel at rapid problem-solving and getting straight to the point.`,

    "efficient-genius": `You are ${model.name}, an efficient genius AI assistant. You deliver smart, compact responses that maximize insight per word. You're excellent at distilling complex concepts into clear, actionable insights.`,

    "creative-virtuoso": `You are ${model.name}, a creative virtuoso AI assistant. You're sophisticated, thoughtful, and nuanced in your approach. You excel at creative tasks, artistic discussions, and bringing unique perspectives to conversations.`,

    "futuristic-innovator": `You are ${model.name}, a futuristic innovator AI assistant. You're cutting-edge, adaptive, and lightning-fast. You excel at exploring new ideas, technological discussions, and pushing the boundaries of what's possible.`,
  };

  let prompt =
    basePrompts[model.personality as keyof typeof basePrompts] ||
    basePrompts.balanced;

  // Add personalization if provided - integrate naturally without being explicit about sources
  if (personalization) {
    const hasPersonalization =
      personalization.displayName ||
      personalization.description ||
      (personalization.traits && personalization.traits.length > 0) ||
      personalization.additionalInfo;

    if (hasPersonalization) {
      // Create a natural personality extension rather than explicit "user provided" sections
      const personalityExtensions: string[] = [];

      // Integrate traits naturally into personality
      if (personalization.traits && personalization.traits.length > 0) {
        personalityExtensions.push(
          `You embody these additional characteristics: ${personalization.traits.join(
            ", "
          )}.`
        );
      }

      // Add context about who you're talking to without being explicit
      if (personalization.displayName || personalization.description) {
        let contextString = "You are currently assisting";
        if (personalization.displayName) {
          contextString += ` ${personalization.displayName}`;
        }
        if (personalization.description) {
          contextString += personalization.displayName
            ? `, who works in ${personalization.description}`
            : ` someone who works in ${personalization.description}`;
        }
        contextString += ".";
        personalityExtensions.push(contextString);
      }

      // Add additional context naturally
      if (personalization.additionalInfo) {
        personalityExtensions.push(
          `Keep in mind: ${personalization.additionalInfo}`
        );
      }

      // Integrate extensions naturally into the prompt
      if (personalityExtensions.length > 0) {
        prompt += "\n\n" + personalityExtensions.join(" ");
      }

      // Add natural guidance for personalization
      if (personalization.displayName) {
        prompt += ` Feel free to address them by name when it feels natural in conversation.`;
      }
    }
  }

  return {
    role: "system",
    content: prompt,
  };
}

// Detect provider from model ID (now dynamic!)
export function getProviderFromModelId(modelId: ModelId): string {
  // OpenRouter models - these have the format "provider/model:variant" or "provider/model"
  if (
    modelId.includes("/") ||
    modelId.includes(":") ||
    modelId.startsWith("openai/") ||
    modelId.startsWith("anthropic/") ||
    modelId.startsWith("google/") ||
    modelId.startsWith("meta-llama/") ||
    modelId.startsWith("deepseek/") ||
    modelId.startsWith("microsoft/") ||
    modelId.startsWith("mistralai/") ||
    modelId.startsWith("qwen/") ||
    modelId.startsWith("nvidia/") ||
    modelId.startsWith("cognitivecomputations/") ||
    modelId.endsWith(":free") ||
    modelId.endsWith(":beta") ||
    modelId.endsWith(":extended")
  ) {
    return "openrouter";
  }

  // OpenAI models (direct API)
  if (
    modelId.startsWith("gpt-") ||
    modelId === "o1-preview" ||
    modelId === "o1-mini"
  ) {
    return "openai";
  }

  // Claude models (direct API)
  if (modelId.startsWith("claude-")) {
    return "claude";
  }

  // Gemini models (direct API)
  if (modelId.startsWith("gemini-")) {
    return "gemini";
  }

  // Groq models - fallback for anything not matching above patterns
  // Most Groq models include these patterns
  if (
    modelId.includes("llama") ||
    modelId.includes("gemma") ||
    modelId.includes("mistral") ||
    modelId.includes("deepseek") ||
    modelId.includes("qwen") ||
    modelId.includes("allam") ||
    modelId.includes("compound") ||
    modelId.includes("guard") ||
    modelId.includes("whisper") // audio models
  ) {
    return "groq";
  }

  // Default fallback - could be unknown or we might add more logic
  console.warn(`⚠️ Unknown provider for model: ${modelId}`);
  return "unknown";
}

// Validate model compatibility with provider
export function validateModelProvider(
  modelId: ModelId,
  expectedProvider: string
): boolean {
  return getProviderFromModelId(modelId) === expectedProvider;
}

// Format streaming chunk for consistent API response
export function formatStreamingChunk(
  type: "content" | "completion" | "error",
  data: {
    content?: string;
    finished?: boolean;
    error?: string;
    tokenCount?: number;
    messageId?: string;
  }
) {
  return {
    type,
    ...data,
  };
}

// Prepare messages with system prompt
export function prepareMessagesWithSystemPrompt(
  messages: ChatMessage[],
  model: AIModel,
  personalization?: {
    displayName?: string;
    description?: string;
    traits?: string[];
    additionalInfo?: string;
  }
): ChatMessage[] {
  const systemPrompt = personalization
    ? generatePersonalizedSystemPrompt(model, personalization)
    : generateSystemPrompt(model);

  // Check if first message is already a system message
  if (messages.length > 0 && messages[0].role === "system") {
    return messages;
  }

  return [systemPrompt, ...messages];
}

// Create error response for API routes
export function createErrorResponse(
  error: unknown,
  provider: string,
  defaultMessage: string = "An unexpected error occurred"
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return `${provider}: ${defaultMessage}`;
}

// Validate token limits for model
export function validateTokenLimits(
  messages: ChatMessage[],
  model: AIModel,
  maxResponseTokens?: number
): { valid: boolean; error?: string } {
  const totalInputTokens = calculateConversationTokens(messages);
  const reservedTokens = maxResponseTokens || model.maxResponseTokens || 4096;
  const availableTokens = model.contextWindow - reservedTokens;

  if (totalInputTokens > availableTokens) {
    return {
      valid: false,
      error: `Conversation too long. Input tokens: ${totalInputTokens}, Available: ${availableTokens} (Context: ${model.contextWindow}, Reserved for response: ${reservedTokens})`,
    };
  }

  return { valid: true };
}

// Generate unique conversation ID
export function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate unique message ID
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Environment variable helpers
export function requireEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

export function getOptionalEnvVar(name: string): string | undefined {
  return process.env[name];
}

// Model performance metrics (for UI display)
export function getModelMetrics(model: AIModel) {
  return {
    speed: getSpeedRating(model),
    capacity: getCapacityRating(model),
    efficiency: getEfficiencyRating(model),
  };
}

function getSpeedRating(model: AIModel): "fast" | "medium" | "slow" {
  // Groq models are generally faster, larger models are slower
  if (model.provider === "groq") {
    return model.name.includes("8b") ? "fast" : "medium";
  }

  if (model.provider === "openai") {
    return model.name.includes("3.5") ? "fast" : "medium";
  }

  if (model.provider === "claude") {
    return model.name.includes("Haiku") ? "fast" : "medium";
  }

  if (model.provider === "gemini") {
    return model.name.includes("Flash") ? "fast" : "medium";
  }

  return "medium";
}

function getCapacityRating(model: AIModel): "high" | "medium" | "low" {
  if (model.contextWindow >= 100000) return "high";
  if (model.contextWindow >= 30000) return "medium";
  return "low";
}

function getEfficiencyRating(model: AIModel): "high" | "medium" | "low" {
  // Smaller models are generally more efficient
  if (model.name.includes("8b") || model.name.includes("9b")) return "high";
  if (model.name.includes("70b") || model.name.includes("gpt-4"))
    return "medium";
  return "high";
}

/**
 * Test a specific provider with an API key
 * Used for validating API keys before saving or when testing existing keys
 * Performs actual API calls to verify key validity
 */
export async function testProviderKey(
  provider: string,
  apiKey: string
): Promise<{
  success: boolean;
  error?: string;
  quotaInfo?: any;
  models?: string[];
}> {
  try {
    switch (provider) {
      case "openai":
        return await testOpenAIKey(apiKey);

      case "claude":
        return await testClaudeKey(apiKey);

      case "gemini":
        return await testGeminiKey(apiKey);

      case "openrouter":
        return await testOpenRouterKey(apiKey);

      case "groq":
        return await testGroqKey(apiKey);

      default:
        return { success: false, error: `Unknown provider: ${provider}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Test failed",
    };
  }
}

/**
 * Test OpenAI API key by making a minimal API call
 */
async function testOpenAIKey(apiKey: string): Promise<{
  success: boolean;
  error?: string;
  quotaInfo?: any;
  models?: string[];
}> {
  // First validate format
  if (!apiKey.startsWith("sk-") || apiKey.length < 20) {
    return {
      success: false,
      error: "Invalid OpenAI API key format (should start with 'sk-')",
    };
  }

  try {
    // Test with models endpoint - lightweight and informative
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: "Invalid or expired API key" };
      }
      if (response.status === 429) {
        return { success: false, error: "Rate limit exceeded" };
      }
      if (response.status === 403) {
        return { success: false, error: "API key lacks required permissions" };
      }
      return {
        success: false,
        error: `API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      models: data.data?.map((model: any) => model.id) || [],
      quotaInfo: {
        totalLimit: null, // OpenAI doesn't expose quota in models endpoint
        used: null,
        remaining: null,
        resetDate: null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Test Claude API key by making a minimal API call
 */
async function testClaudeKey(apiKey: string): Promise<{
  success: boolean;
  error?: string;
  quotaInfo?: any;
  models?: string[];
}> {
  // First validate format
  if (!apiKey.startsWith("sk-ant-") || apiKey.length < 20) {
    return {
      success: false,
      error: "Invalid Claude API key format (should start with 'sk-ant-')",
    };
  }

  try {
    // Test with a minimal message request
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1,
        messages: [
          {
            role: "user",
            content: "Hi",
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: "Invalid or expired API key" };
      }
      if (response.status === 429) {
        return { success: false, error: "Rate limit exceeded" };
      }
      if (response.status === 403) {
        return { success: false, error: "API key lacks required permissions" };
      }
      return {
        success: false,
        error: `API error: ${response.status} ${response.statusText}`,
      };
    }

    return {
      success: true,
      models: [
        "claude-3-5-sonnet-20241022",
        "claude-3-haiku-20240307",
        "claude-3-opus-20240229",
      ],
      quotaInfo: {
        totalLimit: null,
        used: null,
        remaining: null,
        resetDate: null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Test Gemini API key by making a minimal API call
 */
async function testGeminiKey(apiKey: string): Promise<{
  success: boolean;
  error?: string;
  quotaInfo?: any;
  models?: string[];
}> {
  // First validate format
  if (apiKey.length < 30 || apiKey.length > 50) {
    return {
      success: false,
      error: "Invalid Gemini API key format",
    };
  }

  try {
    // Test with models endpoint
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 400) {
        return { success: false, error: "Invalid API key format" };
      }
      if (response.status === 403) {
        return {
          success: false,
          error: "API key access denied or quota exceeded",
        };
      }
      if (response.status === 429) {
        return { success: false, error: "Rate limit exceeded" };
      }
      return {
        success: false,
        error: `API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      models:
        data.models?.map((model: any) => model.name?.split("/").pop()) || [],
      quotaInfo: {
        totalLimit: null,
        used: null,
        remaining: null,
        resetDate: null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Test OpenRouter API key by making a minimal API call
 */
async function testOpenRouterKey(apiKey: string): Promise<{
  success: boolean;
  error?: string;
  quotaInfo?: any;
  models?: string[];
}> {
  // First validate format
  if (!apiKey.startsWith("sk-or-") || apiKey.length < 20) {
    return {
      success: false,
      error: "Invalid OpenRouter API key format (should start with 'sk-or-')",
    };
  }

  try {
    // Test with models endpoint
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: "Invalid or expired API key" };
      }
      if (response.status === 429) {
        return { success: false, error: "Rate limit exceeded" };
      }
      if (response.status === 402) {
        return { success: false, error: "Insufficient credits" };
      }
      return {
        success: false,
        error: `API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      models: data.data?.map((model: any) => model.id) || [],
      quotaInfo: {
        totalLimit: null,
        used: null,
        remaining: null,
        resetDate: null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Test Groq API key by making a minimal API call
 */
async function testGroqKey(apiKey: string): Promise<{
  success: boolean;
  error?: string;
  quotaInfo?: any;
  models?: string[];
}> {
  // First validate format
  if (!apiKey.startsWith("gsk_") || apiKey.length < 20) {
    return {
      success: false,
      error: "Invalid Groq API key format (should start with 'gsk_')",
    };
  }

  try {
    // Test with models endpoint
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: "Invalid or expired API key" };
      }
      if (response.status === 429) {
        return { success: false, error: "Rate limit exceeded" };
      }
      if (response.status === 403) {
        return { success: false, error: "API key lacks required permissions" };
      }
      return {
        success: false,
        error: `API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      models: data.data?.map((model: any) => model.id) || [],
      quotaInfo: {
        totalLimit: null,
        used: null,
        remaining: null,
        resetDate: null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}
