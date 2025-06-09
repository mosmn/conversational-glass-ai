import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@clerk/nextjs/server");
vi.mock("@/lib/db");
vi.mock("@/lib/ai/providers");

describe("Chat API with BYOK Integration", () => {
  const mockClerkUserId = "user_clerk123";
  const mockInternalUserId = "123e4567-e89b-12d3-a456-426614174000";
  const mockConversationId = "456e7890-e89b-12d3-a456-426614174000";

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock auth
    const mockAuth = vi.mocked(await import("@clerk/nextjs/server"));
    mockAuth.auth.mockResolvedValue({ userId: mockClerkUserId });
  });

  describe("POST /api/chat/send", () => {
    it("should pass correct user context for BYOK", async () => {
      // Mock database queries
      const mockDb = await import("@/lib/db");
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: mockInternalUserId,
                clerkId: mockClerkUserId,
              },
            ]),
          }),
        }),
      });

      // Mock conversation exists
      vi.mocked(mockDb.db.select).mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: mockConversationId,
                userId: mockInternalUserId,
              },
            ]),
          }),
        }),
      });

      // Mock message insertion
      const mockMessageQueries = {
        addMessage: vi.fn().mockResolvedValue({
          id: "msg_123",
          role: "user",
          content: "Hello",
        }),
        getConversationMessages: vi.fn().mockResolvedValue({
          messages: [],
        }),
      };
      vi.mocked(mockDb.MessageQueries) = mockMessageQueries;

      // Mock AI provider
      const mockProviders = await import("@/lib/ai/providers");
      vi.mocked(mockProviders.getModelById).mockResolvedValue({
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        provider: "openai",
      });
      vi.mocked(mockProviders.getProviderForModel).mockReturnValue({
        name: "openai",
      });

      // Mock streaming completion
      const mockStreamingGenerator = async function* () {
        yield { content: "Hello", finished: false, tokenCount: 1 };
        yield { finished: true, tokenCount: 1 };
      };
      vi.mocked(mockProviders.createStreamingCompletion).mockReturnValue(
        mockStreamingGenerator()
      );

      const { POST } = await import("@/app/api/chat/send/route");
      const request = new NextRequest("http://localhost/api/chat/send", {
        method: "POST",
        body: JSON.stringify({
          conversationId: mockConversationId,
          content: "Hello, world!",
          model: "gpt-3.5-turbo",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockProviders.createStreamingCompletion).toHaveBeenCalledWith(
        expect.any(Array),
        "gpt-3.5-turbo",
        expect.objectContaining({
          userId: mockInternalUserId, // Should pass internal user ID for BYOK
          conversationId: mockConversationId,
          clerkUserId: mockClerkUserId, // Also pass Clerk ID for compatibility
        })
      );
    });

    it("should handle provider errors gracefully", async () => {
      // Mock user and conversation setup
      const mockDb = await import("@/lib/db");
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: mockInternalUserId,
                clerkId: mockClerkUserId,
              },
            ]),
          }),
        }),
      });

      const mockMessageQueries = {
        addMessage: vi.fn().mockResolvedValue({
          id: "msg_123",
          role: "user",
          content: "Hello",
        }),
        getConversationMessages: vi.fn().mockResolvedValue({
          messages: [],
        }),
        updateMessage: vi.fn().mockResolvedValue({}),
      };
      vi.mocked(mockDb.MessageQueries) = mockMessageQueries;

      // Mock AI provider with error
      const mockProviders = await import("@/lib/ai/providers");
      vi.mocked(mockProviders.getModelById).mockResolvedValue({
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        provider: "openai",
      });
      vi.mocked(mockProviders.getProviderForModel).mockReturnValue({
        name: "openai",
      });

      // Mock streaming with error (e.g., invalid API key)
      const mockErrorGenerator = async function* () {
        yield {
          error:
            "Invalid OpenAI API key. Please check your API key in Settings > API Keys or verify your OPENAI_API_KEY environment variable.",
          finished: true,
        };
      };
      vi.mocked(mockProviders.createStreamingCompletion).mockReturnValue(
        mockErrorGenerator()
      );

      const { POST } = await import("@/app/api/chat/send/route");
      const request = new NextRequest("http://localhost/api/chat/send", {
        method: "POST",
        body: JSON.stringify({
          conversationId: mockConversationId,
          content: "Hello, world!",
          model: "gpt-3.5-turbo",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);

      // Verify error message contains BYOK guidance
      expect(mockMessageQueries.updateMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          content: expect.stringContaining("Settings > API Keys"),
          metadata: expect.objectContaining({
            error: true,
          }),
        })
      );
    });

    it("should validate required parameters", async () => {
      const { POST } = await import("@/app/api/chat/send/route");
      const request = new NextRequest("http://localhost/api/chat/send", {
        method: "POST",
        body: JSON.stringify({
          // Missing required fields
          conversationId: "invalid-uuid",
          content: "",
          model: "",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should require authentication", async () => {
      const mockAuth = vi.mocked(await import("@clerk/nextjs/server"));
      mockAuth.auth.mockResolvedValue({ userId: null });

      const { POST } = await import("@/app/api/chat/send/route");
      const request = new NextRequest("http://localhost/api/chat/send", {
        method: "POST",
        body: JSON.stringify({
          conversationId: mockConversationId,
          content: "Hello",
          model: "gpt-3.5-turbo",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it("should verify conversation ownership", async () => {
      // Mock user exists but conversation doesn't belong to user
      const mockDb = await import("@/lib/db");
      vi.mocked(mockDb.db.select)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: mockInternalUserId,
                  clerkId: mockClerkUserId,
                },
              ]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]), // Conversation not found
            }),
          }),
        });

      const { POST } = await import("@/app/api/chat/send/route");
      const request = new NextRequest("http://localhost/api/chat/send", {
        method: "POST",
        body: JSON.stringify({
          conversationId: mockConversationId,
          content: "Hello",
          model: "gpt-3.5-turbo",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(404);
    });
  });

  describe("Streaming Response", () => {
    it("should stream AI responses with proper formatting", async () => {
      // Set up mocks for successful streaming
      const mockDb = await import("@/lib/db");
      vi.mocked(mockDb.db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: mockInternalUserId,
                clerkId: mockClerkUserId,
              },
            ]),
          }),
        }),
      });

      const mockMessageQueries = {
        addMessage: vi
          .fn()
          .mockResolvedValueOnce({
            id: "user_msg",
            role: "user",
            content: "Hello",
          })
          .mockResolvedValueOnce({
            id: "assistant_msg",
            role: "assistant",
            content: "",
          }),
        getConversationMessages: vi.fn().mockResolvedValue({ messages: [] }),
        updateMessage: vi.fn().mockResolvedValue({}),
        markStreamingComplete: vi.fn().mockResolvedValue({}),
      };
      vi.mocked(mockDb.MessageQueries) = mockMessageQueries;

      const mockProviders = await import("@/lib/ai/providers");
      vi.mocked(mockProviders.getModelById).mockResolvedValue({
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        provider: "openai",
      });
      vi.mocked(mockProviders.getProviderForModel).mockReturnValue({
        name: "openai",
      });

      const mockStreamingGenerator = async function* () {
        yield { content: "Hello", finished: false, tokenCount: 1 };
        yield { content: " there!", finished: false, tokenCount: 2 };
        yield { finished: true, tokenCount: 3 };
      };
      vi.mocked(mockProviders.createStreamingCompletion).mockReturnValue(
        mockStreamingGenerator()
      );

      const { POST } = await import("@/app/api/chat/send/route");
      const request = new NextRequest("http://localhost/api/chat/send", {
        method: "POST",
        body: JSON.stringify({
          conversationId: mockConversationId,
          content: "Hello",
          model: "gpt-3.5-turbo",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");

      // Verify streaming was properly handled
      expect(mockMessageQueries.markStreamingComplete).toHaveBeenCalled();
    });
  });
});
