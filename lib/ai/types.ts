// Shared types for AI providers

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamingChunk {
  content?: string;
  finished?: boolean;
  error?: string;
  tokenCount?: number;
}

export interface StreamingOptions {
  temperature?: number;
  maxTokens?: number;
  userId?: string;
  conversationId?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  maxResponseTokens?: number;
  contextWindow: number;
  personality: string;
  description: string;
  visualConfig: {
    color: string;
    avatar: string;
    style: "geometric" | "flowing" | "sharp" | "organic";
  };
  capabilities: {
    streaming: boolean;
    functionCalling?: boolean;
    multiModal?: boolean;
  };
  pricing?: {
    inputCostPer1kTokens: number;
    outputCostPer1kTokens: number;
  };
}

export interface AIProvider {
  name: string;
  displayName: string;
  models: Record<string, AIModel>;
  isConfigured: boolean;
  createStreamingCompletion(
    messages: ChatMessage[],
    modelId: string,
    options?: StreamingOptions
  ): AsyncIterable<StreamingChunk>;
  handleError(error: unknown): string;
  estimateTokens(text: string): number;
  calculateConversationTokens(messages: ChatMessage[]): number;
  testConnection(): Promise<boolean>;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  organizationId?: string;
  projectId?: string;
}

// Union type for all supported model IDs
// Note: Groq models are now loaded dynamically, so we use string for flexibility
export type ModelId = string;

// Provider-specific model IDs for type safety
export type OpenAIModelId = "gpt-4" | "gpt-3.5-turbo";
// Note: GroqModelId is now dynamic - no more hard-coded list!
export type ClaudeModelId =
  | "claude-3-5-sonnet-20241022"
  | "claude-3-haiku-20240307";
export type GeminiModelId = "gemini-1.5-pro" | "gemini-1.5-flash";

// System prompt templates
export interface SystemPromptTemplate {
  role: "system";
  content: string;
}

// Error types
export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: string,
    public statusCode?: number,
    public cause?: unknown
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export class ModelNotFoundError extends AIProviderError {
  constructor(modelId: string, provider: string) {
    super(`Model '${modelId}' not found in provider '${provider}'`, provider);
    this.name = "ModelNotFoundError";
  }
}

export class TokenLimitExceededError extends AIProviderError {
  constructor(tokenCount: number, maxTokens: number, provider: string) {
    super(
      `Token count ${tokenCount} exceeds maximum ${maxTokens} for provider '${provider}'`,
      provider
    );
    this.name = "TokenLimitExceededError";
  }
}

// Response types for API routes
export interface ChatCompletionResponse {
  success: boolean;
  content?: string;
  error?: string;
  tokenCount?: number;
  model?: string;
  provider?: string;
  messageId?: string;
  finished?: boolean;
}
