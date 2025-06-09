"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";

// Settings interfaces
export interface UserSettings {
  profile: {
    displayName: string;
    description: string;
    traits: string[];
    additionalInfo: string;
  };
  appearance: {
    boringTheme: boolean;
    hidePersonalInfo: boolean;
    disableThematicBreaks: boolean;
    statsForNerds: boolean;
    mainFont: string;
    codeFont: string;
  };
  preferences: {
    keyboardShortcuts: boolean;
    autoSave: boolean;
    notifications: boolean;
  };
  models: {
    selectedModels: string[];
    defaultModel: string;
    modelConfigurations: Record<string, any>;
  };
  apiKeys: {
    openai?: string;
    anthropic?: string;
    google?: string;
    groq?: string;
  };
}

export interface SettingsState {
  settings: UserSettings;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
}

const defaultSettings: UserSettings = {
  profile: {
    displayName: "",
    description: "",
    traits: [],
    additionalInfo: "",
  },
  appearance: {
    boringTheme: false,
    hidePersonalInfo: false,
    disableThematicBreaks: false,
    statsForNerds: false,
    mainFont: "Inter",
    codeFont: "Fira Code",
  },
  preferences: {
    keyboardShortcuts: true,
    autoSave: true,
    notifications: true,
  },
  models: {
    selectedModels: [],
    defaultModel: "llama-3.3-70b-versatile",
    modelConfigurations: {},
  },
  apiKeys: {},
};

export function useSettings() {
  const { user } = useUser();
  const { toast } = useToast();

  const [state, setState] = useState<SettingsState>({
    settings: defaultSettings,
    isLoading: true,
    isSaving: false,
    error: null,
    hasUnsavedChanges: false,
  });

  // Load settings from localStorage and API
  const loadSettings = useCallback(async () => {
    if (!user) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // First, try to load from localStorage for immediate UI response
      const localSettings = localStorage.getItem(`settings:${user.id}`);
      if (localSettings) {
        try {
          const parsed = JSON.parse(localSettings);
          setState((prev) => ({
            ...prev,
            settings: { ...defaultSettings, ...parsed },
            isLoading: false,
          }));
        } catch (error) {
          console.error("Failed to parse local settings:", error);
        }
      }

      // Then load from API for authoritative data
      const response = await fetch("/api/user/preferences");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const apiSettings = { ...defaultSettings, ...data.data };
          setState((prev) => ({
            ...prev,
            settings: apiSettings,
            isLoading: false,
          }));

          // Update localStorage with API data
          localStorage.setItem(
            `settings:${user.id}`,
            JSON.stringify(apiSettings)
          );
        }
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      setState((prev) => ({
        ...prev,
        error: "Failed to load settings",
        isLoading: false,
      }));
    }
  }, [user]);

  // Save settings to API and localStorage
  const saveSettings = useCallback(
    async (newSettings: Partial<UserSettings>) => {
      if (!user) return;

      try {
        setState((prev) => ({ ...prev, isSaving: true, error: null }));

        const updatedSettings = { ...state.settings, ...newSettings };

        // Optimistically update local state
        setState((prev) => ({
          ...prev,
          settings: updatedSettings,
          hasUnsavedChanges: false,
        }));

        // Save to localStorage immediately
        localStorage.setItem(
          `settings:${user.id}`,
          JSON.stringify(updatedSettings)
        );

        // Save to API
        const response = await fetch("/api/user/preferences", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedSettings),
        });

        if (response.ok) {
          setState((prev) => ({ ...prev, isSaving: false }));
          toast({
            title: "Settings saved",
            description: "Your preferences have been updated successfully.",
          });
        } else {
          throw new Error("Failed to save settings");
        }
      } catch (error) {
        console.error("Failed to save settings:", error);
        setState((prev) => ({
          ...prev,
          error: "Failed to save settings",
          isSaving: false,
          hasUnsavedChanges: true,
        }));

        toast({
          title: "Save failed",
          description: "Your settings couldn't be saved. Please try again.",
          variant: "destructive",
        });
      }
    },
    [user, state.settings, toast]
  );

  // Update specific setting section
  const updateSettings = useCallback(
    (section: keyof UserSettings, data: any) => {
      setState((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          [section]: { ...prev.settings[section], ...data },
        },
        hasUnsavedChanges: true,
      }));
    },
    []
  );

  // Auto-save functionality
  const autoSave = useCallback(() => {
    if (state.hasUnsavedChanges && state.settings.preferences.autoSave) {
      saveSettings(state.settings);
    }
  }, [state.hasUnsavedChanges, state.settings, saveSettings]);

  // Load settings when user changes
  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user, loadSettings]);

  // Auto-save timer
  useEffect(() => {
    if (state.hasUnsavedChanges && state.settings.preferences.autoSave) {
      const timer = setTimeout(autoSave, 2000); // Auto-save after 2 seconds
      return () => clearTimeout(timer);
    }
  }, [state.hasUnsavedChanges, state.settings.preferences.autoSave, autoSave]);

  return {
    ...state,
    loadSettings,
    saveSettings,
    updateSettings,
    refresh: loadSettings,
  };
}
