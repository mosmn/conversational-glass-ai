import { describe, it, expect, vi, beforeEach } from "vitest";
import { openaiProvider } from "@/lib/ai/providers/openai";
import { BYOKManager } from "@/lib/ai/providers/byok-manager";

// Mock OpenAI SDK
vi.mock("openai", () => {
  const mockOpenAI = vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
    models: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
  }));

  mockOpenAI.APIError = class extends Error {
    constructor(message: string, public status: number) {
      super(message);
      this.name = "APIError";
    }
  };

  return { default: mockOpenAI };
});

// Mock BYOK Manager
vi.mock("@/lib/ai/providers/byok-manager");

describe("OpenAI Provider with BYOK", () => {
  const mockUserId = "user_123";
  const mockApiKey = "sk-1234567890abcdef";
  const mockEnvKey = "sk-env-key-123";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = mockEnvKey;
  });

  describe("Provider Configuration", () => {
    it("should always be configured to allow BYOK", () => {
      expect(openaiProvider.isConfigured).toBe(true);
    });

    it("should have correct provider metadata", () => {
      expect(openaiProvider.name).toBe("openai");
      expect(openaiProvider.displayName).toBe("OpenAI");
      expect(Object.keys(openaiProvider.models)).toContain("gpt-4");
      expect(Object.keys(openaiProvider.models)).toContain("gpt-3.5-turbo");
    });
  });

  describe("API Key Resolution", () => {
    it("should use user API key when available", async () => {
      vi.mocked(BYOKManager.getApiKeyWithFallback).mockResolvedValue({
        apiKey: mockApiKey,
        isUserKey: true,
        metadata: {},
      });

      const OpenAI = (await import("openai")).default;
      const mockInstance = new OpenAI();

      // Trigger client creation by calling a method that uses getOpenAIClient
      await openaiProvider.testConnection(mockUserId);

      expect(BYOKManager.getApiKeyWithFallback).toHaveBeenCalledWith(
        "openai",
        "OPENAI_API_KEY",
        mockUserId
      );
    });

    it("should fallback to environment variable when no user key", async () => {
      vi.mocked(BYOKManager.getApiKeyWithFallback).mockResolvedValue({
        apiKey: mockEnvKey,
        isUserKey: false,
      });

      await openaiProvider.testConnection(mockUserId);

      expect(BYOKManager.getApiKeyWithFallback).toHaveBeenCalledWith(
        "openai",
        "OPENAI_API_KEY",
        mockUserId
      );
    });

    it("should throw error when no API key available", async () => {
      vi.mocked(BYOKManager.getApiKeyWithFallback).mockResolvedValue(null);

      await expect(openaiProvider.testConnection(mockUserId)).rejects.toThrow();
    });
  });

  describe("Client Caching", () => {
    it("should cache clients based on API key and user", async () => {
      vi.mocked(BYOKManager.getApiKeyWithFallback).mockResolvedValue({
        apiKey: mockApiKey,
        isUserKey: true,
        metadata: {},
      });

      // First call
      await openaiProvider.testConnection(mockUserId);

      // Second call with same user
      await openaiProvider.testConnection(mockUserId);

      // OpenAI constructor should only be called once (cached)
      const OpenAI = (await import("openai")).default;
      expect(OpenAI).toHaveBeenCalledTimes(1);
    });

    it("should create separate clients for different users", async () => {
      const userId1 = "user_123";
      const userId2 = "user_456";
      const apiKey1 = "sk-key1";
      const apiKey2 = "sk-key2";

      vi.mocked(BYOKManager.getApiKeyWithFallback)
        .mockResolvedValueOnce({
          apiKey: apiKey1,
          isUserKey: true,
          metadata: {},
        })
        .mockResolvedValueOnce({
          apiKey: apiKey2,
          isUserKey: true,
          metadata: {},
        });

      await openaiProvider.testConnection(userId1);
      await openaiProvider.testConnection(userId2);

      // Should create separate clients
      const OpenAI = (await import("openai")).default;
      expect(OpenAI).toHaveBeenCalledTimes(2);
    });
  });

  describe("Streaming Completion", () => {
    it("should create streaming completion with user context", async () => {
      vi.mocked(BYOKManager.getApiKeyWithFallback).mockResolvedValue({
        apiKey: mockApiKey,
        isUserKey: true,
        metadata: {},
      });

      const OpenAI = (await import("openai")).default;
      const mockInstance = new OpenAI();
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield {
            choices: [
              {
                delta: { content: "Hello" },
                finish_reason: null,
              },
            ],
          };
          yield {
            choices: [
              {
                delta: {},
                finish_reason: "stop",
              },
            ],
          };
        },
      };

      vi.mocked(mockInstance.chat.completions.create).mockResolvedValue(
        mockStream as any
      );

      const messages = [{ role: "user" as const, content: "Hello" }];
      const generator = openaiProvider.createStreamingCompletion(
        messages,
        "gpt-3.5-turbo",
        { userId: mockUserId }
      );

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toEqual({
        content: "Hello",
        finished: false,
        tokenCount: expect.any(Number),
      });
      expect(chunks[1]).toEqual({
        finished: true,
        tokenCount: expect.any(Number),
      });
    });

    it("should handle streaming errors gracefully", async () => {
      vi.mocked(BYOKManager.getApiKeyWithFallback).mockResolvedValue({
        apiKey: mockApiKey,
        isUserKey: true,
        metadata: {},
      });

      const OpenAI = (await import("openai")).default;
      const mockInstance = new OpenAI();

      const apiError = new OpenAI.APIError("Invalid API key", 401);
      vi.mocked(mockInstance.chat.completions.create).mockRejectedValue(
        apiError
      );

      const messages = [{ role: "user" as const, content: "Hello" }];
      const generator = openaiProvider.createStreamingCompletion(
        messages,
        "gpt-3.5-turbo",
        { userId: mockUserId }
      );

      const chunks = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual({
        error: expect.stringContaining("API key"),
        finished: true,
      });
    });
  });

  describe("Error Handling", () => {
    it("should provide helpful error messages for API key issues", () => {
      const OpenAI = (await import("openai")).default;
      const apiError = new OpenAI.APIError("Invalid API key", 401);

      const errorMessage = openaiProvider.handleError(apiError);

      expect(errorMessage).toContain("API key");
      expect(errorMessage).toContain("Settings > API Keys");
    });

    it("should handle different API error types", () => {
      const OpenAI = (await import("openai")).default;

      const rateLimitError = new OpenAI.APIError("Rate limit exceeded", 429);
      expect(openaiProvider.handleError(rateLimitError)).toContain(
        "rate limit"
      );

      const serverError = new OpenAI.APIError("Server error", 500);
      expect(openaiProvider.handleError(serverError)).toContain(
        "temporarily unavailable"
      );
    });
  });

  describe("Test Connection", () => {
    it("should test connection successfully with valid key", async () => {
      vi.mocked(BYOKManager.getApiKeyWithFallback).mockResolvedValue({
        apiKey: mockApiKey,
        isUserKey: true,
        metadata: {},
      });

      const OpenAI = (await import("openai")).default;
      const mockInstance = new OpenAI();
      vi.mocked(mockInstance.models.list).mockResolvedValue({
        data: [],
      } as any);

      const result = await openaiProvider.testConnection(mockUserId);

      expect(result).toBe(true);
      expect(mockInstance.models.list).toHaveBeenCalled();
    });

    it("should return false for connection failures", async () => {
      vi.mocked(BYOKManager.getApiKeyWithFallback).mockResolvedValue({
        apiKey: mockApiKey,
        isUserKey: true,
        metadata: {},
      });

      const OpenAI = (await import("openai")).default;
      const mockInstance = new OpenAI();
      vi.mocked(mockInstance.models.list).mockRejectedValue(
        new Error("Connection failed")
      );

      const result = await openaiProvider.testConnection(mockUserId);

      expect(result).toBe(false);
    });
  });

  describe("Model Management", () => {
    it("should return correct model information", () => {
      const model = openaiProvider.getModel("gpt-4");

      expect(model).toBeDefined();
      expect(model?.name).toBe("GPT-4 Turbo");
      expect(model?.provider).toBe("openai");
    });

    it("should list all available models", () => {
      const models = openaiProvider.listModels();

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((model) => model.provider === "openai")).toBe(true);
    });
  });
});
