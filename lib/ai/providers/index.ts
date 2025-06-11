import {
  AIProvider,
  AIModel,
  ModelId,
  ChatMessage,
  StreamingChunk,
  StreamingOptions,
  AIProviderError,
  ModelNotFoundError,
} from "../types";
import { getProviderFromModelId } from "../utils";
import { openaiProvider } from "./openai";
import { groqProvider } from "./groq";
import { claudeProvider } from "./claude";
import { geminiProvider } from "./gemini";
import { openrouterProvider } from "./openrouter";

// Provider registry
export const providers: Record<string, AIProvider> = {
  openai: openaiProvider,
  groq: groqProvider,
  claude: claudeProvider,
  gemini: geminiProvider,
  openrouter: openrouterProvider,
};

// Get all configured providers
export function getConfiguredProviders(): AIProvider[] {
  return Object.values(providers).filter((provider) => provider.isConfigured);
}

// Get all available models from all configured providers (async for dynamic loading)
export async function getAllModels(): Promise<AIModel[]> {
  const allModels: AIModel[] = [];

  for (const provider of getConfiguredProviders()) {
    // Ensure dynamic models are loaded (for all providers with dynamic loading)
    if (
      (provider.name === "groq" ||
        provider.name === "gemini" ||
        provider.name === "openai" ||
        provider.name === "claude" ||
        provider.name === "openrouter") &&
      "ensureModelsLoaded" in provider
    ) {
      await (provider as any).ensureModelsLoaded();
    }

    allModels.push(...Object.values(provider.models));
  }

  return allModels;
}

// Synchronous version for compatibility (may not include all Groq models)
export function getAllModelsSync(): AIModel[] {
  const allModels: AIModel[] = [];

  for (const provider of getConfiguredProviders()) {
    allModels.push(...Object.values(provider.models));
  }

  return allModels;
}

// Get models grouped by provider
export function getModelsByProvider(): Record<string, AIModel[]> {
  const modelsByProvider: Record<string, AIModel[]> = {};

  for (const provider of getConfiguredProviders()) {
    modelsByProvider[provider.name] = Object.values(provider.models);
  }

  return modelsByProvider;
}

// Get a specific model by ID (async version for dynamic loading)
export async function getModelById(modelId: ModelId): Promise<AIModel | null> {
  const providerName = getProviderFromModelId(modelId);
  const provider = providers[providerName];

  if (!provider || !provider.isConfigured) {
    return null;
  }

  // Ensure dynamic models are loaded (for all providers with dynamic loading)
  if (
    (provider.name === "groq" ||
      provider.name === "gemini" ||
      provider.name === "openai" ||
      provider.name === "claude" ||
      provider.name === "openrouter") &&
    "ensureModelsLoaded" in provider
  ) {
    await (provider as any).ensureModelsLoaded();
  }

  return provider.models[modelId] || null;
}

// Synchronous version for backwards compatibility (may not include all dynamic models)
export function getModelByIdSync(modelId: ModelId): AIModel | null {
  const providerName = getProviderFromModelId(modelId);
  const provider = providers[providerName];

  if (!provider || !provider.isConfigured) {
    return null;
  }

  return provider.models[modelId] || null;
}

// Get provider by name
export function getProvider(providerName: string): AIProvider | null {
  const provider = providers[providerName];
  return provider?.isConfigured ? provider : null;
}

// Get provider for a specific model
export function getProviderForModel(modelId: ModelId): AIProvider | null {
  const providerName = getProviderFromModelId(modelId);
  return getProvider(providerName);
}

// Create streaming completion with automatic provider routing
export async function* createStreamingCompletion(
  messages: ChatMessage[],
  modelId: ModelId,
  options: StreamingOptions = {}
): AsyncIterable<StreamingChunk> {
  // CRITICAL DEBUG: Log the model routing details
  console.log("🎯 createStreamingCompletion - Provider Routing:");
  console.log("  🤖 Model ID:", modelId);
  console.log("  🔍 Looking up provider for model...");

  const provider = getProviderForModel(modelId);

  console.log(
    "  🏢 Provider found:",
    provider ? provider.name : "❌ NOT FOUND"
  );

  if (!provider) {
    const providerName = getProviderFromModelId(modelId);
    console.log("  ⚠️ Provider name from model ID:", providerName);
    throw new AIProviderError(
      `Provider '${providerName}' is not configured or available`,
      providerName
    );
  }

  const model = await getModelById(modelId);
  console.log("  🧠 Model object found:", model ? model.name : "❌ NOT FOUND");

  if (!model) {
    throw new ModelNotFoundError(modelId, provider.name);
  }

  console.log("  ✅ Delegating to provider:", provider.name);
  console.log("  📝 Final model being used:", modelId);

  // Delegate to the appropriate provider
  yield* provider.createStreamingCompletion(messages, modelId, options);
}

// Test all provider connections
export async function testAllProviders(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  for (const [name, provider] of Object.entries(providers)) {
    if (provider.isConfigured) {
      try {
        results[name] = await provider.testConnection();
      } catch {
        results[name] = false;
      }
    } else {
      results[name] = false;
    }
  }

  return results;
}

// Get provider status summary (async version for dynamic loading)
export async function getProviderStatus() {
  const status = {
    total: Object.keys(providers).length,
    configured: 0,
    available: 0,
    models: 0,
    providers: {} as Record<
      string,
      {
        configured: boolean;
        modelCount: number;
        models: string[];
      }
    >,
  };

  for (const [name, provider] of Object.entries(providers)) {
    const isConfigured = provider.isConfigured;

    // Ensure dynamic models are loaded for all providers with dynamic loading
    if (
      isConfigured &&
      (provider.name === "groq" ||
        provider.name === "gemini" ||
        provider.name === "openai" ||
        provider.name === "claude" ||
        provider.name === "openrouter") &&
      "ensureModelsLoaded" in provider
    ) {
      try {
        await (provider as any).ensureModelsLoaded();
      } catch (error) {
        console.warn(`Failed to load ${provider.name} models:`, error);
      }
    }

    const modelList = Object.keys(provider.models);

    status.providers[name] = {
      configured: isConfigured,
      modelCount: modelList.length,
      models: modelList,
    };

    if (isConfigured) {
      status.configured++;
      status.available++;
      status.models += modelList.length;
    }
  }

  return status;
}

// Synchronous provider status (may not include dynamic models)
export function getProviderStatusSync() {
  const status = {
    total: Object.keys(providers).length,
    configured: 0,
    available: 0,
    models: 0,
    providers: {} as Record<
      string,
      {
        configured: boolean;
        modelCount: number;
        models: string[];
      }
    >,
  };

  for (const [name, provider] of Object.entries(providers)) {
    const isConfigured = provider.isConfigured;
    const modelList = Object.keys(provider.models);

    status.providers[name] = {
      configured: isConfigured,
      modelCount: modelList.length,
      models: modelList,
    };

    if (isConfigured) {
      status.configured++;
      status.available++;
      status.models += modelList.length;
    }
  }

  return status;
}

// Default model recommendations
export async function getDefaultModel(): Promise<ModelId | null> {
  // Prefer faster, cheaper models for default experience
  const preferences: ModelId[] = [
    "llama-3.1-8b-instant", // Fastest and cheapest
    "claude-3-haiku-20240307", // Fast Claude model
    "gemini-1.5-flash", // Fast Gemini model
    "gpt-3.5-turbo", // Reliable OpenAI option
    "gemma2-9b-it", // Good balance
    "claude-3-5-sonnet-20241022", // Most capable Claude model
    "gemini-1.5-pro", // Most capable Gemini model
    "llama-3.3-70b-versatile", // Most capable Groq model
    "gpt-4", // Most capable overall
  ];

  for (const modelId of preferences) {
    const model = await getModelById(modelId);
    if (model) {
      return modelId;
    }
  }

  // Fallback to first available model
  const allModels = await getAllModels();
  return allModels.length > 0 ? (allModels[0].id as ModelId) : null;
}

// Get recommended models for different use cases
export async function getRecommendedModels() {
  const allModels = await getAllModels();

  return {
    fastest:
      (allModels
        .filter(
          (m) =>
            m.provider === "groq" ||
            m.name.includes("Haiku") ||
            m.name.includes("Flash")
        )
        .sort((a, b) => {
          // Prioritize specific fast models, then smaller parameter models
          if (a.name.includes("Flash")) return -1;
          if (b.name.includes("Flash")) return 1;
          if (a.name.includes("Haiku")) return -1;
          if (b.name.includes("Haiku")) return 1;

          const aParams = parseInt(a.name.match(/(\d+)b/i)?.[1] || "0");
          const bParams = parseInt(b.name.match(/(\d+)b/i)?.[1] || "0");
          return aParams - bParams;
        })[0]?.id as ModelId) || null,

    smartest:
      (allModels.sort((a, b) => b.contextWindow - a.contextWindow)[0]
        ?.id as ModelId) || null,

    cheapest:
      (allModels
        .filter((m) => m.pricing)
        .sort((a, b) => {
          const aCost =
            (a.pricing?.inputCostPer1kTokens || 0) +
            (a.pricing?.outputCostPer1kTokens || 0);
          const bCost =
            (b.pricing?.inputCostPer1kTokens || 0) +
            (b.pricing?.outputCostPer1kTokens || 0);
          return aCost - bCost;
        })[0]?.id as ModelId) || null,

    balanced: await getDefaultModel(),
  };
}

// Export individual providers for direct access if needed
export { openaiProvider } from "./openai";
export { groqProvider } from "./groq";
export { claudeProvider } from "./claude";
export { geminiProvider } from "./gemini";

// Export types
export type { AIProvider, AIModel } from "../types";
