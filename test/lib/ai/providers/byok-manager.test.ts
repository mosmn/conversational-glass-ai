import { describe, it, expect, vi, beforeEach } from "vitest";
import { BYOKManager } from "@/lib/ai/providers/byok-manager";

// Mock dependencies
vi.mock("@/lib/db/connection");
vi.mock("@/lib/utils/encryption");
vi.mock("@/lib/utils/auth");

describe("BYOKManager", () => {
  const mockUserId = "user_123";
  const mockApiKey = "sk-1234567890abcdef";
  const mockEncryptedKey = "encrypted_key_data";

  beforeEach(() => {
    // Clear cache before each test
    BYOKManager.clearCache();

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe("getUserApiKey", () => {
    it("should return user API key if available", async () => {
      const mockUserKeys = [
        {
          id: "key_123",
          provider: "openai",
          encryptedKey: mockEncryptedKey,
          status: "valid",
          metadata: {},
        },
      ];

      // Mock database query
      const mockDb = await import("@/lib/db/connection");
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockUserKeys),
            }),
          }),
        }),
      });

      // Mock decryption
      const mockEncryption = await import("@/lib/utils/encryption");
      vi.mocked(mockEncryption.decryptApiKey).mockResolvedValue(mockApiKey);

      const result = await BYOKManager.getUserApiKey("openai", mockUserId);

      expect(result).toEqual({
        provider: "openai",
        apiKey: mockApiKey,
        metadata: {},
      });
    });

    it("should return null if no user key found", async () => {
      // Mock empty database result
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

      const result = await BYOKManager.getUserApiKey("openai", mockUserId);

      expect(result).toBeNull();
    });

    it("should handle authentication error gracefully", async () => {
      // Mock auth failure
      const mockAuth = await import("@/lib/utils/auth");
      vi.mocked(mockAuth.getAuthenticatedUserId).mockResolvedValue({
        success: false,
        error: "Not authenticated",
      });

      const result = await BYOKManager.getUserApiKey("openai");

      expect(result).toBeNull();
    });

    it("should use cache for repeated requests", async () => {
      const mockUserKeys = [
        {
          id: "key_123",
          provider: "openai",
          encryptedKey: mockEncryptedKey,
          status: "valid",
          metadata: {},
        },
      ];

      const mockDb = await import("@/lib/db/connection");
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockUserKeys),
            }),
          }),
        }),
      });

      const mockEncryption = await import("@/lib/utils/encryption");
      vi.mocked(mockEncryption.decryptApiKey).mockResolvedValue(mockApiKey);

      // First call
      await BYOKManager.getUserApiKey("openai", mockUserId);

      // Second call should use cache
      await BYOKManager.getUserApiKey("openai", mockUserId);

      // Database should only be called once
      expect(mockDb.db.select).toHaveBeenCalledTimes(1);
    });
  });

  describe("getApiKeyWithFallback", () => {
    it("should return user key when available", async () => {
      vi.spyOn(BYOKManager, "getUserApiKey").mockResolvedValue({
        provider: "openai",
        apiKey: mockApiKey,
        metadata: {},
      });

      const result = await BYOKManager.getApiKeyWithFallback(
        "openai",
        "OPENAI_API_KEY",
        mockUserId
      );

      expect(result).toEqual({
        apiKey: mockApiKey,
        isUserKey: true,
        metadata: {},
      });
    });

    it("should fallback to environment variable when no user key", async () => {
      const envApiKey = "sk-env-key-123";
      process.env.OPENAI_API_KEY = envApiKey;

      vi.spyOn(BYOKManager, "getUserApiKey").mockResolvedValue(null);

      const result = await BYOKManager.getApiKeyWithFallback(
        "openai",
        "OPENAI_API_KEY",
        mockUserId
      );

      expect(result).toEqual({
        apiKey: envApiKey,
        isUserKey: false,
      });
    });

    it("should return null when neither user key nor env var available", async () => {
      delete process.env.OPENAI_API_KEY;
      vi.spyOn(BYOKManager, "getUserApiKey").mockResolvedValue(null);

      const result = await BYOKManager.getApiKeyWithFallback(
        "openai",
        "OPENAI_API_KEY",
        mockUserId
      );

      expect(result).toBeNull();
    });
  });

  describe("hasValidKey", () => {
    it("should return true when user has valid key", async () => {
      vi.spyOn(BYOKManager, "getUserApiKey").mockResolvedValue({
        provider: "openai",
        apiKey: mockApiKey,
        metadata: {},
      });

      const result = await BYOKManager.hasValidKey("openai", mockUserId);

      expect(result).toBe(true);
    });

    it("should return false when user has no valid key", async () => {
      vi.spyOn(BYOKManager, "getUserApiKey").mockResolvedValue(null);

      const result = await BYOKManager.hasValidKey("openai", mockUserId);

      expect(result).toBe(false);
    });
  });

  describe("getUserKeys", () => {
    it("should return all user keys with status", async () => {
      const mockKeys = [
        { provider: "openai", status: "valid" },
        { provider: "claude", status: "invalid" },
        { provider: "gemini", status: "pending" },
      ];

      const mockDb = await import("@/lib/db/connection");
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockKeys),
        }),
      });

      const mockAuth = await import("@/lib/utils/auth");
      vi.mocked(mockAuth.getAuthenticatedUserId).mockResolvedValue({
        success: true,
        userId: mockUserId,
      });

      const result = await BYOKManager.getUserKeys();

      expect(result).toEqual([
        { provider: "openai", status: "valid", hasValidKey: true },
        { provider: "claude", status: "invalid", hasValidKey: false },
        { provider: "gemini", status: "pending", hasValidKey: false },
      ]);
    });

    it("should prioritize valid status over other statuses", async () => {
      const mockKeys = [
        { provider: "openai", status: "invalid" },
        { provider: "openai", status: "valid" },
        { provider: "openai", status: "pending" },
      ];

      const mockDb = await import("@/lib/db/connection");
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockKeys),
        }),
      });

      const mockAuth = await import("@/lib/utils/auth");
      vi.mocked(mockAuth.getAuthenticatedUserId).mockResolvedValue({
        success: true,
        userId: mockUserId,
      });

      const result = await BYOKManager.getUserKeys();

      expect(result).toEqual([
        { provider: "openai", status: "valid", hasValidKey: true },
      ]);
    });
  });

  describe("clearCache", () => {
    it("should clear all cache when no parameters provided", () => {
      // Add some items to cache first
      BYOKManager["setCachedKey"]("user1:openai", {
        provider: "openai",
        apiKey: "test",
        metadata: {},
      });

      BYOKManager.clearCache();

      // Verify cache is empty
      expect(BYOKManager["getCachedKey"]("user1:openai")).toBeNull();
    });

    it("should clear cache for specific user and provider", () => {
      // Add items to cache
      BYOKManager["setCachedKey"]("user1:openai", {
        provider: "openai",
        apiKey: "test1",
        metadata: {},
      });
      BYOKManager["setCachedKey"]("user1:claude", {
        provider: "claude",
        apiKey: "test2",
        metadata: {},
      });

      BYOKManager.clearCache("user1", "openai");

      // Verify only specific key is cleared
      expect(BYOKManager["getCachedKey"]("user1:openai")).toBeNull();
      expect(BYOKManager["getCachedKey"]("user1:claude")).not.toBeNull();
    });

    it("should clear all cache for specific user", () => {
      // Add items to cache
      BYOKManager["setCachedKey"]("user1:openai", {
        provider: "openai",
        apiKey: "test1",
        metadata: {},
      });
      BYOKManager["setCachedKey"]("user2:openai", {
        provider: "openai",
        apiKey: "test2",
        metadata: {},
      });

      BYOKManager.clearCache("user1");

      // Verify only user1 keys are cleared
      expect(BYOKManager["getCachedKey"]("user1:openai")).toBeNull();
      expect(BYOKManager["getCachedKey"]("user2:openai")).not.toBeNull();
    });
  });
});
