import { NextResponse } from "next/server";
import {
  getAllModels,
  getModelsByProvider,
  getProviderStatus,
  getRecommendedModels,
  getDefaultModel,
} from "@/lib/ai/providers";

export async function GET() {
  try {
    const allModels = getAllModels();
    const modelsByProvider = getModelsByProvider();
    const providerStatus = getProviderStatus();
    const recommendedModels = getRecommendedModels();
    const defaultModel = getDefaultModel();

    // Format models with additional UI metadata
    const formattedModels = allModels.map((model) => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
      description: model.description,
      personality: model.personality,
      contextWindow: model.contextWindow,
      maxResponseTokens: model.maxResponseTokens,
      visualConfig: model.visualConfig,
      capabilities: model.capabilities,
      pricing: model.pricing,
      // Add performance indicators
      performance: {
        speed: getSpeedRating(model),
        capacity: getCapacityRating(model),
        efficiency: getEfficiencyRating(model),
      },
      // Add UI hints
      uiHints: {
        bestFor: getBestUseCase(model),
        tags: getModelTags(model),
        tier: getModelTier(model),
      },
    }));

    return NextResponse.json({
      success: true,
      data: {
        models: formattedModels,
        modelsByProvider,
        providerStatus,
        recommendations: {
          default: defaultModel,
          fastest: recommendedModels.fastest,
          smartest: recommendedModels.smartest,
          cheapest: recommendedModels.cheapest,
          balanced: recommendedModels.balanced,
        },
        statistics: {
          totalModels: allModels.length,
          totalProviders: providerStatus.total,
          configuredProviders: providerStatus.configured,
          availableModels: allModels.length,
        },
      },
    });
  } catch (error) {
    console.error("Models API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch models",
        data: {
          models: [],
          modelsByProvider: {},
          providerStatus: {
            total: 0,
            configured: 0,
            available: 0,
            models: 0,
            providers: {},
          },
          recommendations: {},
          statistics: {
            totalModels: 0,
            totalProviders: 0,
            configuredProviders: 0,
            availableModels: 0,
          },
        },
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
    default:
      return "General assistance";
  }
}

function getModelTags(model: any): string[] {
  const tags: string[] = [];

  // Provider tags
  if (model.provider === "groq") tags.push("Ultra-fast");
  if (model.provider === "openai") tags.push("Reliable");

  // Size tags
  if (model.name.includes("70b")) tags.push("Large");
  if (model.name.includes("8b") || model.name.includes("9b"))
    tags.push("Efficient");

  // Capability tags
  if (model.capabilities.functionCalling) tags.push("Function Calling");
  if (model.capabilities.multiModal) tags.push("Multi-modal");

  // Context tags
  if (model.contextWindow >= 100000) tags.push("Long Context");

  // Cost tags
  if (model.pricing) {
    const totalCost =
      model.pricing.inputCostPer1kTokens + model.pricing.outputCostPer1kTokens;
    if (totalCost < 0.001) tags.push("Low Cost");
  }

  return tags;
}

function getModelTier(model: any): "premium" | "standard" | "economy" {
  if (model.name.includes("70b") || model.name.includes("gpt-4")) {
    return "premium";
  }

  if (model.name.includes("8b") || model.name.includes("9b")) {
    return "economy";
  }

  return "standard";
}
