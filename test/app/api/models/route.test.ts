import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/models/route";

// Mock the providers module
vi.mock("@/lib/ai/providers", () => ({
  getAllModels: vi.fn(),
  getProviderStatus: vi.fn(),
  getRecommendedModels: vi.fn(),
}));

describe("Models API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/models", () => {
    it("should return models grouped by provider with proper structure", async () => {
      // Mock sample models from different providers
      const mockModels = [
        {
          id: "gpt-4",
          name: "GPT-4 Turbo",
          provider: "openai",
          description: "Advanced AI model",
          personality: "analytical",
          contextWindow: 128000,
          maxResponseTokens: 4096,
          capabilities: {
            streaming: true,
            functionCalling: true,
            multiModal: false,
          },
          pricing: {
            inputCostPer1kTokens: 0.01,
            outputCostPer1kTokens: 0.03,
          },
          visualConfig: {
            color: "from-blue-500 to-cyan-500",
            icon: "🧠",
            gradient: "linear-gradient(135deg, #3b82f6, #06b6d4)",
          },
        },
        {
          id: "claude-3-5-sonnet-20241022",
          name: "Claude 3.5 Sonnet",
          provider: "claude",
          description: "Thoughtful AI assistant",
          personality: "thoughtful",
          contextWindow: 200000,
          maxResponseTokens: 4096,
          capabilities: {
            streaming: true,
            functionCalling: true,
            multiModal: true,
          },
          pricing: {
            inputCostPer1kTokens: 0.003,
            outputCostPer1kTokens: 0.015,
          },
          visualConfig: {
            color: "from-orange-500 to-red-500",
            icon: "🧩",
            gradient: "linear-gradient(135deg, #f97316, #ef4444)",
          },
        },
        {
          id: "llama-3.1-70b-versatile",
          name: "Llama 3.1 70B Versatile",
          provider: "groq",
          description: "Ultra-fast inference",
          personality: "lightning-fast",
          contextWindow: 32768,
          maxResponseTokens: 4096,
          capabilities: {
            streaming: true,
            functionCalling: false,
            multiModal: false,
          },
          pricing: {
            inputCostPer1kTokens: 0.0009,
            outputCostPer1kTokens: 0.0009,
          },
          visualConfig: {
            color: "from-yellow-500 to-orange-500",
            icon: "⚡",
            gradient: "linear-gradient(135deg, #eab308, #f97316)",
          },
        },
        {
          id: "gemini-1.5-pro",
          name: "Gemini 1.5 Pro",
          provider: "gemini",
          description: "Multimodal AI",
          personality: "futuristic-innovator",
          contextWindow: 2097152,
          maxResponseTokens: 8192,
          capabilities: {
            streaming: true,
            functionCalling: true,
            multiModal: true,
          },
          pricing: {
            inputCostPer1kTokens: 0.00125,
            outputCostPer1kTokens: 0.00375,
          },
          visualConfig: {
            color: "from-blue-400 to-purple-500",
            icon: "🔍",
            gradient: "linear-gradient(135deg, #60a5fa, #a855f7)",
          },
        },
      ];

      const mockProviderStatus = {
        total: 4,
        configured: 4,
        available: 4,
        models: 4,
        providers: {
          openai: { configured: true, modelCount: 1 },
          claude: { configured: true, modelCount: 1 },
          groq: { configured: true, modelCount: 1 },
          gemini: { configured: true, modelCount: 1 },
        },
      };

      const mockRecommendedModels = {
        default: mockModels[0],
        fastest: mockModels[2],
        smartest: mockModels[1],
        cheapest: mockModels[2],
        balanced: mockModels[0],
      };

      // Mock the provider functions
      const { getAllModels, getProviderStatus, getRecommendedModels } =
        await import("@/lib/ai/providers");
      vi.mocked(getAllModels).mockResolvedValue(mockModels);
      vi.mocked(getProviderStatus).mockResolvedValue(mockProviderStatus);
      vi.mocked(getRecommendedModels).mockResolvedValue(mockRecommendedModels);

      // Create request
      const request = new NextRequest("http://localhost:3000/api/models");

      // Execute the API route
      const response = await GET(request);
      const data = await response.json();

      // Verify response structure
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("models");
      expect(data).toHaveProperty("modelsByProvider");
      expect(data).toHaveProperty("providerStatus");
      expect(data).toHaveProperty("recommendations");
      expect(data).toHaveProperty("statistics");

      // Verify models array
      expect(data.models).toHaveLength(4);
      expect(data.models[0]).toMatchObject({
        id: "gpt-4",
        name: "GPT-4 Turbo",
        provider: "openai",
        isRecommended: expect.any(Boolean),
        isNew: expect.any(Boolean),
        performance: {
          speed: expect.stringMatching(/^(fast|medium|slow)$/),
          capacity: expect.stringMatching(/^(high|medium|low)$/),
          efficiency: expect.stringMatching(/^(high|medium|low)$/),
        },
      });

      // Verify modelsByProvider grouping
      expect(data.modelsByProvider).toHaveProperty("openai");
      expect(data.modelsByProvider).toHaveProperty("claude");
      expect(data.modelsByProvider).toHaveProperty("groq");
      expect(data.modelsByProvider).toHaveProperty("gemini");

      expect(data.modelsByProvider.openai).toHaveLength(1);
      expect(data.modelsByProvider.claude).toHaveLength(1);
      expect(data.modelsByProvider.groq).toHaveLength(1);
      expect(data.modelsByProvider.gemini).toHaveLength(1);

      // Verify provider-specific models
      expect(data.modelsByProvider.openai[0]).toMatchObject({
        id: "gpt-4",
        provider: "openai",
      });
      expect(data.modelsByProvider.claude[0]).toMatchObject({
        id: "claude-3-5-sonnet-20241022",
        provider: "claude",
      });
      expect(data.modelsByProvider.groq[0]).toMatchObject({
        id: "llama-3.1-70b-versatile",
        provider: "groq",
      });
      expect(data.modelsByProvider.gemini[0]).toMatchObject({
        id: "gemini-1.5-pro",
        provider: "gemini",
      });

      // Verify recommendations structure
      expect(data.recommendations).toMatchObject({
        default: expect.objectContaining({ id: expect.any(String) }),
        fastest: expect.objectContaining({ id: expect.any(String) }),
        smartest: expect.objectContaining({ id: expect.any(String) }),
        cheapest: expect.objectContaining({ id: expect.any(String) }),
        balanced: expect.objectContaining({ id: expect.any(String) }),
      });

      // Verify statistics
      expect(data.statistics).toMatchObject({
        totalModels: 4,
        totalProviders: 4,
        configuredProviders: 4,
        availableModels: 4,
      });
    });

    it("should handle empty models list gracefully", async () => {
      const { getAllModels, getProviderStatus, getRecommendedModels } =
        await import("@/lib/ai/providers");
      vi.mocked(getAllModels).mockResolvedValue([]);
      vi.mocked(getProviderStatus).mockResolvedValue({
        total: 0,
        configured: 0,
        available: 0,
        models: 0,
        providers: {},
      });
      vi.mocked(getRecommendedModels).mockResolvedValue({
        default: null,
        fastest: null,
        smartest: null,
        cheapest: null,
        balanced: null,
      });

      const request = new NextRequest("http://localhost:3000/api/models");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.models).toHaveLength(0);
      expect(data.modelsByProvider).toEqual({});
      expect(data.statistics.totalModels).toBe(0);
    });

    it("should return error response when providers fail", async () => {
      const { getAllModels } = await import("@/lib/ai/providers");
      vi.mocked(getAllModels).mockRejectedValue(
        new Error("Provider connection failed")
      );

      const request = new NextRequest("http://localhost:3000/api/models");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty("error");
      expect(data.error).toBe("Failed to fetch models");
      expect(data).toHaveProperty("details");
    });

    it("should correctly classify model performance ratings", async () => {
      const mockModels = [
        {
          id: "gpt-3.5-turbo",
          name: "GPT-3.5 Turbo",
          provider: "openai",
          description: "Fast model",
          personality: "balanced",
          contextWindow: 16385,
          capabilities: { streaming: true },
          pricing: {
            inputCostPer1kTokens: 0.0015,
            outputCostPer1kTokens: 0.002,
          },
          visualConfig: { color: "blue", icon: "🤖", gradient: "linear" },
        },
        {
          id: "claude-3-haiku-20240307",
          name: "Claude 3 Haiku",
          provider: "claude",
          description: "Fast claude model",
          personality: "efficient",
          contextWindow: 200000,
          capabilities: { streaming: true },
          pricing: {
            inputCostPer1kTokens: 0.00025,
            outputCostPer1kTokens: 0.00125,
          },
          visualConfig: { color: "orange", icon: "🧩", gradient: "linear" },
        },
        {
          id: "gemini-1.5-flash",
          name: "Gemini 1.5 Flash",
          provider: "gemini",
          description: "Fast gemini model",
          personality: "efficient",
          contextWindow: 1048576,
          capabilities: { streaming: true },
          pricing: {
            inputCostPer1kTokens: 0.000075,
            outputCostPer1kTokens: 0.0003,
          },
          visualConfig: { color: "purple", icon: "🔍", gradient: "linear" },
        },
      ];

      const { getAllModels, getProviderStatus, getRecommendedModels } =
        await import("@/lib/ai/providers");
      vi.mocked(getAllModels).mockResolvedValue(mockModels);
      vi.mocked(getProviderStatus).mockResolvedValue({
        total: 3,
        configured: 3,
        available: 3,
        models: 3,
        providers: {},
      });
      vi.mocked(getRecommendedModels).mockResolvedValue({
        default: mockModels[0],
        fastest: mockModels[0],
        smartest: mockModels[0],
        cheapest: mockModels[0],
        balanced: mockModels[0],
      });

      const request = new NextRequest("http://localhost:3000/api/models");
      const response = await GET(request);
      const data = await response.json();

      // Verify speed ratings
      const gpt35Model = data.models.find((m: any) => m.id === "gpt-3.5-turbo");
      const claudeHaikuModel = data.models.find(
        (m: any) => m.id === "claude-3-haiku-20240307"
      );
      const geminiFlashModel = data.models.find(
        (m: any) => m.id === "gemini-1.5-flash"
      );

      expect(gpt35Model.performance.speed).toBe("fast"); // Contains "3.5"
      expect(claudeHaikuModel.performance.speed).toBe("fast"); // Contains "haiku"
      expect(geminiFlashModel.performance.speed).toBe("fast"); // Contains "flash"

      // Verify efficiency ratings (based on cost)
      expect(geminiFlashModel.performance.efficiency).toBe("high"); // Lowest cost
      expect(claudeHaikuModel.performance.efficiency).toBe("high"); // Low cost
      expect(gpt35Model.performance.efficiency).toBe("medium"); // Medium cost
    });
  });
});
