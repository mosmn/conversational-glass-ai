/**
 * Model Persistence Utility
 * Handles saving and loading the user's last selected model from localStorage
 */

const SELECTED_MODEL_KEY = "conversational-glass-ai-selected-model";

export interface PersistedModelSelection {
  modelId: string;
  timestamp: number;
  provider: string;
  modelName: string;
}

/**
 * Save the currently selected model to localStorage
 */
export const saveSelectedModel = (
  modelId: string,
  provider: string,
  modelName: string
): void => {
  try {
    const selection: PersistedModelSelection = {
      modelId,
      provider,
      modelName,
      timestamp: Date.now(),
    };

    localStorage.setItem(SELECTED_MODEL_KEY, JSON.stringify(selection));
  } catch (error) {
    console.warn("Failed to save selected model to localStorage:", error);
  }
};

/**
 * Load the last selected model from localStorage
 */
export const loadSelectedModel = (): PersistedModelSelection | null => {
  try {
    const stored = localStorage.getItem(SELECTED_MODEL_KEY);
    if (!stored) return null;

    const selection: PersistedModelSelection = JSON.parse(stored);

    // Check if the selection is recent (within 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    if (selection.timestamp < thirtyDaysAgo) {
      // Remove stale selection
      clearSelectedModel();
      return null;
    }

    return selection;
  } catch (error) {
    console.warn("Failed to load selected model from localStorage:", error);
    return null;
  }
};

/**
 * Clear the selected model from localStorage
 */
export const clearSelectedModel = (): void => {
  try {
    localStorage.removeItem(SELECTED_MODEL_KEY);
  } catch (error) {
    console.warn("Failed to clear selected model from localStorage:", error);
  }
};

/**
 * Check if a model is still valid/available in the current model list
 */
export const isModelStillValid = (
  persistedModel: PersistedModelSelection,
  availableModels: Array<{
    id: string;
    provider: string;
    name: string;
    isEnabled?: boolean;
  }>
): boolean => {
  const model = availableModels.find((m) => m.id === persistedModel.modelId);

  // Model must exist and be enabled (if isEnabled is defined)
  return !!(model && model.isEnabled !== false);
};
