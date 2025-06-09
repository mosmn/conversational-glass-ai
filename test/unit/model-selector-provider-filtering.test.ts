import { describe, it, expect } from "vitest";

describe("ModelSelector Provider Filtering Logic", () => {
  // Sample data that matches what the API should return
  const sampleModelsData = {
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
  };

  // Simulate the ModelSelector's getModelsByTab function
  function getModelsByTab(tab: string, models: any[], modelsByProvider: any) {
    switch (tab) {
      case "groq":
        return modelsByProvider.groq || [];
      case "openai":
        return modelsByProvider.openai || [];
      case "claude":
        return modelsByProvider.claude || [];
      case "gemini":
        return modelsByProvider.gemini || [];
      case "openrouter":
        return modelsByProvider.openrouter || [];
      case "recommended":
        return models.filter((m) => m.isRecommended);
      case "new":
        return models.filter((m) => m.isNew);
      default:
        return models;
    }
  }

  it("should return all models for 'all' tab", () => {
    const result = getModelsByTab(
      "all",
      sampleModelsData.models,
      sampleModelsData.modelsByProvider
    );

    expect(result).toHaveLength(5);
    expect(result.map((m: any) => m.id)).toEqual([
      "gpt-4",
      "claude-3-5-sonnet-20241022",
      "llama-3.1-70b-versatile",
      "gemini-1.5-pro",
      "openrouter-model",
    ]);
  });

  it("should return only OpenAI models for 'openai' tab", () => {
    const result = getModelsByTab(
      "openai",
      sampleModelsData.models,
      sampleModelsData.modelsByProvider
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("gpt-4");
    expect(result[0].provider).toBe("openai");
  });

  it("should return only Claude models for 'claude' tab", () => {
    const result = getModelsByTab(
      "claude",
      sampleModelsData.models,
      sampleModelsData.modelsByProvider
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("claude-3-5-sonnet-20241022");
    expect(result[0].provider).toBe("claude");
  });

  it("should return only Groq models for 'groq' tab", () => {
    const result = getModelsByTab(
      "groq",
      sampleModelsData.models,
      sampleModelsData.modelsByProvider
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("llama-3.1-70b-versatile");
    expect(result[0].provider).toBe("groq");
  });

  it("should return only Gemini models for 'gemini' tab", () => {
    const result = getModelsByTab(
      "gemini",
      sampleModelsData.models,
      sampleModelsData.modelsByProvider
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("gemini-1.5-pro");
    expect(result[0].provider).toBe("gemini");
  });

  it("should return only OpenRouter models for 'openrouter' tab", () => {
    const result = getModelsByTab(
      "openrouter",
      sampleModelsData.models,
      sampleModelsData.modelsByProvider
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("openrouter-model");
    expect(result[0].provider).toBe("openrouter");
  });

  it("should return only recommended models for 'recommended' tab", () => {
    const result = getModelsByTab(
      "recommended",
      sampleModelsData.models,
      sampleModelsData.modelsByProvider
    );

    expect(result).toHaveLength(2); // GPT-4 and Claude 3.5 Sonnet are recommended
    expect(result.map((m: any) => m.id)).toEqual([
      "gpt-4",
      "claude-3-5-sonnet-20241022",
    ]);
    result.forEach((model: any) => {
      expect(model.isRecommended).toBe(true);
    });
  });

  it("should return only new models for 'new' tab", () => {
    const result = getModelsByTab(
      "new",
      sampleModelsData.models,
      sampleModelsData.modelsByProvider
    );

    expect(result).toHaveLength(1); // Only Gemini 1.5 Pro is new
    expect(result[0].id).toBe("gemini-1.5-pro");
    expect(result[0].isNew).toBe(true);
  });

  it("should return empty array for provider with no models", () => {
    const emptyData = {
      models: [],
      modelsByProvider: {
        openai: [],
        claude: [],
        groq: [],
        gemini: [],
        openrouter: [],
      },
    };

    const result = getModelsByTab(
      "openai",
      emptyData.models,
      emptyData.modelsByProvider
    );
    expect(result).toHaveLength(0);
  });

  it("should handle missing provider gracefully", () => {
    const incompleteData = {
      models: sampleModelsData.models,
      modelsByProvider: {
        openai: sampleModelsData.modelsByProvider.openai,
        // missing other providers
      },
    };

    const result = getModelsByTab(
      "claude",
      incompleteData.models,
      incompleteData.modelsByProvider
    );
    expect(result).toHaveLength(0); // Should return empty array, not crash
  });

  it("should validate that modelsByProvider contains models with correct providers", () => {
    Object.entries(sampleModelsData.modelsByProvider).forEach(
      ([providerName, models]) => {
        models.forEach((model: any) => {
          expect(model.provider).toBe(providerName);
        });
      }
    );
  });

  it("should ensure all models appear in modelsByProvider", () => {
    const allModelsInGroups = Object.values(sampleModelsData.modelsByProvider)
      .flat()
      .map((model: any) => model.id)
      .sort();

    const allModelsInArray = sampleModelsData.models
      .map((model: any) => model.id)
      .sort();

    expect(allModelsInGroups).toEqual(allModelsInArray);
  });

  it("should validate provider tab filtering logic matches expected behavior", () => {
    const testCases = [
      { tab: "openai", expectedCount: 1, expectedProviders: ["openai"] },
      { tab: "claude", expectedCount: 1, expectedProviders: ["claude"] },
      { tab: "groq", expectedCount: 1, expectedProviders: ["groq"] },
      { tab: "gemini", expectedCount: 1, expectedProviders: ["gemini"] },
      {
        tab: "openrouter",
        expectedCount: 1,
        expectedProviders: ["openrouter"],
      },
    ];

    testCases.forEach(({ tab, expectedCount, expectedProviders }) => {
      const result = getModelsByTab(
        tab,
        sampleModelsData.models,
        sampleModelsData.modelsByProvider
      );

      expect(result).toHaveLength(expectedCount);

      const uniqueProviders = [...new Set(result.map((m: any) => m.provider))];
      expect(uniqueProviders).toEqual(expectedProviders);
    });
  });
});
