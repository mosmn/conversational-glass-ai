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
}

export interface StreamChunk {
  type: "content" | "error" | "finished";
  content?: string;
  finished?: boolean;
  error?: string;
  provider?: string;
  model?: string;
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

  async getConversationMessages(
    conversationId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<{
    messages: Message[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    conversation: Conversation;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());

    const queryString = searchParams.toString();
    return this.fetchWithAuth(
      `/conversations/${conversationId}/messages${
        queryString ? `?${queryString}` : ""
      }`
    );
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
    const response = await fetch(`${this.baseURL}/api/chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
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

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body reader available");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              yield data as StreamChunk;

              if (data.finished || data.type === "error") {
                return;
              }
            } catch (e) {
              console.warn("Failed to parse SSE data:", line);
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
