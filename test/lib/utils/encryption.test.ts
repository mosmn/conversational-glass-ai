import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  encryptApiKey,
  decryptApiKey,
  hashApiKey,
  validateApiKeyFormat,
  maskApiKey,
} from "@/lib/utils/encryption";

describe("Encryption Utilities", () => {
  const mockUserId = "user_123";
  const mockApiKey = "sk-1234567890abcdef";

  beforeEach(() => {
    // Mock crypto.subtle methods
    vi.mocked(globalThis.crypto.subtle.deriveKey).mockResolvedValue(
      {} as CryptoKey
    );
    vi.mocked(globalThis.crypto.subtle.importKey).mockResolvedValue(
      {} as CryptoKey
    );
    vi.mocked(globalThis.crypto.subtle.encrypt).mockResolvedValue(
      new ArrayBuffer(32)
    );
    vi.mocked(globalThis.crypto.subtle.decrypt).mockResolvedValue(
      new TextEncoder().encode(mockApiKey).buffer
    );
  });

  describe("encryptApiKey", () => {
    it("should encrypt an API key successfully", async () => {
      const result = await encryptApiKey(mockApiKey, mockUserId);

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      expect(globalThis.crypto.subtle.deriveKey).toHaveBeenCalled();
      expect(globalThis.crypto.subtle.encrypt).toHaveBeenCalled();
    });

    it("should throw error for empty API key", async () => {
      await expect(encryptApiKey("", mockUserId)).rejects.toThrow();
    });

    it("should throw error for empty user ID", async () => {
      await expect(encryptApiKey(mockApiKey, "")).rejects.toThrow();
    });
  });

  describe("decryptApiKey", () => {
    it("should decrypt an encrypted API key successfully", async () => {
      const encryptedKey = "mock_encrypted_key";

      const result = await decryptApiKey(encryptedKey, mockUserId);

      expect(result).toBe(mockApiKey);
      expect(globalThis.crypto.subtle.deriveKey).toHaveBeenCalled();
      expect(globalThis.crypto.subtle.decrypt).toHaveBeenCalled();
    });

    it("should throw error for invalid encrypted key", async () => {
      vi.mocked(globalThis.crypto.subtle.decrypt).mockRejectedValue(
        new Error("Decryption failed")
      );

      await expect(decryptApiKey("invalid_key", mockUserId)).rejects.toThrow();
    });
  });

  describe("hashApiKey", () => {
    it("should generate consistent hash for same input", async () => {
      const hash1 = await hashApiKey(mockApiKey);
      const hash2 = await hashApiKey(mockApiKey);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe("string");
      expect(hash1.length).toBe(64); // SHA-256 hex string length
    });

    it("should generate different hashes for different inputs", async () => {
      const hash1 = await hashApiKey("sk-key1");
      const hash2 = await hashApiKey("sk-key2");

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("validateApiKeyFormat", () => {
    it("should validate OpenAI API key format", () => {
      const result = validateApiKeyFormat("sk-1234567890abcdef", "openai");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject invalid OpenAI API key format", () => {
      const result = validateApiKeyFormat("invalid-key", "openai");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("should start with");
    });

    it("should validate Claude API key format", () => {
      const result = validateApiKeyFormat("sk-ant-1234567890abcdef", "claude");
      expect(result.isValid).toBe(true);
    });

    it("should validate Gemini API key format", () => {
      const result = validateApiKeyFormat("A".repeat(39), "gemini");
      expect(result.isValid).toBe(true);
    });

    it("should validate OpenRouter API key format", () => {
      const result = validateApiKeyFormat(
        "sk-or-1234567890abcdef",
        "openrouter"
      );
      expect(result.isValid).toBe(true);
    });

    it("should validate Groq API key format", () => {
      const result = validateApiKeyFormat("gsk_1234567890abcdef", "groq");
      expect(result.isValid).toBe(true);
    });

    it("should reject keys that are too short", () => {
      const result = validateApiKeyFormat("sk-123", "openai");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("too short");
    });

    it("should reject keys with whitespace", () => {
      const result = validateApiKeyFormat("sk-123 456", "openai");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("whitespace");
    });
  });

  describe("maskApiKey", () => {
    it("should mask API key for display", () => {
      const masked = maskApiKey("sk-1234567890abcdef");
      expect(masked).toBe("sk-****cdef");
    });

    it("should handle short keys", () => {
      const masked = maskApiKey("sk-123");
      expect(masked).toBe("sk-***");
    });

    it("should handle very short keys", () => {
      const masked = maskApiKey("sk");
      expect(masked).toBe("**");
    });
  });
});
