import { describe, it, expect, vi, beforeEach } from "vitest";
import { BYOKManager } from "@/lib/ai/providers/byok-manager";
import { openaiProvider } from "@/lib/ai/providers/openai";

// Mock all external dependencies
vi.mock("@/lib/db/connection");
vi.mock("@/lib/utils/encryption");
vi.mock("@/lib/utils/auth");
vi.mock("openai");

describe("BYOK Integration Flow", () => {
  const mockUserId = "user_123";
  const mockUserApiKey = "sk-user-key-1234567890abcdef";
  const mockEnvApiKey = "sk-env-key-1234567890abcdef";
  const mockEncryptedKey = "encrypted_user_key";

  beforeEach(() => {
    vi.clearAllMocks();
    BYOKManager.clearCache();

    // Set up environment variable
    process.env.OPENAI_API_KEY = mockEnvApiKey;
  });

  describe("End-to-End BYOK Flow", () => {
    it("should use user API key when available", async () => {
      // 1. Mock user has stored API key
      const mockDb = await import("@/lib/db/connection");
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: "key_123",
                  provider: "openai",
                  encryptedKey: mockEncryptedKey,
                  status: "valid",
                  metadata: {},
                },
              ]),
            }),
          }),
        }),
      });

      // 2. Mock decryption
      const mockEncryption = await import("@/lib/utils/encryption");
      vi.mocked(mockEncryption.decryptApiKey).mockResolvedValue(mockUserApiKey);

      // 3. Mock OpenAI client
      const mockOpenAI = await import("openai");
      const mockClient = {
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue({
              async *[Symbol.asyncIterator]() {
                yield {
                  choices: [
                    {
                      delta: { content: "Hello from user key!" },
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
            }),
          },
        },
        models: {
          list: vi.fn().mockResolvedValue({ data: [] }),
        },
      };
      vi.mocked(mockOpenAI.default).mockImplementation(() => mockClient as any);

      // 4. Test the flow: BYOK Manager → Provider → OpenAI Client

      // First, verify BYOK Manager returns user key
      const keyConfig = await BYOKManager.getApiKeyWithFallback(
        "openai",
        "OPENAI_API_KEY",
        mockUserId
      );
      expect(keyConfig).toEqual({
        apiKey: mockUserApiKey,
        isUserKey: true,
        metadata: {},
      });

      // Then, verify provider uses the user key
      const testResult = await openaiProvider.testConnection(mockUserId);
      expect(testResult).toBe(true);

      // Verify OpenAI was initialized with user's key
      expect(mockOpenAI.default).toHaveBeenCalledWith({
        apiKey: mockUserApiKey,
        organization: process.env.OPENAI_ORG_ID,
        project: process.env.OPENAI_PROJECT_ID,
      });

      // Finally, test streaming with user key
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

      expect(chunks[0]).toEqual({
        content: "Hello from user key!",
        finished: false,
        tokenCount: expect.any(Number),
      });
    });

    it("should fallback to environment key when user has no key", async () => {
      // 1. Mock no user key found
      const mockDb = await import("@/lib/db/connection");
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]), // No user keys
            }),
          }),
        }),
      });

      // 2. Mock OpenAI client
      const mockOpenAI = await import("openai");
      const mockClient = {
        chat: { completions: { create: vi.fn() } },
        models: { list: vi.fn().mockResolvedValue({ data: [] }) },
      };
      vi.mocked(mockOpenAI.default).mockImplementation(() => mockClient as any);

      // 3. Test the fallback flow
      const keyConfig = await BYOKManager.getApiKeyWithFallback(
        "openai",
        "OPENAI_API_KEY",
        mockUserId
      );
      expect(keyConfig).toEqual({
        apiKey: mockEnvApiKey,
        isUserKey: false,
      });

      // Verify provider uses environment key
      await openaiProvider.testConnection(mockUserId);
      expect(mockOpenAI.default).toHaveBeenCalledWith({
        apiKey: mockEnvApiKey,
        organization: process.env.OPENAI_ORG_ID,
        project: process.env.OPENAI_PROJECT_ID,
      });
    });

    it("should fail gracefully when no keys available", async () => {
      // 1. Mock no user key
      const mockDb = await import("@/lib/db/connection");
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      // 2. Remove environment key
      delete process.env.OPENAI_API_KEY;

      // 3. Test failure case
      const keyConfig = await BYOKManager.getApiKeyWithFallback(
        "openai",
        "OPENAI_API_KEY",
        mockUserId
      );
      expect(keyConfig).toBeNull();

      // Provider should fail with helpful error
      await expect(openaiProvider.testConnection(mockUserId)).rejects.toThrow(
        expect.stringMatching(/API key not found.*Settings > API Keys/i)
      );
    });
  });

  describe("Client Caching Behavior", () => {
    it("should cache clients per user and key combination", async () => {
      const user1 = "user_1";
      const user2 = "user_2";
      const key1 = "sk-key1-1234567890abcdef";
      const key2 = "sk-key2-1234567890abcdef";

      // Mock different keys for different users
      const mockDb = await import("@/lib/db/connection");
      vi.mocked(mockDb.db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    provider: "openai",
                    encryptedKey: "encrypted_key1",
                    status: "valid",
                    metadata: {},
                  },
                ]),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    provider: "openai",
                    encryptedKey: "encrypted_key2",
                    status: "valid",
                    metadata: {},
                  },
                ]),
              }),
            }),
          }),
        });

      const mockEncryption = await import("@/lib/utils/encryption");
      vi.mocked(mockEncryption.decryptApiKey)
        .mockResolvedValueOnce(key1)
        .mockResolvedValueOnce(key2);

      const mockOpenAI = await import("openai");
      const mockClient = {
        models: { list: vi.fn().mockResolvedValue({ data: [] }) },
      };
      vi.mocked(mockOpenAI.default).mockImplementation(() => mockClient as any);

      // Test both users
      await openaiProvider.testConnection(user1);
      await openaiProvider.testConnection(user2);

      // Should create separate clients
      expect(mockOpenAI.default).toHaveBeenCalledTimes(2);
      expect(mockOpenAI.default).toHaveBeenNthCalledWith(1, {
        apiKey: key1,
        organization: process.env.OPENAI_ORG_ID,
        project: process.env.OPENAI_PROJECT_ID,
      });
      expect(mockOpenAI.default).toHaveBeenNthCalledWith(2, {
        apiKey: key2,
        organization: process.env.OPENAI_ORG_ID,
        project: process.env.OPENAI_PROJECT_ID,
      });

      // Test caching - second call for user1 should use cached client
      await openaiProvider.testConnection(user1);
      expect(mockOpenAI.default).toHaveBeenCalledTimes(2); // No new client created
    });
  });

  describe("Error Handling", () => {
    it("should provide helpful error messages for API key issues", async () => {
      // Mock user has invalid key
      const mockDb = await import("@/lib/db/connection");
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  provider: "openai",
                  encryptedKey: mockEncryptedKey,
                  status: "valid",
                  metadata: {},
                },
              ]),
            }),
          }),
        }),
      });

      const mockEncryption = await import("@/lib/utils/encryption");
      vi.mocked(mockEncryption.decryptApiKey).mockResolvedValue(
        "sk-invalid-key"
      );

      const mockOpenAI = await import("openai");
      const apiError = new mockOpenAI.default.APIError("Invalid API key", 401);
      vi.mocked(mockOpenAI.default).mockImplementation(() => {
        throw apiError;
      });

      await expect(openaiProvider.testConnection(mockUserId)).rejects.toThrow();

      // Test error message contains BYOK guidance
      const errorMessage = openaiProvider.handleError(apiError);
      expect(errorMessage).toContain("Settings > API Keys");
      expect(errorMessage).toContain("OPENAI_API_KEY environment variable");
    });

    it("should handle decryption failures gracefully", async () => {
      const mockDb = await import("@/lib/db/connection");
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  provider: "openai",
                  encryptedKey: "corrupted_encrypted_key",
                  status: "valid",
                  metadata: {},
                },
              ]),
            }),
          }),
        }),
      });

      const mockEncryption = await import("@/lib/utils/encryption");
      vi.mocked(mockEncryption.decryptApiKey).mockRejectedValue(
        new Error("Decryption failed")
      );

      const result = await BYOKManager.getUserApiKey("openai", mockUserId);
      expect(result).toBeNull();
    });
  });
});
