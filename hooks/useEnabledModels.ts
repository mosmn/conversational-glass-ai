"use client";

import { useState, useEffect, useCallback } from "react";
import { useModels } from "./useModels";
import type { Model } from "@/lib/api/client";

interface UserPreferences {
  ai?: {
    enabledModels?: string[];
    defaultModel?: string;
    preferredProviders?: string[];
  };
}

interface UseEnabledModelsReturn {
  models: Model[];
  enabledModels: Model[];
  loading: boolean;
  error: string | null;
  userPreferences: UserPreferences | null;
  defaultModel: string | null;
  refetch: () => Promise<void>;
}

export function useEnabledModels(): UseEnabledModelsReturn {
  const {
    models: allModels,
    loading: modelsLoading,
    error: modelsError,
    refetchModels,
  } = useModels();

  const [userPreferences, setUserPreferences] =
    useState<UserPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      setPreferencesLoading(true);
      setPreferencesError(null);

      const response = await fetch("/api/user/preferences");

      if (!response.ok) {
        throw new Error("Failed to fetch user preferences");
      }

      const data = await response.json();
      const preferences = data.data || data; // Handle both wrapped and direct response

      setUserPreferences(preferences);
    } catch (err) {
      console.error("Error fetching user preferences:", err);
      setPreferencesError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPreferencesLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    await Promise.all([refetchModels(), fetchPreferences()]);
  }, [refetchModels, fetchPreferences]);

  // Initial load
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Combine models with user preferences
  const enabledModels = useCallback(() => {
    if (!allModels.length || !userPreferences) {
      // If no preferences loaded yet, return recommended models as fallback
      return allModels.filter((model) => model.isRecommended).slice(0, 3);
    }

    const enabledModelIds = userPreferences.ai?.enabledModels || [];

    // If no models are explicitly enabled, enable recommended ones
    if (enabledModelIds.length === 0) {
      return allModels.filter((model) => model.isRecommended);
    }

    // Filter models based on user preferences
    return allModels.filter((model) => enabledModelIds.includes(model.id));
  }, [allModels, userPreferences]);

  const loading = modelsLoading || preferencesLoading;
  const error = modelsError || preferencesError;
  const defaultModel = userPreferences?.ai?.defaultModel || null;

  return {
    models: allModels,
    enabledModels: enabledModels(),
    loading,
    error,
    userPreferences,
    defaultModel,
    refetch,
  };
}
