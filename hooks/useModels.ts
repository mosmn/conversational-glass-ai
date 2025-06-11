"use client";

import { useState, useEffect, useCallback } from "react";
import {
  apiClient,
  type Model,
  type ModelsResponse,
  type APIError,
} from "@/lib/api/client";

interface UseModelsReturn {
  models: Model[];
  loading: boolean;
  error: string | null;
  modelsByProvider: Record<string, Model[]>;
  recommendations: ModelsResponse["recommendations"] | null;
  statistics: ModelsResponse["statistics"] | null;
  getModelById: (id: string) => Model | undefined;
  getModelsByTier: (tier: "premium" | "standard" | "economy") => Model[];
  refetchModels: () => Promise<void>;
}

export function useModels(): UseModelsReturn {
  const [modelsData, setModelsData] = useState<ModelsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await apiClient.getModels();

      // Deduplicate models to prevent duplicate keys in UI lists.
      // Some providers may return the same model multiple times; we ensure
      // that only a single instance per unique `id` is kept.
      const uniqueModels = Array.from(
        new Map(data.models.map((model) => [model.id, model])).values()
      );

      setModelsData({ ...data, models: uniqueModels });
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.error || "Failed to fetch models");
      console.error("Fetch models error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getModelById = useCallback(
    (id: string): Model | undefined => {
      return modelsData?.models.find((model) => model.id === id);
    },
    [modelsData]
  );

  const getModelsByTier = useCallback(
    (tier: "premium" | "standard" | "economy"): Model[] => {
      return (
        modelsData?.models.filter((model) => model.uiHints.tier === tier) || []
      );
    },
    [modelsData]
  );

  const refetchModels = useCallback(async () => {
    await fetchModels();
  }, [fetchModels]);

  // Initial load
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return {
    models: modelsData?.models || [],
    loading,
    error,
    modelsByProvider: modelsData?.modelsByProvider || {},
    recommendations: modelsData?.recommendations || null,
    statistics: modelsData?.statistics || null,
    getModelById,
    getModelsByTier,
    refetchModels,
  };
}
