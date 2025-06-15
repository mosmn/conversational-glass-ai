"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useUser } from "@clerk/nextjs";

// Types for user preferences
export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  privacy: {
    publicProfile: boolean;
    showActivity: boolean;
    dataCollection: boolean;
  };
  appearance: {
    theme: "light" | "dark" | "auto";
    animations: boolean;
    compactMode: boolean;
  };
  ai: {
    defaultModel: "gpt-4" | "claude" | "gemini";
    streamingMode: boolean;
    autoSave: boolean;
  };
  personalization: {
    displayName: string;
    description: string;
    traits: string[];
    additionalInfo: string;
  };
  visual: {
    boringTheme: boolean;
    hidePersonalInfo: boolean;
    disableThematicBreaks: boolean;
    statsForNerds: boolean;
  };
  fonts: {
    mainFont: string;
    codeFont: string;
  };
  usage: {
    messagesThisMonth: number;
    resetDate: string;
    plan: "free" | "pro";
  };
  shortcuts: {
    enabled: boolean;
    customMappings: Record<string, string>;
  };
}

// Default preferences
const defaultPreferences: UserPreferences = {
  notifications: { email: true, push: true, marketing: false },
  privacy: { publicProfile: false, showActivity: true, dataCollection: true },
  appearance: { theme: "dark", animations: true, compactMode: false },
  ai: { defaultModel: "gpt-4", streamingMode: true, autoSave: true },
  personalization: {
    displayName: "",
    description: "",
    traits: [],
    additionalInfo: "",
  },
  visual: {
    boringTheme: false,
    hidePersonalInfo: false,
    disableThematicBreaks: false,
    statsForNerds: false,
  },
  fonts: { mainFont: "Inter", codeFont: "Fira Code" },
  usage: {
    messagesThisMonth: 0,
    resetDate: new Date().toISOString(),
    plan: "free",
  },
  shortcuts: { enabled: true, customMappings: {} },
};

// Context type
interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  refreshPreferences: () => Promise<void>;
}

// Create context
const PreferencesContext = createContext<PreferencesContextType | undefined>(
  undefined
);

// Provider component
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, user } = useUser();
  const [preferences, setPreferences] =
    useState<UserPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences from API
  const loadPreferences = async () => {
    if (!isSignedIn) {
      setPreferences(defaultPreferences);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/user/preferences");
      const result = await response.json();

      if (result.success) {
        // Merge with defaults to ensure all fields exist
        const loadedPreferences = { ...defaultPreferences, ...result.data };
        setPreferences(loadedPreferences);

        // Apply preferences immediately
        applyPreferences(loadedPreferences);
      } else {
        throw new Error(result.error || "Failed to load preferences");
      }
    } catch (err) {
      console.error("Error loading preferences:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load preferences"
      );
      setPreferences(defaultPreferences);
    } finally {
      setIsLoading(false);
    }
  };

  // Update preferences
  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    try {
      setError(null);

      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (result.success) {
        const updatedPreferences = { ...preferences, ...updates };
        setPreferences(updatedPreferences);

        // Apply changes immediately
        applyPreferences(updatedPreferences);
      } else {
        throw new Error(result.error || "Failed to update preferences");
      }
    } catch (err) {
      console.error("Error updating preferences:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update preferences"
      );
      throw err;
    }
  };

  // Apply preferences to the application
  const applyPreferences = (prefs: UserPreferences) => {
    // Apply font preferences
    applyFontPreferences(prefs.fonts);

    // Apply visual preferences
    applyVisualPreferences(prefs.visual);

    // Apply keyboard shortcuts
    applyKeyboardShortcuts(prefs.shortcuts);
  };

  // Apply font preferences via CSS custom properties
  const applyFontPreferences = (fonts: UserPreferences["fonts"]) => {
    const root = document.documentElement;

    // Set main font
    root.style.setProperty("--font-main", fonts.mainFont);

    // Set code font
    root.style.setProperty("--font-code", fonts.codeFont);

    // Update body font family for immediate effect
    document.body.style.fontFamily =
      fonts.mainFont === "System"
        ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        : fonts.mainFont;
  };

  // Apply visual preferences
  const applyVisualPreferences = (visual: UserPreferences["visual"]) => {
    const root = document.documentElement;

    // Boring theme - reduce animations and transparency
    if (visual.boringTheme) {
      root.classList.add("boring-theme");
    } else {
      root.classList.remove("boring-theme");
    }

    // Hide personal info
    if (visual.hidePersonalInfo) {
      root.classList.add("hide-personal-info");
    } else {
      root.classList.remove("hide-personal-info");
    }

    // Disable thematic breaks
    if (visual.disableThematicBreaks) {
      root.classList.add("disable-thematic-breaks");
    } else {
      root.classList.remove("disable-thematic-breaks");
    }

    // Stats for nerds
    if (visual.statsForNerds) {
      root.classList.add("stats-for-nerds");
    } else {
      root.classList.remove("stats-for-nerds");
    }
  };

  // Apply keyboard shortcuts
  const applyKeyboardShortcuts = (shortcuts: UserPreferences["shortcuts"]) => {
    // Remove existing shortcuts
    document.removeEventListener("keydown", handleKeyboardShortcuts);

    if (shortcuts.enabled) {
      // Add keyboard shortcut listener
      document.addEventListener("keydown", handleKeyboardShortcuts);
    }
  };

  // Keyboard shortcut handler
  const handleKeyboardShortcuts = (event: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const cmdKey = isMac ? event.metaKey : event.ctrlKey;

    // Build shortcut string
    let shortcut = "";
    if (cmdKey) shortcut += "Cmd+";
    if (event.shiftKey) shortcut += "Shift+";
    if (event.altKey) shortcut += "Alt+";
    shortcut += event.key;

    // Handle shortcuts
    switch (shortcut) {
      case "Cmd+n":
      case "Cmd+N":
        event.preventDefault();
        window.location.href = "/";
        break;
      case "Cmd+k":
      case "Cmd+K":
        event.preventDefault();
        // TODO: Open search modal
        break;
      case "Cmd+,":
        event.preventDefault();
        window.location.href = "/settings";
        break;
      case "Cmd+\\":
        event.preventDefault();
        // TODO: Toggle sidebar
        break;
      default:
        break;
    }
  };

  // Load preferences on mount and user change
  useEffect(() => {
    loadPreferences();
  }, [isSignedIn, user?.id]);

  // Cleanup keyboard shortcuts on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("keydown", handleKeyboardShortcuts);
    };
  }, []);

  const contextValue: PreferencesContextType = {
    preferences,
    updatePreferences,
    isLoading,
    error,
    refreshPreferences: loadPreferences,
  };

  return (
    <PreferencesContext.Provider value={contextValue}>
      {children}
    </PreferencesContext.Provider>
  );
}

// Hook to use preferences
export function useUserPreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error(
      "useUserPreferences must be used within a PreferencesProvider"
    );
  }
  return context;
}

// Helper hook for just the preferences data
export function usePreferences() {
  const { preferences } = useUserPreferences();
  return preferences;
}

// Helper hook for specific preference sections
export function usePersonalization() {
  const { preferences } = useUserPreferences();
  return preferences.personalization;
}

export function useVisualPreferences() {
  const { preferences } = useUserPreferences();
  return {
    boringTheme: preferences.visual.boringTheme,
    hidePersonalInfo: preferences.visual.hidePersonalInfo,
    disableThematicBreaks: preferences.visual.disableThematicBreaks,
    statsForNerds: preferences.visual.statsForNerds,
  };
}

// Helper hook for just the boring theme
export function useBoringTheme() {
  const { preferences } = useUserPreferences();
  return preferences.visual.boringTheme;
}

export function useFontPreferences() {
  const { preferences } = useUserPreferences();
  return preferences.fonts;
}
