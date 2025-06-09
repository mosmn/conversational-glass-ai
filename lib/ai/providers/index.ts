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

// Provider registry
export const providers: Record<string, AIProvider> = {
  openai: openaiProvider,
  groq: groqProvider,
};

// Get all configured providers
export function getConfiguredProviders(): AIProvider[] {
  return Object.values(providers).filter((provider) => provider.isConfigured);
}

// Get all available models from all configured providers
export function getAllModels(): AIModel[] {
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

// Get a specific model by ID
export function getModelById(modelId: ModelId): AIModel | null {
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
  const provider = getProviderForModel(modelId);

  if (!provider) {
    const providerName = getProviderFromModelId(modelId);
    throw new AIProviderError(
      `Provider '${providerName}' is not configured or available`,
      providerName
    );
  }

  const model = getModelById(modelId);
  if (!model) {
    throw new ModelNotFoundError(modelId, provider.name);
  }

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

// Get provider status summary
export function getProviderStatus() {
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
export function getDefaultModel(): ModelId | null {
  // Prefer faster, cheaper models for default experience
  const preferences: ModelId[] = [
    "llama-3.1-8b-instant", // Fastest and cheapest
    "gpt-3.5-turbo", // Reliable OpenAI option
    "gemma2-9b-it", // Good balance
    "llama-3.3-70b-versatile", // Most capable Groq model
    "gpt-4", // Most capable overall
  ];

  for (const modelId of preferences) {
    const model = getModelById(modelId);
    if (model) {
      return modelId;
    }
  }

  // Fallback to first available model
  const allModels = getAllModels();
  return allModels.length > 0 ? (allModels[0].id as ModelId) : null;
}

// Get recommended models for different use cases
export function getRecommendedModels() {
  const allModels = getAllModels();

  return {
    fastest:
      (allModels
        .filter((m) => m.provider === "groq")
        .sort((a, b) => {
          // Prioritize smaller parameter models for speed
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

    balanced: getDefaultModel(),
  };
}

// Export individual providers for direct access if needed
export { openaiProvider } from "./openai";
export { groqProvider } from "./groq";

// Export types
export type { AIProvider, AIModel } from "../types";
