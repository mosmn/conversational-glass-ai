import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ModelSelector } from "@/components/chat/ModelSelector";

// Mock the API calls at the network level
global.fetch = vi.fn();

describe("ModelSelector Integration Tests", () => {
  const mockOnModelChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should integrate API response with provider tabs correctly", async () => {
    // Mock API response
    const mockApiResponse = {
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
          tags: ["reliable"],
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
          tags: ["safe"],
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
            tags: ["ultra-fast"],
            tier: "premium",
          },
          visualConfig: { color: "yellow", icon: "⚡", gradient: "linear" },
          isRecommended: false,
          isNew: false,
          tags: ["ultra-fast"],
          tier: "premium",
          bestUseCase: "Quick responses, simple queries",
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
            functionCalling: true,
            multiModal: true,
            codeGeneration: true,
          },
          pricing: {
            inputCostPer1kTokens: 0.00125,
            outputCostPer1kTokens: 0.00375,
          },
          performance: {
            speed: "medium",
            capacity: "high",
            efficiency: "medium",
          },
          uiHints: {
            bestFor: "Multimodal tasks",
            tags: ["multimodal"],
            tier: "premium",
          },
          visualConfig: { color: "purple", icon: "🔍", gradient: "linear" },
          isRecommended: false,
          isNew: true,
          tags: ["multimodal"],
          tier: "premium",
          bestUseCase: "Multimodal and reasoning tasks",
        },
        {
          id: "openrouter/anthropic/claude-3-haiku",
          name: "Claude 3 Haiku (OpenRouter)",
          provider: "openrouter",
          description: "Fast Claude model via OpenRouter",
          personality: "efficient",
          contextWindow: 200000,
          maxResponseTokens: 4096,
          capabilities: {
            functionCalling: true,
            multiModal: false,
            codeGeneration: true,
          },
          pricing: {
            inputCostPer1kTokens: 0.00025,
            outputCostPer1kTokens: 0.00125,
          },
          performance: { speed: "fast", capacity: "high", efficiency: "high" },
          uiHints: { bestFor: "Quick tasks", tags: ["fast"], tier: "standard" },
          visualConfig: { color: "cyan", icon: "🔀", gradient: "linear" },
          isRecommended: false,
          isNew: false,
          tags: ["fast"],
          tier: "standard",
          bestUseCase: "Quick tasks and responses",
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
            tags: ["reliable"],
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
            tags: ["safe"],
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
              tags: ["ultra-fast"],
              tier: "premium",
            },
            visualConfig: { color: "yellow", icon: "⚡", gradient: "linear" },
            isRecommended: false,
            isNew: false,
            tags: ["ultra-fast"],
            tier: "premium",
            bestUseCase: "Quick responses, simple queries",
          },
        ],
        gemini: [
          {
            id: "gemini-1.5-pro",
            name: "Gemini 1.5 Pro",
            provider: "gemini",
            description: "Multimodal AI",
            personality: "futuristic-innovator",
            contextWindow: 2097152,
            maxResponseTokens: 8192,
            capabilities: {
              functionCalling: true,
              multiModal: true,
              codeGeneration: true,
            },
            pricing: {
              inputCostPer1kTokens: 0.00125,
              outputCostPer1kTokens: 0.00375,
            },
            performance: {
              speed: "medium",
              capacity: "high",
              efficiency: "medium",
            },
            uiHints: {
              bestFor: "Multimodal tasks",
              tags: ["multimodal"],
              tier: "premium",
            },
            visualConfig: { color: "purple", icon: "🔍", gradient: "linear" },
            isRecommended: false,
            isNew: true,
            tags: ["multimodal"],
            tier: "premium",
            bestUseCase: "Multimodal and reasoning tasks",
          },
        ],
        openrouter: [
          {
            id: "openrouter/anthropic/claude-3-haiku",
            name: "Claude 3 Haiku (OpenRouter)",
            provider: "openrouter",
            description: "Fast Claude model via OpenRouter",
            personality: "efficient",
            contextWindow: 200000,
            maxResponseTokens: 4096,
            capabilities: {
              functionCalling: true,
              multiModal: false,
              codeGeneration: true,
            },
            pricing: {
              inputCostPer1kTokens: 0.00025,
              outputCostPer1kTokens: 0.00125,
            },
            performance: {
              speed: "fast",
              capacity: "high",
              efficiency: "high",
            },
            uiHints: {
              bestFor: "Quick tasks",
              tags: ["fast"],
              tier: "standard",
            },
            visualConfig: { color: "cyan", icon: "🔀", gradient: "linear" },
            isRecommended: false,
            isNew: false,
            tags: ["fast"],
            tier: "standard",
            bestUseCase: "Quick tasks and responses",
          },
        ],
      },
      providerStatus: {
        total: 5,
        configured: 5,
        available: 5,
        models: 5,
        providers: {
          openai: { configured: true, modelCount: 1 },
          claude: { configured: true, modelCount: 1 },
          groq: { configured: true, modelCount: 1 },
          gemini: { configured: true, modelCount: 1 },
          openrouter: { configured: true, modelCount: 1 },
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
        totalModels: 5,
        totalProviders: 5,
        configuredProviders: 5,
        availableModels: 5,
      },
    };

    // Mock the fetch call
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    render(
      <ModelSelector selectedModel="gpt-4" onModelChange={mockOnModelChange} />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText("GPT-4 Turbo")).toBeInTheDocument();
    });

    // Open the dropdown
    fireEvent.click(screen.getByRole("button"));

    // Verify all models are shown in All tab by default
    await waitFor(() => {
      expect(screen.getByText("GPT-4 Turbo")).toBeInTheDocument();
      expect(screen.getByText("Claude 3.5 Sonnet")).toBeInTheDocument();
      expect(screen.getByText("Llama 3.1 70B Versatile")).toBeInTheDocument();
      expect(screen.getByText("Gemini 1.5 Pro")).toBeInTheDocument();
      expect(
        screen.getByText("Claude 3 Haiku (OpenRouter)")
      ).toBeInTheDocument();
    });

    // Test each provider tab
    const providerTests = [
      {
        tab: "🤖 OpenAI",
        expectedModel: "GPT-4 Turbo",
        notExpectedModels: [
          "Claude 3.5 Sonnet",
          "Llama 3.1 70B Versatile",
          "Gemini 1.5 Pro",
        ],
      },
      {
        tab: "🧩 Claude",
        expectedModel: "Claude 3.5 Sonnet",
        notExpectedModels: [
          "GPT-4 Turbo",
          "Llama 3.1 70B Versatile",
          "Gemini 1.5 Pro",
        ],
      },
      {
        tab: "⚡ Groq",
        expectedModel: "Llama 3.1 70B Versatile",
        notExpectedModels: [
          "GPT-4 Turbo",
          "Claude 3.5 Sonnet",
          "Gemini 1.5 Pro",
        ],
      },
      {
        tab: "🔍 Gemini",
        expectedModel: "Gemini 1.5 Pro",
        notExpectedModels: [
          "GPT-4 Turbo",
          "Claude 3.5 Sonnet",
          "Llama 3.1 70B Versatile",
        ],
      },
      {
        tab: "🔀 Router",
        expectedModel: "Claude 3 Haiku (OpenRouter)",
        notExpectedModels: [
          "GPT-4 Turbo",
          "Claude 3.5 Sonnet",
          "Llama 3.1 70B Versatile",
        ],
      },
    ];

    for (const { tab, expectedModel, notExpectedModels } of providerTests) {
      // Click the provider tab
      fireEvent.click(screen.getByText(tab));

      await waitFor(() => {
        // Should show the expected model for this provider
        expect(screen.getByText(expectedModel)).toBeInTheDocument();

        // Should not show models from other providers
        notExpectedModels.forEach((modelName) => {
          expect(screen.queryByText(modelName)).not.toBeInTheDocument();
        });
      });
    }
  });

  it("should handle API errors gracefully", async () => {
    // Mock API error
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"));

    render(
      <ModelSelector selectedModel="gpt-4" onModelChange={mockOnModelChange} />
    );

    await waitFor(() => {
      expect(screen.getByText("Error loading models")).toBeInTheDocument();
      expect(screen.getByText("Check API keys")).toBeInTheDocument();
    });
  });

  it("should handle empty API response", async () => {
    // Mock empty API response
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

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => emptyResponse,
    } as Response);

    render(
      <ModelSelector selectedModel="gpt-4" onModelChange={mockOnModelChange} />
    );

    await waitFor(() => {
      expect(screen.getByText("No models available")).toBeInTheDocument();
      expect(screen.getByText("Add API keys")).toBeInTheDocument();
    });
  });

  it("should verify API endpoint is called correctly", async () => {
    const mockApiResponse = {
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

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    render(
      <ModelSelector selectedModel="gpt-4" onModelChange={mockOnModelChange} />
    );

    await waitFor(() => {
      // Verify the API was called with correct endpoint
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/models"),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });
  });

  it("should handle model selection across different provider tabs", async () => {
    const mockApiResponse = {
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
          tags: ["reliable"],
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
          tags: ["safe"],
          tier: "premium",
          bestUseCase: "Creative and analytical tasks",
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
            tags: ["reliable"],
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
            tags: ["safe"],
            tier: "premium",
            bestUseCase: "Creative and analytical tasks",
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

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    render(
      <ModelSelector selectedModel="gpt-4" onModelChange={mockOnModelChange} />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText("GPT-4 Turbo")).toBeInTheDocument();
    });

    // Open the dropdown
    fireEvent.click(screen.getByRole("button"));

    // Switch to Claude tab and select Claude model
    fireEvent.click(screen.getByText("🧩 Claude"));

    await waitFor(() => {
      expect(screen.getByText("Claude 3.5 Sonnet")).toBeInTheDocument();
    });

    // Click on Claude model
    fireEvent.click(screen.getByText("Claude 3.5 Sonnet"));

    expect(mockOnModelChange).toHaveBeenCalledWith(
      "claude-3-5-sonnet-20241022"
    );
  });
});
