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

// Claude-specific configuration
const CLAUDE_CONFIG = {
  baseUrl: "https://api.anthropic.com/v1",
  apiVersion: "2023-06-01",
  defaultMaxTokens: 4096,
  defaultTemperature: 0.7,
};

// Claude model definitions with personality and visual styling
const claudeModels: Record<string, AIModel> = {
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
      systemMessage += (systemMessage ? "\n\n" : "") + message.content;
    } else {
      claudeMessages.push({
        role: message.role,
        content: message.content,
      });
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

  const model = claudeModels[modelId];
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
  return messages.reduce(
    (total, msg) => total + estimateTokens(msg.content),
    0
  );
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

// Claude provider implementation
export const claudeProvider: AIProvider = {
  name: "claude",
  displayName: "Anthropic Claude",
  models: claudeModels,
  isConfigured: true, // Always true to allow BYOK - actual key checking happens at runtime
  createStreamingCompletion: createClaudeStreamingCompletion,
  handleError: handleClaudeError,
  estimateTokens,
  calculateConversationTokens,
  testConnection: testClaudeConnection,
};

export default claudeProvider;
