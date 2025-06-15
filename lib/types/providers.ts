// Comprehensive type definitions for AI provider message formats
// Replaces all 'any' types with proper TypeScript interfaces

// OpenAI Message Format Types
export interface OpenAIMessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
    detail?: "low" | "high" | "auto";
  };
}

export interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | OpenAIMessageContent[];
  name?: string;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  function_call?: OpenAIFunctionCall;
}

export interface OpenAIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIFunctionCall {
  name: string;
  arguments: string;
}

export interface OpenAICompletionResponse {
  id: string;
  object: "chat.completion" | "chat.completion.chunk";
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIChoice {
  index: number;
  message?: OpenAIMessage;
  delta?: Partial<OpenAIMessage>;
  finish_reason?:
    | "stop"
    | "length"
    | "function_call"
    | "tool_calls"
    | "content_filter";
}

// Gemini Message Format Types
export interface GeminiContent {
  parts: GeminiPart[];
  role?: "user" | "model";
}

export interface GeminiPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string; // base64
  };
  file_data?: {
    mime_type: string;
    file_uri: string;
  };
}

export interface GeminiRequest {
  contents: GeminiContent[];
  system_instruction?: {
    parts: GeminiPart[];
  };
  generation_config?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    candidate_count?: number;
    max_output_tokens?: number;
    stop_sequences?: string[];
  };
  safety_settings?: GeminiSafetySetting[];
}

export interface GeminiSafetySetting {
  category:
    | "HARM_CATEGORY_HARASSMENT"
    | "HARM_CATEGORY_HATE_SPEECH"
    | "HARM_CATEGORY_SEXUALLY_EXPLICIT"
    | "HARM_CATEGORY_DANGEROUS_CONTENT";
  threshold:
    | "BLOCK_NONE"
    | "BLOCK_ONLY_HIGH"
    | "BLOCK_MEDIUM_AND_ABOVE"
    | "BLOCK_LOW_AND_ABOVE";
}

export interface GeminiResponse {
  candidates: GeminiCandidate[];
  usage_metadata?: {
    prompt_token_count: number;
    candidates_token_count: number;
    total_token_count: number;
  };
}

export interface GeminiCandidate {
  content: GeminiContent;
  finish_reason?: "STOP" | "MAX_TOKENS" | "SAFETY" | "RECITATION" | "OTHER";
  safety_ratings?: GeminiSafetyRating[];
  citation_metadata?: {
    citation_sources: {
      start_index: number;
      end_index: number;
      uri: string;
      license: string;
    }[];
  };
}

export interface GeminiSafetyRating {
  category: GeminiSafetySetting["category"];
  probability: "NEGLIGIBLE" | "LOW" | "MEDIUM" | "HIGH";
}

// Claude Message Format Types
export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string | ClaudeContent[];
}

export interface ClaudeContent {
  type: "text" | "image";
  text?: string;
  source?: {
    type: "base64";
    media_type: string;
    data: string;
  };
}

export interface ClaudeRequest {
  model: string;
  messages: ClaudeMessage[];
  system?: string;
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  stream?: boolean;
}

export interface ClaudeResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: ClaudeContent[];
  model: string;
  stop_reason?: "end_turn" | "max_tokens" | "stop_sequence";
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface ClaudeStreamingResponse {
  type:
    | "message_start"
    | "content_block_start"
    | "content_block_delta"
    | "content_block_stop"
    | "message_delta"
    | "message_stop";
  message?: Partial<ClaudeResponse>;
  content_block?: {
    type: "text";
    text: string;
  };
  delta?: {
    type: "text_delta";
    text: string;
  };
  index?: number;
}

// Provider Message Format Union Types
export interface ProviderMessageFormats {
  openai: OpenAIMessage[];
  gemini: GeminiContent[];
  claude: ClaudeMessage[];
  fallback: string;
}

// Search Provider Types
export interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  position: number;
  sitelinks?: {
    title: string;
    link: string;
  }[];
}

export interface SerperResponse {
  searchParameters: {
    q: string;
    type?: string;
    engine?: string;
  };
  organic: SerperSearchResult[];
  knowledgeGraph?: {
    title: string;
    type: string;
    description: string;
    attributes?: Record<string, string>;
  };
  answerBox?: {
    answer: string;
    title: string;
    link: string;
  };
  peopleAlsoAsk?: {
    question: string;
    snippet: string;
    title: string;
    link: string;
  }[];
  relatedSearches?: {
    query: string;
  }[];
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

export interface TavilyResponse {
  query: string;
  follow_up_questions?: string[];
  answer?: string;
  images?: string[];
  results: TavilySearchResult[];
  response_time: number;
}

// Database Query Types
export interface MessageTreeNode {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  parentId?: string | null;
  branchName?: string;
  branchDepth?: number;
  branchOrder?: number;
  createdAt: Date;
  updatedAt: Date;
  children: MessageTreeNode[];
  messageCount: number;
  metadata?: Record<string, unknown>;
}

export interface BranchMetadata {
  branchName: string;
  rootMessageId: string;
  depth: number;
  messageCount: number;
  lastActivity: Date;
  firstMessageId: string | null;
}

// File Processing Types
export interface FileMetadata {
  width?: number;
  height?: number;
  pages?: number;
  wordCount?: number;
  duration?: number;
  hasImages?: boolean;
  author?: string;
  language?: string;
  category?: string;
  readingTime?: number;
}

export interface ProcessedFileData {
  id: string;
  name: string;
  size: number;
  type: string;
  category: "image" | "document" | "text" | "audio" | "video";
  url: string;
  extractedText?: string;
  metadata?: FileMetadata;
  openaiFormat?: OpenAIMessageContent;
  geminiFormat?: GeminiPart;
  claudeFormat?: ClaudeContent;
}

// API Response Types
export interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: string;
  defaultModel: string;
  modelSettings: Record<
    string,
    {
      temperature: number;
      maxTokens: number;
      enabled: boolean;
    }
  >;
  ui: {
    showTokenCounts: boolean;
    showTimestamps: boolean;
    enableSounds: boolean;
    compactMode: boolean;
  };
  privacy: {
    shareUsageData: boolean;
    allowAnalytics: boolean;
  };
}

export interface ApiKeyMetadata {
  name?: string;
  createdAt: Date;
  lastUsed?: Date;
  quotaInfo?: {
    used: number;
    limit: number;
    resetTime?: Date;
  };
  isValid: boolean;
}

export interface StorageMetadata {
  uploadedAt: Date;
  fileSize: number;
  mimeType: string;
  storageType: "local" | "ibm-cos";
  path: string;
  checksum?: string;
}

// Error Types
export interface APIErrorDetails {
  code?: string | number;
  statusCode?: number;
  timestamp: Date;
  requestId?: string;
  retryAfter?: number;
  context?: Record<string, unknown>;
}

export interface ProviderCapabilities {
  streaming: boolean;
  functionCalling: boolean;
  multiModal: boolean;
  maxTokens: number;
  contextWindow: number;
  supportedFeatures: string[];
}

// Cleanup Types
export interface CleanupOperation {
  type: "message" | "file" | "conversation";
  itemId: string;
  reason: string;
  scheduledAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface FilesToDelete {
  fileId: string;
  path: string;
  size: number;
  reason: string;
}

// Storage Statistics
export interface ChatStorageStats {
  totalSize: number;
  messageCount: number;
  fileCount: number;
  oldestEntry: Date;
  newestEntry: Date;
  byType: Record<
    string,
    {
      count: number;
      size: number;
    }
  >;
}

// Voice Processing Types
export interface VoiceTranscription {
  text: string;
  confidence: number;
  language?: string;
  duration: number;
  segments?: {
    start: number;
    end: number;
    text: string;
    confidence: number;
  }[];
}

export interface VoiceSynthesis {
  audioUrl: string;
  format: string;
  duration: number;
  voice: {
    id: string;
    name: string;
    language: string;
    gender: "male" | "female" | "neutral";
  };
}
