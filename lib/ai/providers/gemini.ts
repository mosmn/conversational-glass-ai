import {
  AIProvider,
  AIModel,
  ChatMessage,
  StreamingChunk,
  StreamingOptions,
  AIProviderError,
} from "../types";
import { z } from "zod";

// Environment validation
const geminiEnvSchema = z.object({
  GOOGLE_AI_API_KEY: z.string().min(1, "Google AI API key is required"),
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

// Gemini model definitions with personality and visual styling
const geminiModels: Record<string, AIModel> = {
  "gemini-1.5-pro": {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "gemini",
    maxTokens: 2097152, // 2M context window
    maxResponseTokens: 8192,
    contextWindow: 2097152,
    personality:
      "Intelligent and versatile, excellent at reasoning, coding, and multimodal tasks",
    description:
      "Most capable Gemini model with massive context window and multimodal capabilities",
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
  "gemini-1.5-flash": {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "gemini",
    maxTokens: 1048576, // 1M context window
    maxResponseTokens: 8192,
    contextWindow: 1048576,
    personality:
      "Fast and efficient, optimized for speed while maintaining quality",
    description:
      "Faster Gemini model with large context window, optimized for high-frequency use cases",
    visualConfig: {
      color: "from-yellow-400 to-orange-500",
      avatar: "⚡",
      style: "sharp" as const,
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
};

// Convert messages to Gemini format
function formatMessagesForGemini(messages: ChatMessage[]): {
  contents: any[];
  systemInstruction?: any;
} {
  const contents: any[] = [];
  let systemInstruction: string = "";

  for (const message of messages) {
    if (message.role === "system") {
      systemInstruction += (systemInstruction ? "\n\n" : "") + message.content;
    } else {
      contents.push({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      });
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
  options: StreamingOptions = {}
): AsyncIterable<StreamingChunk> {
  if (!env) {
    throw new AIProviderError(
      "Gemini provider not configured. Please set GOOGLE_AI_API_KEY environment variable.",
      "gemini"
    );
  }

  const model = geminiModels[modelId];
  if (!model) {
    throw new AIProviderError(
      `Model ${modelId} not found in Gemini provider`,
      "gemini"
    );
  }

  const { contents, systemInstruction } = formatMessagesForGemini(messages);

  const requestBody = {
    contents,
    systemInstruction,
    generationConfig: {
      maxOutputTokens: Math.min(
        options.maxTokens || GEMINI_CONFIG.defaultMaxTokens,
        model.maxResponseTokens || 8192
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

  const url = `${GEMINI_CONFIG.baseUrl}/models/${modelId}:streamGenerateContent?key=${env.GOOGLE_AI_API_KEY}`;

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
  return messages.reduce(
    (total, msg) => total + estimateTokens(msg.content),
    0
  );
}

// Test connection
async function testGeminiConnection(): Promise<boolean> {
  if (!env) return false;

  try {
    const url = `${GEMINI_CONFIG.baseUrl}/models/gemini-1.5-flash:generateContent?key=${env.GOOGLE_AI_API_KEY}`;

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

// Gemini provider implementation
export const geminiProvider: AIProvider = {
  name: "gemini",
  displayName: "Google Gemini",
  models: geminiModels,
  isConfigured: !!env,
  createStreamingCompletion: createGeminiStreamingCompletion,
  handleError: handleGeminiError,
  estimateTokens,
  calculateConversationTokens,
  testConnection: testGeminiConnection,
};

export default geminiProvider;
