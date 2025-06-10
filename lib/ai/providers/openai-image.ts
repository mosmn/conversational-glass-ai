import OpenAI from "openai";
import { z } from "zod";
import { BYOKManager } from "./byok-manager";

// OpenAI Image Generation Types
export type DallEModel = "dall-e-3" | "dall-e-2";
export type DallESize =
  | "1024x1024"
  | "1792x1024"
  | "1024x1792"
  | "256x256"
  | "512x512";
export type DallEQuality = "standard" | "hd";
export type DallEStyle = "vivid" | "natural";

export interface ImageGenerationRequest {
  prompt: string;
  model?: DallEModel;
  size?: DallESize;
  quality?: DallEQuality;
  style?: DallEStyle;
  n?: number;
  userId?: string; // For BYOK support
}

export interface GeneratedImageResult {
  id: string;
  url: string;
  revisedPrompt?: string;
  provider: "openai";
  model: DallEModel;
  generationSettings: {
    size: DallESize;
    quality: DallEQuality;
    style: DallEStyle;
  };
  dimensions: {
    width: number;
    height: number;
  };
  estimatedCost: number;
  generationTime: number;
}

export interface ImageGenerationError {
  type:
    | "api_error"
    | "content_policy"
    | "rate_limit"
    | "quota_exceeded"
    | "invalid_request";
  message: string;
  details?: any;
}

// Validation schema for image generation requests
const imageGenerationSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(4000, "Prompt must be 4000 characters or less"),
  model: z.enum(["dall-e-3", "dall-e-2"]).optional().default("dall-e-3"),
  size: z
    .enum(["1024x1024", "1792x1024", "1024x1792", "256x256", "512x512"])
    .optional()
    .default("1024x1024"),
  quality: z.enum(["standard", "hd"]).optional().default("standard"),
  style: z.enum(["vivid", "natural"]).optional().default("vivid"),
  n: z.number().int().min(1).max(4).optional().default(1),
  userId: z.string().optional(),
});

// OpenAI client cache for different API keys
const clientCache = new Map<string, OpenAI>();

async function getOpenAIClient(userId?: string): Promise<OpenAI> {
  try {
    // Get API key using BYOK manager (with graceful fallback to environment)
    const keyConfig = await BYOKManager.getApiKeyWithFallback(
      "openai",
      "OPENAI_API_KEY",
      userId
    );

    if (!keyConfig) {
      throw new Error(
        "OpenAI API key not found. Please add your OpenAI API key in Settings > API Keys or configure OPENAI_API_KEY environment variable."
      );
    }

    // Create cache key (using last 8 chars of API key + user indicator)
    const keyHash = keyConfig.apiKey.slice(-8);
    const userIndicator = keyConfig.isUserKey ? `user:${userId}` : "env";
    const cacheKey = `openai-image:${keyHash}:${userIndicator}`;

    // Use cached client if available
    const cachedClient = clientCache.get(cacheKey);
    if (cachedClient) {
      return cachedClient;
    }

    // Create new client
    const client = new OpenAI({
      apiKey: keyConfig.apiKey,
      organization: process.env.OPENAI_ORG_ID,
      project: process.env.OPENAI_PROJECT_ID,
    });

    // Cache the client
    clientCache.set(cacheKey, client);

    // Clean up old clients to prevent memory leaks
    if (clientCache.size > 10) {
      const firstKey = clientCache.keys().next().value;
      if (firstKey) {
        clientCache.delete(firstKey);
      }
    }

    return client;
  } catch (error) {
    throw new Error(
      "Failed to initialize OpenAI client for image generation. Please check your API key configuration."
    );
  }
}

// Parse image dimensions from size string
function parseDimensions(size: DallESize): { width: number; height: number } {
  const [width, height] = size.split("x").map(Number);
  return { width, height };
}

// Estimate cost based on model and settings
function estimateCost(
  model: DallEModel,
  quality: DallEQuality,
  size: DallESize
): number {
  if (model === "dall-e-3") {
    // DALL-E 3 pricing
    if (quality === "hd") {
      if (size === "1024x1024") return 0.08;
      if (size === "1792x1024" || size === "1024x1792") return 0.12;
    } else {
      // Standard quality
      if (size === "1024x1024") return 0.04;
      if (size === "1792x1024" || size === "1024x1792") return 0.08;
    }
  } else if (model === "dall-e-2") {
    // DALL-E 2 pricing
    if (size === "1024x1024") return 0.02;
    if (size === "512x512") return 0.018;
    if (size === "256x256") return 0.016;
  }

  return 0.04; // Default fallback
}

// Validate model and size compatibility
function validateModelSettings(
  model: DallEModel,
  size: DallESize,
  quality: DallEQuality
): void {
  if (model === "dall-e-2") {
    // DALL-E 2 constraints
    if (!["256x256", "512x512", "1024x1024"].includes(size)) {
      throw new Error(
        "DALL-E 2 only supports sizes: 256x256, 512x512, 1024x1024"
      );
    }
    if (quality === "hd") {
      throw new Error("DALL-E 2 does not support HD quality");
    }
  } else if (model === "dall-e-3") {
    // DALL-E 3 constraints
    if (!["1024x1024", "1792x1024", "1024x1792"].includes(size)) {
      throw new Error(
        "DALL-E 3 only supports sizes: 1024x1024, 1792x1024, 1024x1792"
      );
    }
  }
}

/**
 * Generate an image using OpenAI's DALL-E models
 */
export async function generateImage(
  request: ImageGenerationRequest
): Promise<GeneratedImageResult> {
  const startTime = Date.now();

  try {
    // Validate and parse request
    const validatedRequest = imageGenerationSchema.parse(request);
    const { prompt, model, size, quality, style, n, userId } = validatedRequest;

    // Validate model settings compatibility
    validateModelSettings(model, size, quality);

    // Get OpenAI client with BYOK support
    const client = await getOpenAIClient(userId);

    console.log(`🎨 Generating image with DALL-E:`, {
      model,
      size,
      quality,
      style,
      promptLength: prompt.length,
      userId: userId ? "provided" : "none",
    });

    // Generate image
    const response = await client.images.generate({
      model,
      prompt,
      size,
      quality: model === "dall-e-3" ? quality : undefined, // Only DALL-E 3 supports quality
      style: model === "dall-e-3" ? style : undefined, // Only DALL-E 3 supports style
      n,
      response_format: "url",
    });

    const generationTime = (Date.now() - startTime) / 1000;

    if (!response.data || response.data.length === 0) {
      throw new Error("No image data returned from OpenAI");
    }

    const imageData = response.data[0];

    if (!imageData?.url) {
      throw new Error("No image URL returned from OpenAI");
    }

    const dimensions = parseDimensions(size);
    const estimatedCost = estimateCost(model, quality, size);

    const result: GeneratedImageResult = {
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: imageData.url,
      revisedPrompt: imageData.revised_prompt,
      provider: "openai",
      model,
      generationSettings: {
        size,
        quality,
        style,
      },
      dimensions,
      estimatedCost,
      generationTime,
    };

    console.log(`✅ Image generated successfully:`, {
      id: result.id,
      url: result.url.substring(0, 50) + "...",
      revisedPrompt: result.revisedPrompt?.substring(0, 100) + "...",
      generationTime: result.generationTime,
      estimatedCost: result.estimatedCost,
    });

    return result;
  } catch (error) {
    const generationTime = (Date.now() - startTime) / 1000;

    console.error("DALL-E image generation failed:", {
      error: error instanceof Error ? error.message : String(error),
      generationTime,
      prompt: request.prompt?.substring(0, 100) + "...",
    });

    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      const imageError: ImageGenerationError = {
        type: getErrorType(error.status),
        message: getErrorMessage(error),
        details: {
          status: error.status,
          code: error.code,
          type: error.type,
        },
      };
      throw imageError;
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const imageError: ImageGenerationError = {
        type: "invalid_request",
        message: "Invalid request parameters",
        details: error.errors,
      };
      throw imageError;
    }

    // Handle generic errors
    const imageError: ImageGenerationError = {
      type: "api_error",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
    throw imageError;
  }
}

/**
 * Get specific error type from OpenAI status code
 */
function getErrorType(status: number): ImageGenerationError["type"] {
  switch (status) {
    case 400:
      return "invalid_request";
    case 401:
      return "api_error";
    case 403:
      return "content_policy";
    case 429:
      return "rate_limit";
    case 402:
    case 499:
      return "quota_exceeded";
    default:
      return "api_error";
  }
}

/**
 * Get user-friendly error message from OpenAI error
 */
function getErrorMessage(error: any): string {
  switch (error.status) {
    case 400:
      if (error.message.includes("content_policy")) {
        return "Your prompt was rejected due to content policy. Please try a different prompt.";
      }
      return `Invalid request: ${error.message}`;
    case 401:
      return "Invalid OpenAI API key. Please check your API key in Settings > API Keys.";
    case 403:
      return "Your prompt violates OpenAI's content policy. Please try a different prompt.";
    case 429:
      return "Rate limit exceeded. Please wait a moment and try again.";
    case 402:
      return "Insufficient credits. Please check your OpenAI account billing.";
    case 499:
      return "Your request was terminated due to quota limits.";
    default:
      return `OpenAI API error: ${error.message}`;
  }
}

/**
 * Test connection to OpenAI Images API
 */
export async function testImageGenerationConnection(userId?: string): Promise<{
  success: boolean;
  error?: string;
  modelsAvailable?: string[];
}> {
  try {
    const client = await getOpenAIClient(userId);

    // Try to list available models to verify API access
    const models = await client.models.list();
    const imageModels = models.data
      .filter((model) => model.id.includes("dall-e"))
      .map((model) => model.id);

    return {
      success: true,
      modelsAvailable: imageModels,
    };
  } catch (error) {
    console.error("OpenAI Images API connection test failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

/**
 * Get available DALL-E models and their capabilities
 */
export function getAvailableImageModels(): Array<{
  id: DallEModel;
  name: string;
  sizes: DallESize[];
  qualities: DallEQuality[];
  styles: DallEStyle[];
  maxPromptLength: number;
  costPerImage: { standard: number; hd?: number };
}> {
  return [
    {
      id: "dall-e-3",
      name: "DALL-E 3",
      sizes: ["1024x1024", "1792x1024", "1024x1792"],
      qualities: ["standard", "hd"],
      styles: ["vivid", "natural"],
      maxPromptLength: 4000,
      costPerImage: {
        standard: 0.04, // for 1024x1024
        hd: 0.08, // for 1024x1024
      },
    },
    {
      id: "dall-e-2",
      name: "DALL-E 2",
      sizes: ["256x256", "512x512", "1024x1024"],
      qualities: ["standard"],
      styles: ["natural"], // DALL-E 2 doesn't have style control but we default to natural
      maxPromptLength: 1000,
      costPerImage: {
        standard: 0.02, // for 1024x1024
      },
    },
  ];
}
