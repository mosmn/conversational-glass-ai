import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { useModels } from "@/hooks/useModels";

// Mock the useModels hook
vi.mock("@/hooks/useModels");

describe("ModelSelector Component", () => {
  const mockOnModelChange = vi.fn();

  const mockModelsData = {
    models: [
      {
        id: "gpt-4",
        name: "GPT-4 Turbo",
        provider: "openai",
        description: "Advanced AI model for complex reasoning",
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
        pricing: { inputCostPer1kTokens: 0.003, outputCostPer1kTokens: 0.015 },
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
        performance: { speed: "fast", capacity: "medium", efficiency: "high" },
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
      {
        id: "gemini-1.5-pro",
        name: "Gemini 1.5 Pro",
        provider: "gemini",
        description: "Multimodal AI with advanced capabilities",
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
        tags: ["multimodal", "next-gen"],
        tier: "premium",
        bestUseCase: "Multimodal and reasoning tasks",
      },
      {
        id: "openrouter-model",
        name: "OpenRouter Model",
        provider: "openrouter",
        description: "Model via OpenRouter",
        personality: "versatile",
        contextWindow: 32768,
        maxResponseTokens: 4096,
        capabilities: {
          functionCalling: true,
          multiModal: false,
          codeGeneration: true,
        },
        pricing: { inputCostPer1kTokens: 0.002, outputCostPer1kTokens: 0.006 },
        performance: {
          speed: "medium",
          capacity: "medium",
          efficiency: "medium",
        },
        uiHints: {
          bestFor: "General tasks",
          tags: ["versatile"],
          tier: "standard",
        },
        visualConfig: { color: "cyan", icon: "🔀", gradient: "linear" },
        isRecommended: false,
        isNew: false,
        tags: ["versatile"],
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
          description: "Advanced AI model for complex reasoning",
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
      gemini: [
        {
          id: "gemini-1.5-pro",
          name: "Gemini 1.5 Pro",
          provider: "gemini",
          description: "Multimodal AI with advanced capabilities",
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
          tags: ["multimodal", "next-gen"],
          tier: "premium",
          bestUseCase: "Multimodal and reasoning tasks",
        },
      ],
      openrouter: [
        {
          id: "openrouter-model",
          name: "OpenRouter Model",
          provider: "openrouter",
          description: "Model via OpenRouter",
          personality: "versatile",
          contextWindow: 32768,
          maxResponseTokens: 4096,
          capabilities: {
            functionCalling: true,
            multiModal: false,
            codeGeneration: true,
          },
          pricing: {
            inputCostPer1kTokens: 0.002,
            outputCostPer1kTokens: 0.006,
          },
          performance: {
            speed: "medium",
            capacity: "medium",
            efficiency: "medium",
          },
          uiHints: {
            bestFor: "General tasks",
            tags: ["versatile"],
            tier: "standard",
          },
          visualConfig: { color: "cyan", icon: "🔀", gradient: "linear" },
          isRecommended: false,
          isNew: false,
          tags: ["versatile"],
          tier: "standard",
          bestUseCase: "General assistance",
        },
      ],
    },
    loading: false,
    error: null,
    recommendations: {
      default: { id: "gpt-4", name: "GPT-4 Turbo" },
      fastest: {
        id: "llama-3.1-70b-versatile",
        name: "Llama 3.1 70B Versatile",
      },
      smartest: { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
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
    getModelById: vi.fn(),
    getModelsByTier: vi.fn(),
    refetchModels: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useModels).mockReturnValue(mockModelsData);
  });

  it("should render selected model in trigger button", () => {
    render(
      <ModelSelector selectedModel="gpt-4" onModelChange={mockOnModelChange} />
    );

    expect(screen.getByText("GPT-4 Turbo")).toBeInTheDocument();
    expect(screen.getByText("openai")).toBeInTheDocument();
  });

  it("should show all models in 'All' tab", async () => {
    render(
      <ModelSelector selectedModel="gpt-4" onModelChange={mockOnModelChange} />
    );

    // Open the dropdown
    fireEvent.click(screen.getByRole("button"));

    // Should see all models by default (All tab is selected)
    await waitFor(() => {
      expect(screen.getByText("GPT-4 Turbo")).toBeInTheDocument();
      expect(screen.getByText("Claude 3.5 Sonnet")).toBeInTheDocument();
      expect(screen.getByText("Llama 3.1 70B Versatile")).toBeInTheDocument();
      expect(screen.getByText("Gemini 1.5 Pro")).toBeInTheDocument();
      expect(screen.getByText("OpenRouter Model")).toBeInTheDocument();
    });
  });

  it("should filter models by provider in provider tabs", async () => {
    render(
      <ModelSelector selectedModel="gpt-4" onModelChange={mockOnModelChange} />
    );

    // Open the dropdown
    fireEvent.click(screen.getByRole("button"));

    // Click on OpenAI tab
    fireEvent.click(screen.getByText("🤖 OpenAI"));

    await waitFor(() => {
      // Should only show OpenAI models
      expect(screen.getByText("GPT-4 Turbo")).toBeInTheDocument();
      expect(screen.queryByText("Claude 3.5 Sonnet")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Llama 3.1 70B Versatile")
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Gemini 1.5 Pro")).not.toBeInTheDocument();
      expect(screen.queryByText("OpenRouter Model")).not.toBeInTheDocument();
    });
  });

  it("should filter models by Claude provider", async () => {
    render(
      <ModelSelector selectedModel="gpt-4" onModelChange={mockOnModelChange} />
    );

    // Open the dropdown
    fireEvent.click(screen.getByRole("button"));

    // Click on Claude tab
    fireEvent.click(screen.getByText("🧩 Claude"));

    await waitFor(() => {
      // Should only show Claude models
      expect(screen.getByText("Claude 3.5 Sonnet")).toBeInTheDocument();
      expect(screen.queryByText("GPT-4 Turbo")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Llama 3.1 70B Versatile")
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Gemini 1.5 Pro")).not.toBeInTheDocument();
      expect(screen.queryByText("OpenRouter Model")).not.toBeInTheDocument();
    });
  });

  it("should filter models by Groq provider", async () => {
    render(
      <ModelSelector selectedModel="gpt-4" onModelChange={mockOnModelChange} />
    );

    // Open the dropdown
    fireEvent.click(screen.getByRole("button"));

    // Click on Groq tab
    fireEvent.click(screen.getByText("⚡ Groq"));

    await waitFor(() => {
      // Should only show Groq models
      expect(screen.getByText("Llama 3.1 70B Versatile")).toBeInTheDocument();
      expect(screen.queryByText("GPT-4 Turbo")).not.toBeInTheDocument();
      expect(screen.queryByText("Claude 3.5 Sonnet")).not.toBeInTheDocument();
      expect(screen.queryByText("Gemini 1.5 Pro")).not.toBeInTheDocument();
      expect(screen.queryByText("OpenRouter Model")).not.toBeInTheDocument();
    });
  });

  it("should filter models by Gemini provider", async () => {
    render(
      <ModelSelector selectedModel="gpt-4" onModelChange={mockOnModelChange} />
    );

    // Open the dropdown
    fireEvent.click(screen.getByRole("button"));

    // Click on Gemini tab
    fireEvent.click(screen.getByText("🔍 Gemini"));

    await waitFor(() => {
      // Should only show Gemini models
      expect(screen.getByText("Gemini 1.5 Pro")).toBeInTheDocument();
      expect(screen.queryByText("GPT-4 Turbo")).not.toBeInTheDocument();
      expect(screen.queryByText("Claude 3.5 Sonnet")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Llama 3.1 70B Versatile")
      ).not.toBeInTheDocument();
      expect(screen.queryByText("OpenRouter Model")).not.toBeInTheDocument();
    });
  });

  it("should filter models by OpenRouter provider", async () => {
    render(
      <ModelSelector selectedModel="gpt-4" onModelChange={mockOnModelChange} />
    );

    // Open the dropdown
    fireEvent.click(screen.getByRole("button"));

    // Click on OpenRouter tab
    fireEvent.click(screen.getByText("🔀 Router"));

    await waitFor(() => {
      // Should only show OpenRouter models
      expect(screen.getByText("OpenRouter Model")).toBeInTheDocument();
      expect(screen.queryByText("GPT-4 Turbo")).not.toBeInTheDocument();
      expect(screen.queryByText("Claude 3.5 Sonnet")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Llama 3.1 70B Versatile")
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Gemini 1.5 Pro")).not.toBeInTheDocument();
    });
  });

  it("should show recommended models in 'Top' tab", async () => {
    render(
      <ModelSelector selectedModel="gpt-4" onModelChange={mockOnModelChange} />
    );

    // Open the dropdown
    fireEvent.click(screen.getByRole("button"));

    // Click on Top tab
    fireEvent.click(screen.getByText("⭐ Top"));

    await waitFor(() => {
      // Should only show recommended models
      expect(screen.getByText("GPT-4 Turbo")).toBeInTheDocument();
      expect(screen.getByText("Claude 3.5 Sonnet")).toBeInTheDocument();
      expect(
        screen.queryByText("Llama 3.1 70B Versatile")
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Gemini 1.5 Pro")).not.toBeInTheDocument();
      expect(screen.queryByText("OpenRouter Model")).not.toBeInTheDocument();
    });
  });

  it("should handle model selection", async () => {
    render(
      <ModelSelector selectedModel="gpt-4" onModelChange={mockOnModelChange} />
    );

    // Open the dropdown
    fireEvent.click(screen.getByRole("button"));

    // Click on a different model
    fireEvent.click(screen.getByText("Claude 3.5 Sonnet"));

    expect(mockOnModelChange).toHaveBeenCalledWith(
      "claude-3-5-sonnet-20241022"
    );
  });

  it("should show loading state", () => {
    vi.mocked(useModels).mockReturnValue({
      ...mockModelsData,
      loading: true,
      models: [],
    });

    render(
      <ModelSelector selectedModel="gpt-4" onModelChange={mockOnModelChange} />
    );

    expect(screen.getByText("Loading models...")).toBeInTheDocument();
    expect(screen.getByText("Please wait")).toBeInTheDocument();
  });

  it("should show error state", () => {
    vi.mocked(useModels).mockReturnValue({
      ...mockModelsData,
      loading: false,
      error: "Failed to fetch models",
      models: [],
    });

    render(
      <ModelSelector selectedModel="gpt-4" onModelChange={mockOnModelChange} />
    );

    expect(screen.getByText("Error loading models")).toBeInTheDocument();
    expect(screen.getByText("Check API keys")).toBeInTheDocument();
  });

  it("should show no models available state", () => {
    vi.mocked(useModels).mockReturnValue({
      ...mockModelsData,
      loading: false,
      error: null,
      models: [],
      modelsByProvider: {},
    });

    render(
      <ModelSelector selectedModel="gpt-4" onModelChange={mockOnModelChange} />
    );

    expect(screen.getByText("No models available")).toBeInTheDocument();
    expect(screen.getByText("Add API keys")).toBeInTheDocument();
  });

  it("should display smart recommendations when enabled", async () => {
    render(
      <ModelSelector
        selectedModel="gpt-4"
        onModelChange={mockOnModelChange}
        showRecommendations={true}
      />
    );

    // Open the dropdown
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("💡 Smart Recommendations")).toBeInTheDocument();
      expect(screen.getByText("Fastest:")).toBeInTheDocument();
      expect(screen.getByText("Smartest:")).toBeInTheDocument();
      expect(screen.getByText("Most Efficient:")).toBeInTheDocument();
      expect(screen.getByText("Balanced:")).toBeInTheDocument();
    });
  });

  it("should handle empty provider tabs gracefully", async () => {
    // Mock scenario where a provider has no models
    vi.mocked(useModels).mockReturnValue({
      ...mockModelsData,
      modelsByProvider: {
        openai: [],
        claude: [],
        groq: [],
        gemini: [],
        openrouter: [],
      },
    });

    render(
      <ModelSelector selectedModel="gpt-4" onModelChange={mockOnModelChange} />
    );

    // Open the dropdown
    fireEvent.click(screen.getByRole("button"));

    // Click on OpenAI tab (which should be empty)
    fireEvent.click(screen.getByText("🤖 OpenAI"));

    // Should not crash and show no models for that provider
    await waitFor(() => {
      expect(screen.queryByText("GPT-4 Turbo")).not.toBeInTheDocument();
    });
  });
});
