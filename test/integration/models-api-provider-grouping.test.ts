import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Models API Provider Grouping Integration", () => {
  // Mock fetch for testing API responses
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should return models grouped by provider in API response", async () => {
    // Mock API response with proper structure
    const mockApiResponse = {
      models: [
        {
          id: "gpt-4",
          name: "GPT-4 Turbo",
          provider: "openai",
          description: "Advanced AI model",
          isRecommended: true,
          isNew: false,
          tags: ["reliable"],
          tier: "premium",
          bestUseCase: "Complex reasoning",
        },
        {
          id: "claude-3-5-sonnet-20241022",
          name: "Claude 3.5 Sonnet",
          provider: "claude",
          description: "Thoughtful AI assistant",
          isRecommended: true,
          isNew: false,
          tags: ["safe"],
          tier: "premium",
          bestUseCase: "Creative writing",
        },
        {
          id: "llama-3.1-70b-versatile",
          name: "Llama 3.1 70B Versatile",
          provider: "groq",
          description: "Ultra-fast inference",
          isRecommended: false,
          isNew: false,
          tags: ["ultra-fast"],
          tier: "premium",
          bestUseCase: "Quick responses",
        },
        {
          id: "gemini-1.5-pro",
          name: "Gemini 1.5 Pro",
          provider: "gemini",
          description: "Multimodal AI",
          isRecommended: false,
          isNew: true,
          tags: ["multimodal"],
          tier: "premium",
          bestUseCase: "Multimodal tasks",
        },
        {
          id: "openrouter-model",
          name: "OpenRouter Model",
          provider: "openrouter",
          description: "Model via OpenRouter",
          isRecommended: false,
          isNew: false,
          tags: ["versatile"],
          tier: "standard",
          bestUseCase: "General tasks",
        },
      ],
      modelsByProvider: {
        openai: [
          {
            id: "gpt-4",
            name: "GPT-4 Turbo",
            provider: "openai",
            description: "Advanced AI model",
            isRecommended: true,
            isNew: false,
            tags: ["reliable"],
            tier: "premium",
            bestUseCase: "Complex reasoning",
          },
        ],
        claude: [
          {
            id: "claude-3-5-sonnet-20241022",
            name: "Claude 3.5 Sonnet",
            provider: "claude",
            description: "Thoughtful AI assistant",
            isRecommended: true,
            isNew: false,
            tags: ["safe"],
            tier: "premium",
            bestUseCase: "Creative writing",
          },
        ],
        groq: [
          {
            id: "llama-3.1-70b-versatile",
            name: "Llama 3.1 70B Versatile",
            provider: "groq",
            description: "Ultra-fast inference",
            isRecommended: false,
            isNew: false,
            tags: ["ultra-fast"],
            tier: "premium",
            bestUseCase: "Quick responses",
          },
        ],
        gemini: [
          {
            id: "gemini-1.5-pro",
            name: "Gemini 1.5 Pro",
            provider: "gemini",
            description: "Multimodal AI",
            isRecommended: false,
            isNew: true,
            tags: ["multimodal"],
            tier: "premium",
            bestUseCase: "Multimodal tasks",
          },
        ],
        openrouter: [
          {
            id: "openrouter-model",
            name: "OpenRouter Model",
            provider: "openrouter",
            description: "Model via OpenRouter",
            isRecommended: false,
            isNew: false,
            tags: ["versatile"],
            tier: "standard",
            bestUseCase: "General tasks",
          },
        ],
      },
      providerStatus: {
        total: 5,
        configured: 5,
        available: 5,
        models: 5,
        providers: {},
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
        totalModels: 5,
        totalProviders: 5,
        configuredProviders: 5,
        availableModels: 5,
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    // Test the API endpoint
    const response = await fetch("/api/models");
    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty("models");
    expect(data).toHaveProperty("modelsByProvider");
    expect(data).toHaveProperty("providerStatus");
    expect(data).toHaveProperty("recommendations");
    expect(data).toHaveProperty("statistics");

    // Verify modelsByProvider has all expected providers
    expect(data.modelsByProvider).toHaveProperty("openai");
    expect(data.modelsByProvider).toHaveProperty("claude");
    expect(data.modelsByProvider).toHaveProperty("groq");
    expect(data.modelsByProvider).toHaveProperty("gemini");
    expect(data.modelsByProvider).toHaveProperty("openrouter");

    // Verify provider-specific models
    expect(data.modelsByProvider.openai).toHaveLength(1);
    expect(data.modelsByProvider.openai[0].id).toBe("gpt-4");
    expect(data.modelsByProvider.openai[0].provider).toBe("openai");

    expect(data.modelsByProvider.claude).toHaveLength(1);
    expect(data.modelsByProvider.claude[0].id).toBe(
      "claude-3-5-sonnet-20241022"
    );
    expect(data.modelsByProvider.claude[0].provider).toBe("claude");

    expect(data.modelsByProvider.groq).toHaveLength(1);
    expect(data.modelsByProvider.groq[0].id).toBe("llama-3.1-70b-versatile");
    expect(data.modelsByProvider.groq[0].provider).toBe("groq");

    expect(data.modelsByProvider.gemini).toHaveLength(1);
    expect(data.modelsByProvider.gemini[0].id).toBe("gemini-1.5-pro");
    expect(data.modelsByProvider.gemini[0].provider).toBe("gemini");

    expect(data.modelsByProvider.openrouter).toHaveLength(1);
    expect(data.modelsByProvider.openrouter[0].id).toBe("openrouter-model");
    expect(data.modelsByProvider.openrouter[0].provider).toBe("openrouter");

    // Verify total models count matches grouped models
    const totalGroupedModels = Object.values(data.modelsByProvider).reduce(
      (total: number, providerModels: any) => total + providerModels.length,
      0
    );
    expect(totalGroupedModels).toBe(data.models.length);

    // Verify that each model appears in the correct provider group
    data.models.forEach((model: any) => {
      const providerModels = data.modelsByProvider[model.provider];
      expect(providerModels).toBeDefined();
      expect(providerModels.some((m: any) => m.id === model.id)).toBe(true);
    });
  });

  it("should handle empty modelsByProvider correctly", async () => {
    const emptyResponse = {
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

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => emptyResponse,
    });

    const response = await fetch("/api/models");
    const data = await response.json();

    expect(data.models).toHaveLength(0);
    expect(data.modelsByProvider).toEqual({});
    expect(data.statistics.totalModels).toBe(0);
  });

  it("should validate that provider names match between models and modelsByProvider", async () => {
    const mockResponse = {
      models: [
        {
          id: "test-model-1",
          provider: "testprovider1",
          name: "Test Model 1",
        },
        {
          id: "test-model-2",
          provider: "testprovider2",
          name: "Test Model 2",
        },
      ],
      modelsByProvider: {
        testprovider1: [
          {
            id: "test-model-1",
            provider: "testprovider1",
            name: "Test Model 1",
          },
        ],
        testprovider2: [
          {
            id: "test-model-2",
            provider: "testprovider2",
            name: "Test Model 2",
          },
        ],
      },
      providerStatus: {
        total: 2,
        configured: 2,
        available: 2,
        models: 2,
        providers: {},
      },
      recommendations: null,
      statistics: {
        totalModels: 2,
        totalProviders: 2,
        configuredProviders: 2,
        availableModels: 2,
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const response = await fetch("/api/models");
    const data = await response.json();

    // Verify provider consistency
    const providersInModels = new Set(data.models.map((m: any) => m.provider));
    const providersInGrouping = new Set(Object.keys(data.modelsByProvider));

    expect(providersInModels).toEqual(providersInGrouping);

    // Verify each model is in the correct provider group
    data.models.forEach((model: any) => {
      const providerGroup = data.modelsByProvider[model.provider];
      expect(providerGroup).toBeDefined();
      expect(providerGroup.some((m: any) => m.id === model.id)).toBe(true);
    });
  });
});
