import { useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";

// Image generation types
export interface ImageGenerationRequest {
  prompt: string;
  provider?: "openai" | "replicate" | "gemini";
  model?: string;
  size?: string;
  quality?: "draft" | "standard" | "hd" | "ultra";
  style?:
    | "natural"
    | "vivid"
    | "artistic"
    | "photographic"
    | "digital-art"
    | "cinematic";
  negativePrompt?: string;
  settings?: {
    steps?: number;
    guidance?: number;
    seed?: number;
  };
  conversationId?: string;
  messageId?: string;
  addToConversation?: boolean;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  revisedPrompt?: string;
  provider: string;
  model: string;
  generationSettings: {
    size: string;
    quality: string;
    style: string;
  };
  dimensions: {
    width: number;
    height: number;
  };
  generationTime: number;
  estimatedCost: number;
  createdAt: string;
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

export interface ImageGenerationState {
  isGenerating: boolean;
  images: GeneratedImage[];
  error: ImageGenerationError | null;
  progress: number; // 0-100
}

export interface ImageHistoryFilters {
  provider?: string;
  model?: string;
  status?: "pending" | "completed" | "failed" | "deleted";
  startDate?: string;
  endDate?: string;
  sortBy?: "date" | "cost" | "prompt";
  sortOrder?: "asc" | "desc";
}

export interface ImageHistoryResult {
  images: Array<
    GeneratedImage & {
      conversation?: { id: string; title: string };
    }
  >;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  summary: {
    totalCost: number;
    providersUsed: string[];
    modelsUsed: string[];
  };
}

export function useImageGeneration() {
  const { user } = useUser();
  const [state, setState] = useState<ImageGenerationState>({
    isGenerating: false,
    images: [],
    error: null,
    progress: 0,
  });

  /**
   * Generate a new image
   */
  const generateImage = useCallback(
    async (request: ImageGenerationRequest): Promise<GeneratedImage | null> => {
      if (!user) {
        setState((prev) => ({
          ...prev,
          error: {
            type: "api_error",
            message:
              "Authentication required. Please sign in to generate images.",
          },
        }));
        return null;
      }

      setState((prev) => ({
        ...prev,
        isGenerating: true,
        error: null,
        progress: 0,
      }));

      try {
        console.log("🎨 Starting image generation:", {
          prompt: request.prompt.substring(0, 100) + "...",
          model: request.model,
          size: request.size,
          conversationId: request.conversationId,
        });

        // Update progress to show we're starting
        setState((prev) => ({ ...prev, progress: 10 }));

        const response = await fetch("/api/images/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        });

        // Update progress as we process
        setState((prev) => ({ ...prev, progress: 50 }));

        const data = await response.json();

        if (!response.ok) {
          throw {
            type: data.type || "api_error",
            message: data.error || "Image generation failed",
            details: data.details,
          } as ImageGenerationError;
        }

        // Complete progress
        setState((prev) => ({ ...prev, progress: 100 }));

        const generatedImage = data.image as GeneratedImage;

        console.log("✅ Image generation completed:", {
          id: generatedImage.id,
          url: generatedImage.url.substring(0, 50) + "...",
          generationTime: generatedImage.generationTime,
          cost: generatedImage.estimatedCost,
        });

        // Add to state
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          images: [generatedImage, ...prev.images],
          progress: 0,
        }));

        return generatedImage;
      } catch (error) {
        console.error("Image generation failed:", error);

        const imageError = error as ImageGenerationError;
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: imageError,
          progress: 0,
        }));

        return null;
      }
    },
    [user]
  );

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Clear all generated images from state
   */
  const clearImages = useCallback(() => {
    setState((prev) => ({ ...prev, images: [] }));
  }, []);

  /**
   * Add an image to the state (useful for loading from history)
   */
  const addImage = useCallback((image: GeneratedImage) => {
    setState((prev) => ({
      ...prev,
      images: [image, ...prev.images],
    }));
  }, []);

  /**
   * Remove an image from state
   */
  const removeImage = useCallback((imageId: string) => {
    setState((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img.id !== imageId),
    }));
  }, []);

  return {
    ...state,
    generateImage,
    clearError,
    clearImages,
    addImage,
    removeImage,
  };
}

/**
 * Hook for managing image generation history
 */
export function useImageHistory() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ImageHistoryResult | null>(null);

  /**
   * Fetch image generation history
   */
  const fetchHistory = useCallback(
    async (
      page: number = 1,
      limit: number = 20,
      filters: ImageHistoryFilters = {}
    ): Promise<ImageHistoryResult | null> => {
      if (!user) {
        setError("Authentication required");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...Object.entries(filters)
            .filter(([_, value]) => value !== undefined)
            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
        });

        console.log("📊 Fetching image history:", {
          page,
          limit,
          filters,
          url: `/api/images/history?${params.toString()}`,
        });

        const response = await fetch(
          `/api/images/history?${params.toString()}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch image history");
        }

        console.log("✅ Image history fetched:", {
          totalImages: data.data.pagination.total,
          page: data.data.pagination.page,
          totalCost: data.data.summary.totalCost,
        });

        setHistory(data.data);
        return data.data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch image history";
        console.error("Image history fetch failed:", errorMessage);
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  /**
   * Refresh the current history page
   */
  const refreshHistory = useCallback(() => {
    if (history) {
      fetchHistory(history.pagination.page, history.pagination.limit);
    }
  }, [history, fetchHistory]);

  /**
   * Clear history from state
   */
  const clearHistory = useCallback(() => {
    setHistory(null);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    history,
    fetchHistory,
    refreshHistory,
    clearHistory,
  };
}

/**
 * Hook for image generation statistics
 */
export function useImageStats() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    totalImages: number;
    completedImages: number;
    failedImages: number;
    totalCost: number;
    averageCost: number;
    providersUsed: string[];
    modelsUsed: string[];
    firstImageDate: string | null;
    lastImageDate: string | null;
    imagesThisMonth: number;
    costThisMonth: number;
  } | null>(null);

  /**
   * Fetch user's image generation statistics
   */
  const fetchStats = useCallback(async () => {
    if (!user) {
      setError("Authentication required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/images/stats");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch image statistics");
      }

      setStats(data.stats);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch image statistics";
      console.error("Image stats fetch failed:", errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    isLoading,
    error,
    stats,
    fetchStats,
  };
}
