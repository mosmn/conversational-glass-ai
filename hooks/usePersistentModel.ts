import { useState, useEffect } from "react";
import { useModels } from "./useModels";
import { useEnabledModels } from "./useEnabledModels";
import {
  saveSelectedModel,
  loadSelectedModel,
  isModelStillValid,
  clearSelectedModel,
} from "@/lib/utils/model-persistence";

/**
 * Custom hook for managing persistent model selection
 * Stores the user's selected model in localStorage and restores it on page load
 */
export function usePersistentModel() {
  const [selectedModel, setSelectedModelState] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);
  const { models, loading: modelsLoading } = useModels();
  const { enabledModels } = useEnabledModels();

  // Load the persisted model from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const persistedSelection = loadSelectedModel();
      if (persistedSelection) {
        console.log(
          "🔄 Loading persisted model from storage:",
          persistedSelection.modelId
        );
        setSelectedModelState(persistedSelection.modelId);
      }
      setIsInitialized(true);
    }
  }, []);

  // Persist model selection to localStorage
  const setSelectedModel = (modelId: string) => {
    console.log("💾 Persisting selected model:", modelId);
    setSelectedModelState(modelId);

    if (typeof window !== "undefined") {
      // Find the model to get provider and name for better persistence
      const model = enabledModels.find((m) => m.id === modelId);
      if (model) {
        saveSelectedModel(modelId, model.provider, model.name);
      }

      // Dispatch storage event for cross-tab synchronization
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "model-preferences-updated",
          newValue: modelId,
          storageArea: localStorage,
        })
      );
    }
  };

  // Listen for storage changes (cross-tab synchronization)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "model-preferences-updated" && e.newValue) {
        console.log("🔄 Model selection changed in another tab:", e.newValue);
        setSelectedModelState(e.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [enabledModels]);

  // Auto-select and validate model when models are loaded
  useEffect(() => {
    if (
      !modelsLoading &&
      models.length > 0 &&
      enabledModels.length > 0 &&
      isInitialized
    ) {
      if (!selectedModel) {
        // No model selected - pick the first enabled model
        const firstEnabledModel = enabledModels.find((m) => m.isEnabled);
        if (firstEnabledModel) {
          console.log(
            `🔄 Auto-selecting first enabled model: ${firstEnabledModel.id}`
          );
          setSelectedModel(firstEnabledModel.id);
        }
      } else {
        // Check if current selection is still valid and enabled
        const persistedSelection = loadSelectedModel();
        if (
          persistedSelection &&
          isModelStillValid(persistedSelection, enabledModels)
        ) {
          console.log(
            `✅ Persisted model '${selectedModel}' is still valid and enabled`
          );
        } else {
          const fallbackModel = enabledModels.find((m) => m.isEnabled);
          if (fallbackModel) {
            console.warn(
              `⚠️ Persisted model '${selectedModel}' no longer available/enabled, switching to: ${fallbackModel.id}`
            );
            setSelectedModel(fallbackModel.id);
          }
        }
      }
    }
  }, [selectedModel, models, enabledModels, modelsLoading, isInitialized]);

  // Clear persisted model (useful for reset functionality)
  const clearPersistedModel = () => {
    console.log("🗑️ Clearing persisted model selection");
    if (typeof window !== "undefined") {
      clearSelectedModel();
    }
    setSelectedModelState("");
  };

  return {
    selectedModel,
    setSelectedModel,
    clearPersistedModel,
    isInitialized,
  };
}
