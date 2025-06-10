import {
  ImageProvider,
  ImageProviderInterface,
  ImageProviderCapabilities,
  ImageGenerationRequest,
  GeneratedImageResult,
  ImageGenerationError,
  ImageGenerationProviderError,
  getProviderFromModel,
  getProviderCapabilities,
} from "./image-provider-types";

// Import all provider implementations
import { generateImage as generateOpenAIImage } from "./openai-image";
import { ReplicateImageProvider } from "./replicate-image";
import { GeminiImageProvider } from "./gemini-image";

// Adapter for OpenAI provider to match the interface
class OpenAIImageProviderAdapter implements ImageProviderInterface {
  readonly provider = "openai" as const;
  readonly capabilities: ImageProviderCapabilities;

  constructor() {
    this.capabilities = getProviderCapabilities("openai");
  }

  async generateImage(
    request: ImageGenerationRequest
  ): Promise<GeneratedImageResult> {
    // Convert unified request to OpenAI format
    const openAIRequest = {
      prompt: request.prompt,
      model: request.model as "dall-e-3" | "dall-e-2",
      size: request.size as
        | "1024x1024"
        | "1792x1024"
        | "1024x1792"
        | "256x256"
        | "512x512",
      quality: request.quality as "standard" | "hd",
      style: request.style as "vivid" | "natural",
      userId: request.userId,
    };

    try {
      const result = await generateOpenAIImage(openAIRequest);

      // Convert OpenAI result to unified format
      return {
        id: result.id,
        url: result.url,
        prompt: request.prompt,
        revisedPrompt: result.revisedPrompt,
        provider: "openai",
        model: result.model,
        generationSettings: {
          size: result.generationSettings.size,
          quality: result.generationSettings.quality,
          style: result.generationSettings.style,
        },
        dimensions: result.dimensions,
        metadata: {
          generationTime: result.generationTime,
          estimatedCost: result.estimatedCost,
          format: "png",
        },
        createdAt: new Date().toISOString(),
      };
    } catch (error: any) {
      // Convert OpenAI error to unified format
      throw new ImageGenerationProviderError(
        "openai",
        error.type || "api_error",
        error.message || "Unknown error",
        error.details
      );
    }
  }

  async testConnection(userId?: string): Promise<{
    success: boolean;
    error?: string;
    modelsAvailable?: string[];
  }> {
    try {
      const { testImageGenerationConnection } = await import("./openai-image");
      return await testImageGenerationConnection(userId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  async validateRequest(request: ImageGenerationRequest): Promise<{
    valid: boolean;
    errors?: string[];
  }> {
    const errors: string[] = [];

    // Validate OpenAI specific constraints
    if (!["dall-e-3", "dall-e-2"].includes(request.model)) {
      errors.push(`Model ${request.model} is not supported by OpenAI provider`);
    }

    if (request.model === "dall-e-2") {
      if (!["256x256", "512x512", "1024x1024"].includes(request.size || "")) {
        errors.push(
          "DALL-E 2 only supports sizes: 256x256, 512x512, 1024x1024"
        );
      }
      if (request.quality === "hd") {
        errors.push("DALL-E 2 does not support HD quality");
      }
    }

    if (request.model === "dall-e-3") {
      if (
        !["1024x1024", "1792x1024", "1024x1792"].includes(request.size || "")
      ) {
        errors.push(
          "DALL-E 3 only supports sizes: 1024x1024, 1792x1024, 1024x1792"
        );
      }
    }

    if (request.prompt.length > (request.model === "dall-e-3" ? 4000 : 1000)) {
      errors.push(
        `Prompt too long for ${request.model} (max ${
          request.model === "dall-e-3" ? 4000 : 1000
        } characters)`
      );
    }

    return { valid: errors.length === 0, errors };
  }

  estimateCost(request: ImageGenerationRequest): number {
    const { getAvailableImageModels } = require("./openai-image");
    const models = getAvailableImageModels();
    const model = models.find((m: any) => m.id === request.model);

    if (!model) return 0.04;

    const quality = request.quality || "standard";
    return model.costPerImage[quality] || model.costPerImage.standard || 0.04;
  }
}

// Provider registry implementation
export class ImageProviderRegistry {
  private providers = new Map<ImageProvider, ImageProviderInterface>();
  private static instance: ImageProviderRegistry | null = null;

  constructor() {
    // Register all available providers
    this.registerProvider(new OpenAIImageProviderAdapter());
    this.registerProvider(new ReplicateImageProvider());
    this.registerProvider(new GeminiImageProvider());
  }

  static getInstance(): ImageProviderRegistry {
    if (!ImageProviderRegistry.instance) {
      ImageProviderRegistry.instance = new ImageProviderRegistry();
    }
    return ImageProviderRegistry.instance;
  }

  registerProvider(provider: ImageProviderInterface): void {
    this.providers.set(provider.provider, provider);
    console.log(`📝 Registered image provider: ${provider.provider}`);
  }

  getProvider(provider: ImageProvider): ImageProviderInterface {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      throw new Error(`Provider ${provider} is not registered`);
    }
    return providerInstance;
  }

  getAvailableProviders(): ImageProvider[] {
    return Array.from(this.providers.keys());
  }

  getProviderCapabilities(provider: ImageProvider): ImageProviderCapabilities {
    const providerInstance = this.getProvider(provider);
    return providerInstance.capabilities;
  }

  getAllProviderCapabilities(): Record<
    ImageProvider,
    ImageProviderCapabilities
  > {
    const capabilities: Partial<
      Record<ImageProvider, ImageProviderCapabilities>
    > = {};

    for (const [provider, instance] of this.providers) {
      capabilities[provider] = instance.capabilities;
    }

    return capabilities as Record<ImageProvider, ImageProviderCapabilities>;
  }

  /**
   * Generate an image using the appropriate provider
   */
  async generateImage(
    request: ImageGenerationRequest
  ): Promise<GeneratedImageResult> {
    const provider = this.getProvider(request.provider);

    console.log(`🎨 Routing image generation to ${request.provider}:`, {
      model: request.model,
      size: request.size,
      provider: request.provider,
    });

    try {
      const result = await provider.generateImage(request);

      console.log(`✅ Image generated successfully via ${request.provider}:`, {
        id: result.id,
        generationTime: result.metadata.generationTime,
        cost: result.metadata.estimatedCost,
      });

      return result;
    } catch (error) {
      console.error(
        `❌ Image generation failed via ${request.provider}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Test connection to a specific provider
   */
  async testProviderConnection(
    provider: ImageProvider,
    userId?: string
  ): Promise<{
    provider: ImageProvider;
    success: boolean;
    error?: string;
    modelsAvailable?: string[];
  }> {
    try {
      const providerInstance = this.getProvider(provider);
      const result = await providerInstance.testConnection(userId);

      return {
        provider,
        ...result,
      };
    } catch (error) {
      return {
        provider,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Test connections to all providers
   */
  async testAllConnections(userId?: string): Promise<
    Array<{
      provider: ImageProvider;
      success: boolean;
      error?: string;
      modelsAvailable?: string[];
    }>
  > {
    const providers = this.getAvailableProviders();
    const results = await Promise.allSettled(
      providers.map((provider) => this.testProviderConnection(provider, userId))
    );

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          provider: providers[index],
          success: false,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : "Test failed",
        };
      }
    });
  }

  /**
   * Validate a request for a specific provider
   */
  async validateRequest(request: ImageGenerationRequest): Promise<{
    valid: boolean;
    errors?: string[];
  }> {
    try {
      const provider = this.getProvider(request.provider);
      return await provider.validateRequest(request);
    } catch (error) {
      return {
        valid: false,
        errors: [
          error instanceof Error ? error.message : "Unknown validation error",
        ],
      };
    }
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(request: ImageGenerationRequest): number {
    try {
      const provider = this.getProvider(request.provider);
      return provider.estimateCost(request);
    } catch (error) {
      console.warn(`Could not estimate cost for ${request.provider}:`, error);
      return 0;
    }
  }

  /**
   * Get the best provider for a given model
   */
  getProviderForModel(model: string): ImageProvider {
    try {
      return getProviderFromModel(model as any);
    } catch (error) {
      // Fallback to OpenAI if model provider cannot be determined
      return "openai";
    }
  }

  /**
   * Get all available models across all providers
   */
  getAllAvailableModels(): Array<{
    provider: ImageProvider;
    model: string;
    name: string;
    description: string;
    capabilities: any;
  }> {
    const allModels: Array<{
      provider: ImageProvider;
      model: string;
      name: string;
      description: string;
      capabilities: any;
    }> = [];

    for (const [provider, instance] of this.providers) {
      const capabilities = instance.capabilities;

      for (const model of capabilities.models) {
        allModels.push({
          provider,
          model: model.id,
          name: model.name,
          description: model.description,
          capabilities: {
            sizes: model.sizes,
            qualities: model.qualities,
            styles: model.styles,
            maxPromptLength: model.maxPromptLength,
            supportsNegativePrompt: model.supportsNegativePrompt,
            estimatedSpeed: model.estimatedSpeed,
            costPerImage: model.costPerImage,
          },
        });
      }
    }

    return allModels.sort((a, b) => {
      // Sort by provider preference: openai, replicate, gemini
      const providerOrder = {
        openai: 0,
        replicate: 1,
        gemini: 2,
        stability: 3,
      };
      return (
        (providerOrder[a.provider] || 999) - (providerOrder[b.provider] || 999)
      );
    });
  }

  /**
   * Get comparison data between providers
   */
  getProviderComparison(): Array<{
    provider: ImageProvider;
    name: string;
    description: string;
    modelCount: number;
    features: Record<string, boolean>;
    pricing: {
      basePrice: number;
      currency: string;
      unit: string;
    };
    strengths: string[];
    limitations: string[];
  }> {
    const comparison: Array<{
      provider: ImageProvider;
      name: string;
      description: string;
      modelCount: number;
      features: Record<string, boolean>;
      pricing: {
        basePrice: number;
        currency: string;
        unit: string;
      };
      strengths: string[];
      limitations: string[];
    }> = [];

    for (const [provider, instance] of this.providers) {
      const capabilities = instance.capabilities;

      // Define strengths and limitations for each provider
      let strengths: string[] = [];
      let limitations: string[] = [];

      switch (provider) {
        case "openai":
          strengths = [
            "High quality",
            "Excellent prompt understanding",
            "Reliable API",
            "Good for beginners",
          ];
          limitations = [
            "More expensive",
            "No negative prompts",
            "Limited customization",
          ];
          break;
        case "replicate":
          strengths = [
            "Open source models",
            "Highly customizable",
            "Negative prompts",
            "Cost effective",
          ];
          limitations = [
            "Slower generation",
            "More complex",
            "Variable quality",
          ];
          break;
        case "gemini":
          strengths = [
            "Google backing",
            "Future potential",
            "Multi-modal integration",
          ];
          limitations = [
            "Not yet available",
            "Limited information",
            "Unproven in practice",
          ];
          break;
      }

      comparison.push({
        provider,
        name: capabilities.name,
        description: capabilities.description,
        modelCount: capabilities.models.length,
        features: capabilities.features,
        pricing: capabilities.pricing,
        strengths,
        limitations,
      });
    }

    return comparison;
  }
}

// Export singleton instance
export const imageProviderRegistry = ImageProviderRegistry.getInstance();

// Export utility functions
export { OpenAIImageProviderAdapter };
