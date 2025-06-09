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

    // Enhance models with additional metadata
    const enhancedModels = allModels.map((model) => ({
      ...model,
      performance: {
        speed: getSpeedRating(model),
        capacity: getCapacityRating(model),
        efficiency: getEfficiencyRating(model),
      },
      isRecommended: isRecommendedModel(model),
      isNew: isNewModel(model),
      tags: getModelTags(model),
      tier: getModelTier(model),
      bestUseCase: getBestUseCase(model),
    }));

    // Get provider status (async for dynamic loading)
    const providerStatus = await getProviderStatus();

    return NextResponse.json({
      success: true,
      data: {
        models: enhancedModels,
        providerStatus,
        totalModels: enhancedModels.length,
        recommendations: enhancedModels.filter((m) => m.isRecommended),
        newModels: enhancedModels.filter((m) => m.isNew),
      },
    });
  } catch (error) {
    console.error("Failed to fetch models:", error);

    return NextResponse.json(
      {
        success: false,
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
    if (totalCost < 0.001) tags.push("Low Cost");
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
