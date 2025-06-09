// API Client for Conversational Glass AI
// Handles all backend communication with proper error handling and TypeScript types

export interface APIError {
  error: string;
  details?: any;
  status: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
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
}

export interface ModelsResponse {
  models: Model[];
  modelsByProvider: Record<string, Model[]>;
  providerStatus: {
    total: number;
    configured: number;
    available: number;
    models: number;
    providers: Record<string, any>;
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

  async createConversation(data: { title?: string; model?: string }): Promise<{
    conversation: Conversation;
  }> {
    return this.fetchWithAuth("/conversations", {
      method: "POST",
      body: JSON.stringify(data),
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

  // Load more messages using cursor pagination
  async loadMoreMessages(
    conversationId: string,
    cursor: string,
    limit = 50
  ): Promise<MessagesResponse> {
    return this.getConversationMessages(conversationId, {
      cursor,
      limit,
    });
  }

  // Models API
  async getModels(): Promise<ModelsResponse> {
    const response = await this.fetchWithAuth<APIResponse<ModelsResponse>>(
      "/models"
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to fetch models");
    }
    return response.data;
  }

  // Chat API - Streaming
  async *sendMessageStream(
    data: SendMessageRequest
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const url = `${this.baseURL}/api/chat/send`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
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
              console.error("Failed to parse chunk:", error);
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
  async getUserPreferences(): Promise<any> {
    return this.fetchWithAuth("/user/preferences");
  }

  async updateUserPreferences(preferences: any): Promise<any> {
    return this.fetchWithAuth("/user/preferences", {
      method: "PUT",
      body: JSON.stringify(preferences),
    });
  }
}

// Export singleton instance
export const apiClient = new APIClient();
