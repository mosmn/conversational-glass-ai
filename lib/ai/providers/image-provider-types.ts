// Unified image generation provider types and interfaces

export type ImageProvider = "openai" | "replicate" | "gemini" | "stability";

export type ImageModel =
  // OpenAI models
  | "dall-e-3"
  | "dall-e-2"
  // Stable Diffusion models via Replicate
  | "stable-diffusion-xl"
  | "stable-diffusion-v1-5"
  | "stable-diffusion-turbo"
  | "playground-v2-5"
  | "flux-dev"
  | "flux-schnell"
  // Gemini models
  | "imagen-3.0"
  | "imagen-2.0";

export type ImageSize =
  // Standard sizes supported by most providers
  | "512x512"
  | "768x768"
  | "1024x1024"
  | "1152x896"
  | "1216x832"
  | "1344x768"
  | "1536x640"
  // OpenAI specific
  | "256x256"
  | "1792x1024"
  | "1024x1792"
  // Stable Diffusion specific
  | "768x1344"
  | "832x1216"
  | "896x1152"
  | "640x1536";

export type ImageQuality = "draft" | "standard" | "hd" | "ultra";
export type ImageStyle =
  | "natural"
  | "vivid"
  | "artistic"
  | "photographic"
  | "digital-art"
  | "cinematic";

export interface ImageGenerationRequest {
  prompt: string;
  provider: ImageProvider;
  model: ImageModel;
  size?: ImageSize;
  quality?: ImageQuality;
  style?: ImageStyle;
  negativePrompt?: string;
  // Provider-specific settings
  settings?: {
    // Stable Diffusion settings
    steps?: number; // 1-50
    guidance?: number; // 1-20
    strength?: number; // 0-1 for img2img
    scheduler?: string;
    // Gemini settings
    aspectRatio?: string;
    // Universal settings
    seed?: number;
    // OpenAI settings (already handled in openai-image.ts)
  };
  // Context
  userId?: string;
  conversationId?: string;
  messageId?: string;
  addToConversation?: boolean;
}

export interface GeneratedImageResult {
  id: string;
  url: string;
  thumbnailUrl?: string;
  prompt: string;
  revisedPrompt?: string;
  provider: ImageProvider;
  model: ImageModel;
  generationSettings: {
    size: ImageSize;
    quality: ImageQuality;
    style: ImageStyle;
    steps?: number;
    guidance?: number;
    seed?: number;
    negativePrompt?: string;
  };
  dimensions: {
    width: number;
    height: number;
  };
  metadata: {
    generationTime: number;
    estimatedCost: number;
    format: string;
    fileSize?: number;
    // Provider-specific metadata
    providerMetadata?: Record<string, any>;
  };
  createdAt: string;
}

export interface ImageGenerationError {
  type:
    | "api_error"
    | "content_policy"
    | "rate_limit"
    | "quota_exceeded"
    | "invalid_request"
    | "provider_error";
  message: string;
  provider: ImageProvider;
  details?: any;
}

export interface ImageProviderCapabilities {
  id: ImageProvider;
  name: string;
  description: string;
  models: Array<{
    id: ImageModel;
    name: string;
    description: string;
    sizes: ImageSize[];
    qualities: ImageQuality[];
    styles: ImageStyle[];
    maxPromptLength: number;
    supportsNegativePrompt: boolean;
    estimatedSpeed: "fast" | "medium" | "slow";
    costPerImage: {
      [key in ImageQuality]?: number;
    };
  }>;
  features: {
    batchGeneration: boolean;
    imageToImage: boolean;
    inpainting: boolean;
    outpainting: boolean;
    controlNet: boolean;
    customModels: boolean;
  };
  pricing: {
    basePrice: number;
    currency: "USD";
    unit: "image" | "second" | "step";
  };
  limits: {
    maxImagesPerRequest: number;
    maxRequestsPerMinute: number;
    maxPromptLength: number;
  };
}

// Base interface that all providers must implement
export interface ImageProviderInterface {
  readonly provider: ImageProvider;
  readonly capabilities: ImageProviderCapabilities;

  generateImage(request: ImageGenerationRequest): Promise<GeneratedImageResult>;
  testConnection(userId?: string): Promise<{
    success: boolean;
    error?: string;
    modelsAvailable?: string[];
  }>;
  validateRequest(request: ImageGenerationRequest): Promise<{
    valid: boolean;
    errors?: string[];
  }>;
  estimateCost(request: ImageGenerationRequest): number;
}

// Provider registry for dynamic provider loading
export interface ProviderRegistry {
  getProvider(provider: ImageProvider): ImageProviderInterface;
  getAvailableProviders(): ImageProvider[];
  getProviderCapabilities(provider: ImageProvider): ImageProviderCapabilities;
  registerProvider(provider: ImageProviderInterface): void;
}

// Unified error handling
export class ImageGenerationProviderError extends Error {
  constructor(
    public provider: ImageProvider,
    public type: ImageGenerationError["type"],
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "ImageGenerationProviderError";
  }

  toImageError(): ImageGenerationError {
    return {
      type: this.type,
      message: this.message,
      provider: this.provider,
      details: this.details,
    };
  }
}

// Utility functions for provider management
export function getProviderFromModel(model: ImageModel): ImageProvider {
  if (model.startsWith("dall-e")) return "openai";
  if (
    model.startsWith("stable-diffusion") ||
    model.startsWith("flux") ||
    model.startsWith("playground")
  )
    return "replicate";
  if (model.startsWith("imagen")) return "gemini";
  throw new Error(`Unknown model: ${model}`);
}

export function isValidSizeForProvider(
  provider: ImageProvider,
  size: ImageSize
): boolean {
  // This will be implemented with actual provider capabilities
  const capabilities = getProviderCapabilities(provider);
  return capabilities.models.some((model) => model.sizes.includes(size));
}

export function getProviderCapabilities(
  provider: ImageProvider
): ImageProviderCapabilities {
  // This will be filled with actual capabilities
  switch (provider) {
    case "openai":
      return {
        id: "openai",
        name: "OpenAI DALL-E",
        description: "High-quality AI image generation from OpenAI",
        models: [
          {
            id: "dall-e-3",
            name: "DALL-E 3",
            description:
              "Latest model with improved quality and prompt adherence",
            sizes: ["1024x1024", "1792x1024", "1024x1792"],
            qualities: ["standard", "hd"],
            styles: ["natural", "vivid"],
            maxPromptLength: 4000,
            supportsNegativePrompt: false,
            estimatedSpeed: "medium",
            costPerImage: { standard: 0.04, hd: 0.08 },
          },
          {
            id: "dall-e-2",
            name: "DALL-E 2",
            description: "Previous generation model, faster and cheaper",
            sizes: ["256x256", "512x512", "1024x1024"],
            qualities: ["standard"],
            styles: ["natural"],
            maxPromptLength: 1000,
            supportsNegativePrompt: false,
            estimatedSpeed: "fast",
            costPerImage: { standard: 0.02 },
          },
        ],
        features: {
          batchGeneration: false,
          imageToImage: false,
          inpainting: false,
          outpainting: false,
          controlNet: false,
          customModels: false,
        },
        pricing: { basePrice: 0.02, currency: "USD", unit: "image" },
        limits: {
          maxImagesPerRequest: 1,
          maxRequestsPerMinute: 50,
          maxPromptLength: 4000,
        },
      };

    case "replicate":
      return {
        id: "replicate",
        name: "Stable Diffusion (Replicate)",
        description: "Open-source diffusion models via Replicate API",
        models: [
          {
            id: "stable-diffusion-xl",
            name: "Stable Diffusion XL",
            description: "High-resolution model with excellent detail",
            sizes: [
              "512x512",
              "768x768",
              "1024x1024",
              "1152x896",
              "1216x832",
              "1344x768",
              "1536x640",
            ],
            qualities: ["draft", "standard", "hd"],
            styles: [
              "natural",
              "artistic",
              "photographic",
              "digital-art",
              "cinematic",
            ],
            maxPromptLength: 77 * 4, // 77 tokens per chunk, 4 chunks max
            supportsNegativePrompt: true,
            estimatedSpeed: "slow",
            costPerImage: { draft: 0.003, standard: 0.008, hd: 0.015 },
          },
          {
            id: "flux-dev",
            name: "FLUX.1 [dev]",
            description: "State-of-the-art text-to-image model",
            sizes: ["512x512", "768x768", "1024x1024"],
            qualities: ["standard", "hd"],
            styles: ["natural", "artistic", "photographic"],
            maxPromptLength: 512,
            supportsNegativePrompt: true,
            estimatedSpeed: "medium",
            costPerImage: { standard: 0.01, hd: 0.02 },
          },
        ],
        features: {
          batchGeneration: true,
          imageToImage: true,
          inpainting: true,
          outpainting: true,
          controlNet: true,
          customModels: true,
        },
        pricing: { basePrice: 0.003, currency: "USD", unit: "second" },
        limits: {
          maxImagesPerRequest: 4,
          maxRequestsPerMinute: 100,
          maxPromptLength: 512,
        },
      };

    case "gemini":
      return {
        id: "gemini",
        name: "Google Imagen",
        description: "Google's text-to-image generation model",
        models: [
          {
            id: "imagen-3.0",
            name: "Imagen 3.0",
            description: "Latest Google image generation model",
            sizes: ["512x512", "1024x1024", "1152x896", "1216x832"],
            qualities: ["standard", "hd"],
            styles: ["natural", "artistic", "photographic"],
            maxPromptLength: 2048,
            supportsNegativePrompt: true,
            estimatedSpeed: "medium",
            costPerImage: { standard: 0.04, hd: 0.08 },
          },
        ],
        features: {
          batchGeneration: false,
          imageToImage: false,
          inpainting: false,
          outpainting: false,
          controlNet: false,
          customModels: false,
        },
        pricing: { basePrice: 0.04, currency: "USD", unit: "image" },
        limits: {
          maxImagesPerRequest: 1,
          maxRequestsPerMinute: 60,
          maxPromptLength: 2048,
        },
      };

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
