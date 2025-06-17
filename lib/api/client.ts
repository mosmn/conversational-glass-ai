// API Client for Conversational Glass AI
// Handles all backend communication with proper error handling and TypeScript types

import { loggers } from "@/lib/utils/logger";

export interface APIError {
  error: string;
  details?: {
    code?: string | number;
    statusCode?: number;
    timestamp?: Date;
    requestId?: string;
    retryAfter?: number;
    context?: Record<string, unknown>;
  };
  status: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: {
    requestId?: string;
    timestamp?: Date;
    metadata?: Record<string, unknown>;
  };
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  totalMessages: number;
  lastModel: string;
  createdAt: string;
  updatedAt: string;
  isShared?: boolean;
  shareId?: string;
  metadata?: {
    totalMessages: number;
    lastModel: string;
    tags: string[];
    sentiment: "positive" | "neutral" | "negative" | null;
    summary: string | null;
  };
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  timestamp: string;
  tokenCount?: number;
  isEdited?: boolean;
  editedAt?: string;
  error?: string;
  metadata?: {
    attachments?: Array<{
      type: "image" | "pdf" | "text";
      url: string;
      filename: string;
      size: number;
    }>;
    codeBlocks?: Array<{
      language: string;
      code: string;
      startLine: number;
      endLine: number;
    }>;
    streamingComplete?: boolean;
    processingTime?: number;
    regenerated?: boolean;
    provider?: string;
    error?: boolean;
  };
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
  personality: string;
  contextWindow: number;
  maxResponseTokens: number;
  capabilities: {
    functionCalling: boolean;
    multiModal: boolean;
    codeGeneration: boolean;
    // Enhanced file support capabilities
    vision?: boolean;
    pdfs?: boolean;
    search?: boolean;
    streaming?: boolean;
    fileSupport?: {
      images: {
        supported: boolean;
        maxFileSize: number;
        maxDimensions?: { width: number; height: number };
        supportedFormats: string[];
        processingMethod: "vision" | "textExtraction" | "both";
        requiresUrl: boolean;
        maxImagesPerMessage: number;
      };
      documents: {
        supported: boolean;
        maxFileSize: number;
        maxPages?: number;
        supportedFormats: string[];
        processingMethod: "textExtraction" | "nativeProcessing";
        maxDocumentsPerMessage: number;
        preserveFormatting: boolean;
      };
      textFiles: {
        supported: boolean;
        maxFileSize: number;
        supportedFormats: string[];
        encodingSupport: string[];
        maxFilesPerMessage: number;
      };
      audio: {
        supported: boolean;
        maxFileSize: number;
        maxDuration?: number;
        supportedFormats: string[];
        processingMethod: "transcription" | "nativeProcessing";
        maxFilesPerMessage: number;
      };
      video: {
        supported: boolean;
        maxFileSize: number;
        maxDuration?: number;
        supportedFormats: string[];
        processingMethod:
          | "frameExtraction"
          | "transcription"
          | "nativeProcessing";
        maxFilesPerMessage: number;
      };
      overall: {
        maxTotalFileSize: number;
        maxFilesPerMessage: number;
        requiresPreprocessing: boolean;
      };
    };
  };
  pricing: {
    inputCostPer1kTokens: number;
    outputCostPer1kTokens: number;
  };
  performance: {
    speed: "fast" | "medium" | "slow";
    capacity: "high" | "medium" | "low";
    efficiency: "high" | "medium" | "low";
  };
  uiHints: {
    bestFor: string;
    tags: string[];
    tier: "premium" | "standard" | "economy";
  };
  visualConfig: {
    color: string;
    icon: string;
    gradient: string;
  };
  // Enhanced properties added by the API
  isRecommended: boolean;
  isNew: boolean;
  tags: string[];
  tier: "premium" | "standard" | "economy";
  bestUseCase: string;
  isEnabled?: boolean; // User preference for showing this model in selector
}

export interface ModelsResponse {
  models: Model[];
  modelsByProvider: Record<string, Model[]>;
  providerStatus: {
    total: number;
    configured: number;
    available: number;
    models: number;
    providers: Record<
      string,
      {
        name: string;
        configured: boolean;
        modelCount: number;
        status: "active" | "inactive" | "error";
        lastChecked?: Date;
      }
    >;
  };
  recommendations: {
    default: Model;
    fastest: Model;
    smartest: Model;
    cheapest: Model;
    balanced: Model;
  };
  statistics: {
    totalModels: number;
    totalProviders: number;
    configuredProviders: number;
    availableModels: number;
  };
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  model: string;
  displayContent?: string; // Original user content for display (when content is search-enhanced)
  searchResults?: Array<{
    title: string;
    url: string;
    snippet: string;
    publishedDate?: string;
    provider: string;
    score?: number;
    favicon?: string;
  }>; // Search results to store with assistant message
  searchQuery?: string; // Original search query
  searchProvider?: string; // Search provider used
  attachments?: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
    extractedText?: string;
    thumbnailUrl?: string;
    category?: string;
    metadata?: {
      width?: number;
      height?: number;
      pages?: number;
      wordCount?: number;
      hasImages?: boolean;
    };
  }>;
}

export interface StreamChunk {
  type: "content" | "error" | "completed" | "finished";
  content?: string;
  finished?: boolean;
  error?: string;
  provider?: string;
  model?: string;
  messageId?: string;
  userMessageId?: string;
  totalTokens?: number;
  processingTime?: number;
  titleGenerated?: boolean;
  searchResults?: Array<any>;
  searchQuery?: string;
  searchProvider?: string;
}

// Enhanced message sync interfaces
export interface MessagesSyncRequest {
  action: "sync";
  lastSyncTime: string;
}

export interface MessagesSyncResponse {
  newMessages: Message[];
  updatedMessages: Message[];
  lastSyncTimestamp: string;
}

export interface MessagesResponse {
  messages: Message[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    limit: number;
  };
  conversation: Conversation;
  sync: {
    lastMessageTimestamp?: string;
    currentTimestamp: string;
  };
}

class APIClient {
  private baseURL: string;

  constructor() {
    this.baseURL =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXTAUTH_URL || "http://localhost:3000";
  }

  private async fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}/api${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Network error" }));
      throw {
        error: errorData.error || `HTTP ${response.status}`,
        details: errorData.details,
        status: response.status,
      } as APIError;
    }

    return response.json();
  }

  // Conversations API
  async getConversations(params?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    conversations: Conversation[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());

    const queryString = searchParams.toString();
    return this.fetchWithAuth(
      `/conversations${queryString ? `?${queryString}` : ""}`
    );
  }

  async createConversation(data: {
    title?: string;
    model?: string;
    initialMessage?: {
      content: string;
      attachments?: Array<{
        id: string;
        name: string;
        size: number;
        type: string;
        url: string;
        extractedText?: string;
        thumbnailUrl?: string;
        metadata?: {
          width?: number;
          height?: number;
          pages?: number;
          wordCount?: number;
          hasImages?: boolean;
        };
      }>;
    };
  }): Promise<{
    conversation: Conversation;
    warning?: string;
    hasInitialMessage?: boolean;
  }> {
    return this.fetchWithAuth("/conversations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Delete a conversation
  async deleteConversation(conversationId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.fetchWithAuth(`/conversations/${conversationId}`, {
      method: "DELETE",
    });
  }

  // Enhanced message retrieval with cursor-based pagination and real-time sync
  async getConversationMessages(
    conversationId: string,
    params?: {
      limit?: number;
      cursor?: string;
      after?: string; // For real-time sync
      includeMetadata?: boolean;
    }
  ): Promise<MessagesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.after) searchParams.set("after", params.after);
    if (params?.includeMetadata) searchParams.set("includeMetadata", "true");

    const queryString = searchParams.toString();
    return this.fetchWithAuth(
      `/conversations/${conversationId}/messages${
        queryString ? `?${queryString}` : ""
      }`
    );
  }

  // Sync messages for real-time updates
  async syncMessages(
    conversationId: string,
    lastSyncTime: string
  ): Promise<MessagesSyncResponse> {
    return this.fetchWithAuth(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        action: "sync",
        lastSyncTime,
      }),
    });
  }

  // Get new messages after a timestamp (for real-time updates)
  async getMessagesAfter(
    conversationId: string,
    afterTimestamp: string
  ): Promise<MessagesResponse> {
    return this.getConversationMessages(conversationId, {
      after: afterTimestamp,
    });
  }

  // Branching API methods
  async getConversationBranches(conversationId: string) {
    return this.fetchWithAuth(`/conversations/${conversationId}/branches`);
  }

  async createBranch(
    conversationId: string,
    parentMessageId: string,
    branchName: string,
    description?: string
  ) {
    return this.fetchWithAuth(`/conversations/${conversationId}/branches`, {
      method: "POST",
      body: JSON.stringify({
        parentMessageId,
        branchName,
        description,
      }),
    });
  }

  // NEW: Create a branch conversation (new approach)
  async createBranchConversation(
    conversationId: string,
    data: {
      messageId: string;
      branchName: string;
      title: string;
      description?: string;
    }
  ): Promise<{
    success: boolean;
    branchConversation: {
      id: string;
      title: string;
      branchName: string;
      parentConversationId?: string;
      branchPointMessageId?: string;
      createdAt: string;
      model: string;
    };
    message: string;
  }> {
    return this.fetchWithAuth(`/conversations/${conversationId}/branch`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // NEW: Get conversation with branching relationships
  async getConversationWithBranching(conversationId: string) {
    return this.fetchWithAuth(
      `/conversations/${conversationId}?includeBranching=true`
    );
  }

  // NEW: Get hierarchical conversations list for sidebar
  async getConversationsWithBranching(params?: {
    limit?: number;
    includeOrphaned?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.includeOrphaned) searchParams.set("includeOrphaned", "true");

    const query = searchParams.toString();
    return this.fetchWithAuth(
      `/conversations/hierarchy${query ? `?${query}` : ""}`
    );
  }

  // NEW: Delete a branch conversation
  async deleteBranchConversation(conversationId: string) {
    return this.fetchWithAuth(`/conversations/${conversationId}/branch`, {
      method: "DELETE",
    });
  }

  // Models API
  async getModels(): Promise<ModelsResponse> {
    return this.fetchWithAuth<ModelsResponse>("/models");
  }

  // Chat API - Streaming
  async *sendMessageStream(
    data: SendMessageRequest,
    signal?: AbortSignal
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const url = `${this.baseURL}/api/chat/send`;

    // CRITICAL DEBUG: Log the model being sent to API
    loggers.apiRequest("POST", "/chat/send", undefined);
    loggers.aiRequest(
      data.model.split("/")[0] || "unknown",
      data.model,
      undefined
    );

    // Remove null values to avoid validation errors when web search is disabled
    const payload: Record<string, any> = { ...data };
    if (payload.searchResults == null) delete payload.searchResults;
    if (payload.searchQuery == null) delete payload.searchQuery;
    if (payload.searchProvider == null) delete payload.searchProvider;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal, // Add abort signal support
    });

    if (!response.ok) {
      throw {
        error: `HTTP ${response.status}`,
        status: response.status,
      } as APIError;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw {
        error: "No response body",
        status: 500,
      } as APIError;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const chunk = JSON.parse(line.slice(6)) as StreamChunk;
              yield chunk;

              if (
                chunk.finished ||
                chunk.type === "error" ||
                chunk.type === "completed"
              ) {
                return;
              }
            } catch (error) {
              loggers.apiError(
                "POST",
                "/chat/send",
                `Failed to parse chunk: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
              // Continue processing other chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // User Preferences API (placeholder for future implementation)
  async getUserPreferences(): Promise<{
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
  }> {
    return this.fetchWithAuth("/user/preferences");
  }

  async updateUserPreferences(preferences: {
    theme?: "light" | "dark" | "system";
    language?: string;
    defaultModel?: string;
    modelSettings?: Record<
      string,
      {
        temperature?: number;
        maxTokens?: number;
        enabled?: boolean;
      }
    >;
    ui?: {
      showTokenCounts?: boolean;
      showTimestamps?: boolean;
      enableSounds?: boolean;
      compactMode?: boolean;
    };
    privacy?: {
      shareUsageData?: boolean;
      allowAnalytics?: boolean;
    };
  }): Promise<{
    success: boolean;
    preferences: {
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
    };
  }> {
    return this.fetchWithAuth("/user/preferences", {
      method: "PUT",
      body: JSON.stringify(preferences),
    });
  }
}

// Export singleton instance
export const apiClient = new APIClient();
