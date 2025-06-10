// Resumable Streaming Types

export interface ResumableStreamChunk {
  type?: "content" | "done" | "error" | "progress";
  content?: string;
  finished?: boolean;
  error?: string;
  tokenCount?: number;
  model?: string;
  provider?: string;

  // Resumability fields
  chunkIndex?: number; // Sequential chunk number
  totalChunks?: number; // Estimated total chunks (if known)
  streamId?: string; // Unique identifier for this stream
  timestamp?: number; // When this chunk was generated
  checksum?: string; // Hash for integrity verification
  bytesReceived?: number; // Total bytes received so far
}

export interface StreamState {
  streamId: string;
  conversationId: string;
  messageId: string;
  userMessageId?: string;
  content: string; // Current accumulated content
  chunkIndex: number; // Last processed chunk
  totalTokens: number;
  tokensPerSecond: number;
  timeToFirstToken: number;
  elapsedTime: number;
  bytesReceived: number;
  isComplete: boolean;
  isPaused: boolean;
  lastUpdateTime: number;
  model: string;
  provider: string;
  error?: string;
  originalPrompt?: string; // Original user message for context
  startTime: number;
  estimatedCompletion?: number; // Estimated completion percentage
}

export interface StreamProgress {
  phase:
    | "starting"
    | "streaming"
    | "paused"
    | "completing"
    | "error"
    | "resumed";
  chunksReceived: number;
  estimatedTotal?: number;
  tokensPerSecond: number;
  timeToFirstToken: number;
  elapsedTime: number;
  bytesReceived: number;
  percentage?: number; // 0-100 completion percentage
  canPause: boolean;
  canResume: boolean;
  lastChunkTime?: number;
}

export interface StreamRecoveryData {
  streamId: string;
  conversationTitle?: string;
  lastContent: string;
  progress: number; // 0-100
  interruptedAt: number; // timestamp
  model: string;
  provider: string;
  canRecover: boolean;
  errorMessage?: string;
}

export interface ResumeStreamRequest {
  streamId: string;
  fromChunkIndex: number;
  conversationId: string;
  messageId: string;
  model: string;
  lastKnownContent: string;
}

export interface ResumeStreamResponse {
  success: boolean;
  streamId: string;
  resumedFromChunk: number;
  error?: string;
}

// Storage configuration
export interface StreamStorageConfig {
  maxStorageSize: number; // Max localStorage size in bytes
  maxStreamAge: number; // Max age in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
  compressionEnabled: boolean; // Whether to compress stored data
  encryptionEnabled: boolean; // Whether to encrypt stored data
}

// Error types for resumable streaming
export class StreamRecoveryError extends Error {
  constructor(
    message: string,
    public streamId: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = "StreamRecoveryError";
  }
}

export class StreamPersistenceError extends Error {
  constructor(
    message: string,
    public operation: "save" | "load" | "cleanup",
    public cause?: unknown
  ) {
    super(message);
    this.name = "StreamPersistenceError";
  }
}
