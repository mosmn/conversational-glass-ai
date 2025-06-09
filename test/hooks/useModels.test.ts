import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useModels } from "@/hooks/useModels";
import { apiClient } from "@/lib/api/client";

// Mock the API client
vi.mock("@/lib/api/client", () => ({
  apiClient: {
    getModels: vi.fn(),
  },
}));

describe("useModels Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch and provide models with provider grouping", async () => {
    const mockModelsResponse = {
      models: [
        {
          id: "gpt-4",
          name: "GPT-4 Turbo",
          provider: "openai",
          description: "Advanced AI model",
          personality: "analytical",
          contextWindow: 128000,
          maxResponseTokens: 4096,
          capabilities: {
            functionCalling: true,
            multiModal: false,
            codeGeneration: true,
          },
          pricing: { inputCostPer1kTokens: 0.01, outputCostPer1kTokens: 0.03 },
          performance: { speed: "medium", capacity: "high", efficiency: "low" },
          uiHints: {
            bestFor: "Complex reasoning",
            tags: ["reliable"],
            tier: "premium",
          },
          visualConfig: { color: "blue", icon: "🧠", gradient: "linear" },
          isRecommended: true,
          isNew: false,
          tags: ["reliable", "function-calling"],
          tier: "premium",
          bestUseCase: "Complex reasoning tasks",
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
            functionCalling: true,
            multiModal: true,
            codeGeneration: true,
          },
          pricing: {
            inputCostPer1kTokens: 0.003,
            outputCostPer1kTokens: 0.015,
          },
          performance: {
            speed: "medium",
            capacity: "high",
            efficiency: "medium",
          },
          uiHints: {
            bestFor: "Creative writing",
            tags: ["safe"],
            tier: "premium",
          },
          visualConfig: { color: "orange", icon: "🧩", gradient: "linear" },
          isRecommended: true,
          isNew: false,
          tags: ["safe", "multi-modal"],
          tier: "premium",
          bestUseCase: "Creative and analytical tasks",
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
            functionCalling: false,
            multiModal: false,
            codeGeneration: false,
          },
          pricing: {
            inputCostPer1kTokens: 0.0009,
            outputCostPer1kTokens: 0.0009,
          },
          performance: {
            speed: "fast",
            capacity: "medium",
            efficiency: "high",
          },
          uiHints: {
            bestFor: "Quick responses",
            tags: ["ultra-fast", "large"],
            tier: "premium",
          },
          visualConfig: { color: "yellow", icon: "⚡", gradient: "linear" },
          isRecommended: false,
          isNew: false,
          tags: ["ultra-fast", "large"],
          tier: "premium",
          bestUseCase: "Quick responses, simple queries",
        },
      ],
      modelsByProvider: {
        openai: [
          {
            id: "gpt-4",
            name: "GPT-4 Turbo",
            provider: "openai",
            description: "Advanced AI model",
            personality: "analytical",
            contextWindow: 128000,
            maxResponseTokens: 4096,
            capabilities: {
              functionCalling: true,
              multiModal: false,
              codeGeneration: true,
            },
            pricing: {
              inputCostPer1kTokens: 0.01,
              outputCostPer1kTokens: 0.03,
            },
            performance: {
              speed: "medium",
              capacity: "high",
              efficiency: "low",
            },
            uiHints: {
              bestFor: "Complex reasoning",
              tags: ["reliable"],
              tier: "premium",
            },
            visualConfig: { color: "blue", icon: "🧠", gradient: "linear" },
            isRecommended: true,
            isNew: false,
            tags: ["reliable", "function-calling"],
            tier: "premium",
            bestUseCase: "Complex reasoning tasks",
          },
        ],
        claude: [
          {
            id: "claude-3-5-sonnet-20241022",
            name: "Claude 3.5 Sonnet",
            provider: "claude",
            description: "Thoughtful AI assistant",
            personality: "thoughtful",
            contextWindow: 200000,
            maxResponseTokens: 4096,
            capabilities: {
              functionCalling: true,
              multiModal: true,
              codeGeneration: true,
            },
            pricing: {
              inputCostPer1kTokens: 0.003,
              outputCostPer1kTokens: 0.015,
            },
            performance: {
              speed: "medium",
              capacity: "high",
              efficiency: "medium",
            },
            uiHints: {
              bestFor: "Creative writing",
              tags: ["safe"],
              tier: "premium",
            },
            visualConfig: { color: "orange", icon: "🧩", gradient: "linear" },
            isRecommended: true,
            isNew: false,
            tags: ["safe", "multi-modal"],
            tier: "premium",
            bestUseCase: "Creative and analytical tasks",
          },
        ],
        groq: [
          {
            id: "llama-3.1-70b-versatile",
            name: "Llama 3.1 70B Versatile",
            provider: "groq",
            description: "Ultra-fast inference",
            personality: "lightning-fast",
            contextWindow: 32768,
            maxResponseTokens: 4096,
            capabilities: {
              functionCalling: false,
              multiModal: false,
              codeGeneration: false,
            },
            pricing: {
              inputCostPer1kTokens: 0.0009,
              outputCostPer1kTokens: 0.0009,
            },
            performance: {
              speed: "fast",
              capacity: "medium",
              efficiency: "high",
            },
            uiHints: {
              bestFor: "Quick responses",
              tags: ["ultra-fast", "large"],
              tier: "premium",
            },
            visualConfig: { color: "yellow", icon: "⚡", gradient: "linear" },
            isRecommended: false,
            isNew: false,
            tags: ["ultra-fast", "large"],
            tier: "premium",
            bestUseCase: "Quick responses, simple queries",
          },
        ],
      },
      providerStatus: {
        total: 3,
        configured: 3,
        available: 3,
        models: 3,
        providers: {
          openai: { configured: true, modelCount: 1 },
          claude: { configured: true, modelCount: 1 },
          groq: { configured: true, modelCount: 1 },
        },
      },
      recommendations: {
        default: { id: "gpt-4", name: "GPT-4 Turbo" },
        fastest: {
          id: "llama-3.1-70b-versatile",
          name: "Llama 3.1 70B Versatile",
        },
        smartest: {
          id: "claude-3-5-sonnet-20241022",
          name: "Claude 3.5 Sonnet",
        },
        cheapest: {
          id: "llama-3.1-70b-versatile",
          name: "Llama 3.1 70B Versatile",
        },
        balanced: { id: "gpt-4", name: "GPT-4 Turbo" },
      },
      statistics: {
        totalModels: 3,
        totalProviders: 3,
        configuredProviders: 3,
        availableModels: 3,
      },
    };

    vi.mocked(apiClient.getModels).mockResolvedValue(mockModelsResponse);

    const { result } = renderHook(() => useModels());

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.models).toEqual([]);
    expect(result.current.error).toBe(null);

    // Wait for the data to load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Verify models are loaded
    expect(result.current.models).toHaveLength(3);
    expect(result.current.error).toBe(null);

    // Verify modelsByProvider is properly structured
    expect(result.current.modelsByProvider).toHaveProperty("openai");
    expect(result.current.modelsByProvider).toHaveProperty("claude");
    expect(result.current.modelsByProvider).toHaveProperty("groq");

    expect(result.current.modelsByProvider.openai).toHaveLength(1);
    expect(result.current.modelsByProvider.claude).toHaveLength(1);
    expect(result.current.modelsByProvider.groq).toHaveLength(1);

    // Verify specific provider models
    expect(result.current.modelsByProvider.openai[0]).toMatchObject({
      id: "gpt-4",
      provider: "openai",
    });
    expect(result.current.modelsByProvider.claude[0]).toMatchObject({
      id: "claude-3-5-sonnet-20241022",
      provider: "claude",
    });
    expect(result.current.modelsByProvider.groq[0]).toMatchObject({
      id: "llama-3.1-70b-versatile",
      provider: "groq",
    });

    // Verify recommendations
    expect(result.current.recommendations).toEqual(
      mockModelsResponse.recommendations
    );

    // Verify statistics
    expect(result.current.statistics).toEqual(mockModelsResponse.statistics);
  });

  it("should handle API errors gracefully", async () => {
    vi.mocked(apiClient.getModels).mockRejectedValue({
      error: "Failed to fetch models",
      status: 500,
    });

    const { result } = renderHook(() => useModels());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to fetch models");
    expect(result.current.models).toEqual([]);
    expect(result.current.modelsByProvider).toEqual({});
  });

  it("should provide utility functions", async () => {
    const mockModelsResponse = {
      models: [
        {
          id: "gpt-4",
          name: "GPT-4 Turbo",
          provider: "openai",
          description: "Advanced AI model",
          personality: "analytical",
          contextWindow: 128000,
          maxResponseTokens: 4096,
          capabilities: {
            functionCalling: true,
            multiModal: false,
            codeGeneration: true,
          },
          pricing: { inputCostPer1kTokens: 0.01, outputCostPer1kTokens: 0.03 },
          performance: { speed: "medium", capacity: "high", efficiency: "low" },
          uiHints: {
            bestFor: "Complex reasoning",
            tags: ["reliable"],
            tier: "premium",
          },
          visualConfig: { color: "blue", icon: "🧠", gradient: "linear" },
          isRecommended: true,
          isNew: false,
          tags: ["reliable", "function-calling"],
          tier: "premium",
          bestUseCase: "Complex reasoning tasks",
        },
        {
          id: "gpt-3.5-turbo",
          name: "GPT-3.5 Turbo",
          provider: "openai",
          description: "Efficient AI model",
          personality: "balanced",
          contextWindow: 16385,
          maxResponseTokens: 4096,
          capabilities: {
            functionCalling: true,
            multiModal: false,
            codeGeneration: true,
          },
          pricing: {
            inputCostPer1kTokens: 0.0015,
            outputCostPer1kTokens: 0.002,
          },
          performance: {
            speed: "fast",
            capacity: "medium",
            efficiency: "high",
          },
          uiHints: {
            bestFor: "General tasks",
            tags: ["efficient"],
            tier: "standard",
          },
          visualConfig: { color: "green", icon: "💚", gradient: "linear" },
          isRecommended: false,
          isNew: false,
          tags: ["efficient", "function-calling"],
          tier: "standard",
          bestUseCase: "General assistance",
        },
      ],
      modelsByProvider: {
        openai: [
          {
            id: "gpt-4",
            name: "GPT-4 Turbo",
            provider: "openai",
            description: "Advanced AI model",
            personality: "analytical",
            contextWindow: 128000,
            maxResponseTokens: 4096,
            capabilities: {
              functionCalling: true,
              multiModal: false,
              codeGeneration: true,
            },
            pricing: {
              inputCostPer1kTokens: 0.01,
              outputCostPer1kTokens: 0.03,
            },
            performance: {
              speed: "medium",
              capacity: "high",
              efficiency: "low",
            },
            uiHints: {
              bestFor: "Complex reasoning",
              tags: ["reliable"],
              tier: "premium",
            },
            visualConfig: { color: "blue", icon: "🧠", gradient: "linear" },
            isRecommended: true,
            isNew: false,
            tags: ["reliable", "function-calling"],
            tier: "premium",
            bestUseCase: "Complex reasoning tasks",
          },
          {
            id: "gpt-3.5-turbo",
            name: "GPT-3.5 Turbo",
            provider: "openai",
            description: "Efficient AI model",
            personality: "balanced",
            contextWindow: 16385,
            maxResponseTokens: 4096,
            capabilities: {
              functionCalling: true,
              multiModal: false,
              codeGeneration: true,
            },
            pricing: {
              inputCostPer1kTokens: 0.0015,
              outputCostPer1kTokens: 0.002,
            },
            performance: {
              speed: "fast",
              capacity: "medium",
              efficiency: "high",
            },
            uiHints: {
              bestFor: "General tasks",
              tags: ["efficient"],
              tier: "standard",
            },
            visualConfig: { color: "green", icon: "💚", gradient: "linear" },
            isRecommended: false,
            isNew: false,
            tags: ["efficient", "function-calling"],
            tier: "standard",
            bestUseCase: "General assistance",
          },
        ],
      },
      providerStatus: {
        total: 1,
        configured: 1,
        available: 1,
        models: 2,
        providers: {},
      },
      recommendations: null,
      statistics: {
        totalModels: 2,
        totalProviders: 1,
        configuredProviders: 1,
        availableModels: 2,
      },
    };

    vi.mocked(apiClient.getModels).mockResolvedValue(mockModelsResponse);

    const { result } = renderHook(() => useModels());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Test getModelById
    const gpt4Model = result.current.getModelById("gpt-4");
    expect(gpt4Model).toBeDefined();
    expect(gpt4Model?.name).toBe("GPT-4 Turbo");

    const nonexistentModel = result.current.getModelById("nonexistent");
    expect(nonexistentModel).toBeUndefined();

    // Test getModelsByTier
    const premiumModels = result.current.getModelsByTier("premium");
    expect(premiumModels).toHaveLength(1);
    expect(premiumModels[0].id).toBe("gpt-4");

    const standardModels = result.current.getModelsByTier("standard");
    expect(standardModels).toHaveLength(1);
    expect(standardModels[0].id).toBe("gpt-3.5-turbo");

    const economyModels = result.current.getModelsByTier("economy");
    expect(economyModels).toHaveLength(0);
  });

  it("should support refetching models", async () => {
    let callCount = 0;
    vi.mocked(apiClient.getModels).mockImplementation(async () => {
      callCount++;
      return {
        models: [],
        modelsByProvider: {},
        providerStatus: {
          total: 0,
          configured: 0,
          available: 0,
          models: 0,
          providers: {},
        },
        recommendations: null,
        statistics: {
          totalModels: 0,
          totalProviders: 0,
          configuredProviders: 0,
          availableModels: 0,
        },
      };
    });

    const { result } = renderHook(() => useModels());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(callCount).toBe(1);

    // Trigger refetch
    await result.current.refetchModels();

    expect(callCount).toBe(2);
  });
});
