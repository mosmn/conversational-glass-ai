import { NextRequest, NextResponse } from "next/server";
import {
  getAllModels,
  getModelsByProvider,
  getProviderStatus,
  getRecommendedModels,
  getDefaultModel,
} from "@/lib/ai/providers";

export async function GET(request: NextRequest) {
  try {
    // Get all models from all providers (async for dynamic loading)
    const allModels = await getAllModels();

    // Transform AI models to frontend Model interface
    const enhancedModels = allModels.map((aiModel) => {
      const performance = {
        speed: getSpeedRating(aiModel),
        capacity: getCapacityRating(aiModel),
        efficiency: getEfficiencyRating(aiModel),
      };

      const uiHints = {
        bestFor: getBestUseCase(aiModel),
        tags: getModelTags(aiModel),
        tier: getModelTier(aiModel),
      };

      return {
        id: aiModel.id,
        name: aiModel.name,
        provider: aiModel.provider,
        description: aiModel.description,
        personality: aiModel.personality,
        contextWindow: aiModel.contextWindow,
        maxResponseTokens: aiModel.maxResponseTokens || 4096,
        capabilities: {
          functionCalling: aiModel.capabilities.functionCalling || false,
          multiModal: aiModel.capabilities.multiModal || false,
          codeGeneration: aiModel.capabilities.functionCalling || false, // Use function calling as proxy for code generation
          // Enhanced file support capabilities
          vision:
            aiModel.capabilities.multiModal &&
            aiModel.capabilities.fileSupport?.images?.processingMethod ===
              "vision",
          pdfs: aiModel.capabilities.fileSupport?.documents?.supported || false,
          search: false, // TODO: Implement search capability detection
          streaming: aiModel.capabilities.streaming || false,
          fileSupport: aiModel.capabilities.fileSupport || undefined,
        },
        pricing: aiModel.pricing || {
          inputCostPer1kTokens: 0,
          outputCostPer1kTokens: 0,
        },
        performance,
        uiHints,
        visualConfig: aiModel.visualConfig || {
          color: "from-gray-500 to-gray-600",
          icon: "🤖",
          gradient: "linear-gradient(135deg, #6b7280, #4b5563)",
        },
        // Enhanced properties added by the API
        isRecommended: isRecommendedModel(aiModel),
        isNew: isNewModel(aiModel),
        tags: getModelTags(aiModel),
        tier: getModelTier(aiModel),
        bestUseCase: getBestUseCase(aiModel),
      };
    });

    // Group models by provider
    const modelsByProvider = enhancedModels.reduce((acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    }, {} as Record<string, typeof enhancedModels>);

    // Get provider status (async for dynamic loading)
    const providerStatus = await getProviderStatus();

    // Get recommended models
    const recommendedModels = await getRecommendedModels();

    // Create recommendations structure
    const recommendations = {
      default: enhancedModels.find((m) => m.isRecommended) || enhancedModels[0],
      fastest:
        enhancedModels.find((m) => m.performance.speed === "fast") ||
        enhancedModels[0],
      smartest:
        enhancedModels.find((m) => m.tier === "premium") || enhancedModels[0],
      cheapest:
        enhancedModels.find((m) => m.performance.efficiency === "high") ||
        enhancedModels[0],
      balanced:
        enhancedModels.find((m) => m.tier === "standard") || enhancedModels[0],
    };

    // Create statistics
    const statistics = {
      totalModels: enhancedModels.length,
      totalProviders: Object.keys(modelsByProvider).length,
      configuredProviders: providerStatus.configured,
      availableModels: enhancedModels.length,
    };

    return NextResponse.json({
      models: enhancedModels,
      modelsByProvider,
      providerStatus,
      recommendations,
      statistics,
    });
  } catch (error) {
    console.error("Failed to fetch models:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch models",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper functions for model metadata
function getSpeedRating(model: any): "fast" | "medium" | "slow" {
  if (model.provider === "groq") {
    return model.name.includes("8b") ? "fast" : "medium";
  }

  if (model.provider === "openai") {
    return model.name.includes("3.5") ? "fast" : "medium";
  }

  if (model.provider === "gemini") {
    if (model.name.includes("flash")) return "fast";
    return "medium";
  }

  if (model.provider === "claude") {
    if (model.name.includes("haiku")) return "fast";
    return "medium";
  }

  return "medium";
}

function getCapacityRating(model: any): "high" | "medium" | "low" {
  if (model.contextWindow >= 100000) return "high";
  if (model.contextWindow >= 30000) return "medium";
  return "low";
}

function getEfficiencyRating(model: any): "high" | "medium" | "low" {
  const pricing = model.pricing;
  if (!pricing) return "medium";

  const totalCost =
    pricing.inputCostPer1kTokens + pricing.outputCostPer1kTokens;
  if (totalCost < 0.001) return "high";
  if (totalCost < 0.01) return "medium";
  return "low";
}

function isRecommendedModel(model: any): boolean {
  // Define recommended models based on provider and capabilities
  const recommendedModelIds = [
    "gpt-4",
    "claude-3-5-sonnet-20241022",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp",
    "llama-3.1-70b-versatile",
  ];

  return (
    recommendedModelIds.includes(model.id) ||
    model.name.toLowerCase().includes("recommended") ||
    (model.provider === "gemini" && model.name.includes("2.0")) ||
    (model.provider === "groq" && model.name.includes("70b"))
  );
}

function isNewModel(model: any): boolean {
  // Define new models (released in last 6 months)
  const newModelPatterns = [
    "2.0",
    "2.5",
    "exp",
    "preview",
    "beta",
    "thinking",
    "flash-exp",
    "2024",
    "new",
  ];

  return newModelPatterns.some(
    (pattern) =>
      model.name.toLowerCase().includes(pattern) ||
      model.id.toLowerCase().includes(pattern)
  );
}

function getBestUseCase(model: any): string {
  switch (model.personality) {
    case "lightning-fast":
      return "Quick responses, simple queries";
    case "versatile-powerhouse":
      return "Complex reasoning, long-form content";
    case "efficient-genius":
      return "Balanced tasks, efficient responses";
    case "analytical":
      return "Technical discussions, problem-solving";
    case "balanced":
      return "General purpose, versatile tasks";
    case "futuristic-innovator":
      return "Cutting-edge AI, experimental features";
    default:
      return "General assistance";
  }
}

function getModelTags(model: any): string[] {
  const tags: string[] = [];

  // Provider tags
  if (model.provider === "groq") tags.push("Ultra-fast");
  if (model.provider === "openai") tags.push("Reliable");
  if (model.provider === "gemini") tags.push("Multimodal");
  if (model.provider === "claude") tags.push("Safe");

  // Size tags
  if (model.name.includes("70b")) tags.push("Large");
  if (model.name.includes("8b") || model.name.includes("9b"))
    tags.push("Efficient");

  // Capability tags
  if (model.capabilities.functionCalling) tags.push("Function Calling");
  if (model.capabilities.multiModal) tags.push("Multi-modal");
  if (model.capabilities.vision) tags.push("Vision");
  if (model.capabilities.search) tags.push("Search");

  // File support tags
  if (model.capabilities.fileSupport) {
    if (model.capabilities.fileSupport.images?.supported) {
      if (model.capabilities.fileSupport.images.processingMethod === "vision") {
        tags.push("Image Analysis");
      } else {
        tags.push("Image OCR");
      }
    }
    if (model.capabilities.fileSupport.documents?.supported) {
      if (
        model.capabilities.fileSupport.documents.processingMethod ===
        "nativeProcessing"
      ) {
        tags.push("PDF Native");
      } else {
        tags.push("PDF Text");
      }
    }
    if (model.capabilities.fileSupport.audio?.supported) {
      tags.push("Audio");
    }
    if (model.capabilities.fileSupport.video?.supported) {
      tags.push("Video");
    }
    if (model.capabilities.fileSupport.textFiles?.supported) {
      tags.push("Text Files");
    }
  }

  // Context tags
  if (model.contextWindow >= 100000) tags.push("Long Context");

  // Special features
  if (model.name.includes("thinking")) tags.push("Chain of Thought");
  if (model.name.includes("flash")) tags.push("Fast");
  if (model.name.includes("2.0") || model.name.includes("2.5"))
    tags.push("Next-Gen");

  // Cost tags
  if (model.pricing) {
    const totalCost =
      model.pricing.inputCostPer1kTokens + model.pricing.outputCostPer1kTokens;
    if (totalCost < 0.001) tags.push("Budget");
    if (totalCost > 0.01) tags.push("Premium");
  }

  return tags;
}

function getModelTier(model: any): "premium" | "standard" | "economy" {
  if (
    model.name.includes("70b") ||
    model.name.includes("gpt-4") ||
    model.name.includes("claude-3-5") ||
    model.name.includes("2.5")
  ) {
    return "premium";
  }

  if (
    model.name.includes("8b") ||
    model.name.includes("9b") ||
    model.name.includes("flash") ||
    model.name.includes("3.5")
  ) {
    return "economy";
  }

  return "standard";
}
