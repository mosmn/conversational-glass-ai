import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@clerk/nextjs/server");
vi.mock("@/lib/db/connection");
vi.mock("@/lib/utils/encryption");
vi.mock("@/lib/utils/auth");

describe("API Keys Endpoints", () => {
  const mockUserId = "user_test123";
  const mockInternalUserId = "123e4567-e89b-12d3-a456-426614174000";
  const mockApiKey = "sk-1234567890abcdef";
  const mockEncryptedKey = "encrypted_key_data";
  const mockKeyHash = "hash_123";

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock auth
    const mockAuth = vi.mocked(await import("@clerk/nextjs/server"));
    mockAuth.auth.mockResolvedValue({ userId: mockUserId });

    // Mock auth utils
    const mockAuthUtils = await import("@/lib/utils/auth");
    vi.mocked(mockAuthUtils.getAuthenticatedUserId).mockResolvedValue({
      success: true,
      userId: mockInternalUserId,
    });

    // Mock encryption
    const mockEncryption = await import("@/lib/utils/encryption");
    vi.mocked(mockEncryption.encryptApiKey).mockResolvedValue(mockEncryptedKey);
    vi.mocked(mockEncryption.hashApiKey).mockResolvedValue(mockKeyHash);
    vi.mocked(mockEncryption.validateApiKeyFormat).mockReturnValue({
      isValid: true,
    });
    vi.mocked(mockEncryption.maskApiKey).mockReturnValue("sk-****cdef");
  });

  describe("GET /api/user/api-keys", () => {
    it("should return user API keys", async () => {
      const mockKeys = [
        {
          id: "key_123",
          provider: "openai",
          keyName: "My OpenAI Key",
          status: "valid",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastValidated: new Date(),
          metadata: {},
        },
      ];

      const mockDb = await import("@/lib/db/connection");
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockKeys),
          }),
        }),
      });

      const { GET } = await import("@/app/api/user/api-keys/route");
      const request = new NextRequest("http://localhost/api/user/api-keys");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.keys).toHaveLength(1);
      expect(data.keys[0].provider).toBe("openai");
      expect(data.keys[0].maskedKey).toBe("sk-****cdef");
    });

    it("should require authentication", async () => {
      const mockAuth = vi.mocked(await import("@clerk/nextjs/server"));
      mockAuth.auth.mockResolvedValue({ userId: null });

      const { GET } = await import("@/app/api/user/api-keys/route");
      const request = new NextRequest("http://localhost/api/user/api-keys");

      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/user/api-keys", () => {
    it("should create new API key successfully", async () => {
      const mockDb = await import("@/lib/db/connection");
      vi.mocked(mockDb.db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: "key_123",
              provider: "openai",
              keyName: "My OpenAI Key",
              status: "pending",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        }),
      });

      // Mock duplicate check
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // No duplicates
        }),
      });

      const { POST } = await import("@/app/api/user/api-keys/route");
      const request = new NextRequest("http://localhost/api/user/api-keys", {
        method: "POST",
        body: JSON.stringify({
          provider: "openai",
          keyName: "My OpenAI Key",
          apiKey: mockApiKey,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.key.provider).toBe("openai");
    });

    it("should validate API key format", async () => {
      const mockEncryption = await import("@/lib/utils/encryption");
      vi.mocked(mockEncryption.validateApiKeyFormat).mockReturnValue({
        isValid: false,
        error: "Invalid format",
      });

      const { POST } = await import("@/app/api/user/api-keys/route");
      const request = new NextRequest("http://localhost/api/user/api-keys", {
        method: "POST",
        body: JSON.stringify({
          provider: "openai",
          keyName: "My OpenAI Key",
          apiKey: "invalid-key",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid format");
    });

    it("should prevent duplicate API keys", async () => {
      const mockDb = await import("@/lib/db/connection");
      // Mock duplicate found
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: "existing_key" }]),
        }),
      });

      const { POST } = await import("@/app/api/user/api-keys/route");
      const request = new NextRequest("http://localhost/api/user/api-keys", {
        method: "POST",
        body: JSON.stringify({
          provider: "openai",
          keyName: "Duplicate Key",
          apiKey: mockApiKey,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain("already exists");
    });

    it("should validate request data with Zod", async () => {
      const { POST } = await import("@/app/api/user/api-keys/route");
      const request = new NextRequest("http://localhost/api/user/api-keys", {
        method: "POST",
        body: JSON.stringify({
          provider: "invalid_provider",
          keyName: "",
          apiKey: "",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid request data");
    });
  });

  describe("DELETE /api/user/api-keys/[id]", () => {
    it("should delete API key successfully", async () => {
      const keyId = "key_123";

      const mockDb = await import("@/lib/db/connection");
      vi.mocked(mockDb.db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: keyId }]),
      });

      const { DELETE } = await import("@/app/api/user/api-keys/[id]/route");
      const response = await DELETE(
        new NextRequest(`http://localhost/api/user/api-keys/${keyId}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: keyId }) }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should return 404 for non-existent key", async () => {
      const keyId = "non_existent_key";

      const mockDb = await import("@/lib/db/connection");
      vi.mocked(mockDb.db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue([]), // No rows deleted
      });

      const { DELETE } = await import("@/app/api/user/api-keys/[id]/route");
      const response = await DELETE(
        new NextRequest(`http://localhost/api/user/api-keys/${keyId}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: keyId }) }
      );

      expect(response.status).toBe(404);
    });

    it("should validate UUID format", async () => {
      const invalidId = "invalid-uuid";

      const { DELETE } = await import("@/app/api/user/api-keys/[id]/route");
      const response = await DELETE(
        new NextRequest(`http://localhost/api/user/api-keys/${invalidId}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: invalidId }) }
      );

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/user/api-keys/test", () => {
    it("should test existing API key successfully", async () => {
      const keyId = "key_123";

      const mockDb = await import("@/lib/db/connection");
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: keyId,
                provider: "openai",
                encryptedKey: mockEncryptedKey,
              },
            ]),
          }),
        }),
      });

      vi.mocked(mockDb.db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const mockEncryption = await import("@/lib/utils/encryption");
      vi.mocked(mockEncryption.decryptApiKey).mockResolvedValue(mockApiKey);

      const { POST } = await import("@/app/api/user/api-keys/test/route");
      const request = new NextRequest(
        "http://localhost/api/user/api-keys/test",
        {
          method: "POST",
          body: JSON.stringify({ keyId }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.testResult.success).toBe(true);
    });

    it("should test new API key before saving", async () => {
      const { POST } = await import("@/app/api/user/api-keys/test/route");
      const request = new NextRequest(
        "http://localhost/api/user/api-keys/test",
        {
          method: "POST",
          body: JSON.stringify({
            provider: "openai",
            apiKey: mockApiKey,
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.testResult.provider).toBe("openai");
    });

    it("should handle test failures", async () => {
      const { POST } = await import("@/app/api/user/api-keys/test/route");
      const request = new NextRequest(
        "http://localhost/api/user/api-keys/test",
        {
          method: "POST",
          body: JSON.stringify({
            provider: "openai",
            apiKey: "invalid-key-format",
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.testResult.success).toBe(false);
      expect(data.testResult.error).toBeDefined();
    });
  });
});
