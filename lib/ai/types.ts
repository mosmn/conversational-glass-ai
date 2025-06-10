// Shared types for AI providers

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | MessageContent[];
  name?: string;
  function_call?: any;
  tool_calls?: any;
}

export interface StreamingChunk {
  type?: "content" | "done" | "error";
  content?: string;
  finished?: boolean;
  error?: string;
  tokenCount?: number;
  model?: string;
  provider?: string;
}

export interface StreamingOptions {
  temperature?: number;
  maxTokens?: number;
  userId?: string;
  conversationId?: string;
}

// Enhanced file support capabilities
export interface FileCapabilities {
  // Image support
  images: {
    supported: boolean;
    maxFileSize: number; // in MB
    maxDimensions?: {
      width: number;
      height: number;
    };
    supportedFormats: string[]; // ['jpeg', 'png', 'gif', 'webp']
    processingMethod: "vision" | "textExtraction" | "both";
    requiresUrl: boolean; // true for models that need image URLs vs base64
    maxImagesPerMessage: number;
  };

  // Document support (PDFs, DOCs, etc.)
  documents: {
    supported: boolean;
    maxFileSize: number; // in MB
    maxPages?: number;
    supportedFormats: string[]; // ['pdf', 'docx', 'txt', 'md']
    processingMethod: "textExtraction" | "nativeProcessing";
    maxDocumentsPerMessage: number;
    preserveFormatting: boolean; // Whether the model can understand document structure
  };

  // Text files support
  textFiles: {
    supported: boolean;
    maxFileSize: number; // in MB
    supportedFormats: string[]; // ['txt', 'md', 'csv', 'json', 'yaml', 'xml']
    encodingSupport: string[]; // ['utf-8', 'ascii', 'utf-16']
    maxFilesPerMessage: number;
  };

  // Audio support (for future)
  audio: {
    supported: boolean;
    maxFileSize: number;
    maxDuration?: number; // in seconds
    supportedFormats: string[];
    processingMethod: "transcription" | "nativeProcessing";
    maxFilesPerMessage: number;
  };

  // Video support (for future)
  video: {
    supported: boolean;
    maxFileSize: number;
    maxDuration?: number; // in seconds
    supportedFormats: string[];
    processingMethod: "frameExtraction" | "transcription" | "nativeProcessing";
    maxFilesPerMessage: number;
  };

  // Overall file constraints
  overall: {
    maxTotalFileSize: number; // Total MB across all files in one message
    maxFilesPerMessage: number; // Total number of files
    requiresPreprocessing: boolean; // Whether files need to be processed before sending
  };
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
    // Enhanced file support capabilities
    fileSupport: FileCapabilities;
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

// New error type for file capability validation
export class FileCapabilityError extends AIProviderError {
  constructor(
    message: string,
    public fileType: string,
    public modelId: string,
    provider: string
  ) {
    super(message, provider);
    this.name = "FileCapabilityError";
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

// File validation types
export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string; // MIME type
  url: string;
  extractedText?: string;
  thumbnailUrl?: string;
  category: "image" | "document" | "text" | "audio" | "video";
  metadata?: {
    width?: number;
    height?: number;
    pages?: number;
    wordCount?: number;
    duration?: number;
    hasImages?: boolean;
  };
}

export interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  supportedFiles: FileAttachment[];
  unsupportedFiles: FileAttachment[];
  processingMethod: {
    [fileId: string]:
      | "vision"
      | "textExtraction"
      | "nativeProcessing"
      | "transcription"
      | "frameExtraction";
  };
}

// Enhanced multimodal content types
export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image_url" | "image";
  image_url?: {
    url: string;
    detail?: "low" | "high" | "auto";
  };
  // For Gemini format
  image?: {
    data: string; // base64
    mimeType: string;
  };
  // For Claude format
  source?: {
    type: "base64";
    media_type: string;
    data: string;
  };
}

export interface FileContent {
  type: "file";
  file: {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    url: string;
    extractedText?: string;
    category: "image" | "document" | "text" | "audio" | "video";
    metadata?: {
      width?: number;
      height?: number;
      pages?: number;
      wordCount?: number;
    };
  };
}

export type MessageContent = TextContent | ImageContent | FileContent;

// File processing types for provider-specific handling
export interface ProcessedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  category: "image" | "document" | "text" | "audio" | "video";
  url: string;
  extractedText?: string;
  metadata?: {
    width?: number;
    height?: number;
    pages?: number;
    wordCount?: number;
  };
  // Provider-specific processed data
  openaiFormat?: {
    type: "image_url";
    image_url: {
      url: string;
      detail?: "low" | "high" | "auto";
    };
  };
  geminiFormat?: {
    inlineData: {
      data: string; // base64
      mimeType: string;
    };
  };
  claudeFormat?: {
    type: "image";
    source: {
      type: "base64";
      media_type: string;
      data: string;
    };
  };
}

export interface FileProcessingOptions {
  convertToBase64?: boolean;
  includeTextExtraction?: boolean;
  optimizeImages?: boolean;
  maxImageSize?: number; // in bytes
}

export interface FileProcessingResult {
  success: boolean;
  processedFiles: ProcessedFile[];
  errors: string[];
  warnings: string[];
  textFallback?: string; // Combined text for non-multimodal models
}

// Provider-specific message formatting types
export interface ProviderMessageFormat {
  openai: any; // OpenAI message format
  gemini: any; // Gemini content format
  claude: any; // Claude message format
  fallback: string; // Text-only fallback
}
