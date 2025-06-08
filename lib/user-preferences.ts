// User Preferences Management
// Now integrated with database storage and synced with user's account

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
}

export const defaultPreferences: UserPreferences = {
  notifications: {
    email: true,
    push: false,
    marketing: false,
  },
  privacy: {
    publicProfile: false,
    showActivity: true,
    dataCollection: true,
  },
  appearance: {
    theme: "dark",
    animations: true,
    compactMode: false,
  },
  ai: {
    defaultModel: "gpt-4",
    streamingMode: true,
    autoSave: true,
  },
};

// Local storage keys for fallback
const PREFERENCES_KEY = "conversational-glass-ai-preferences";

// Get user preferences from localStorage (fallback for client-side)
export function getUserPreferences(): UserPreferences {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all keys exist
      return {
        ...defaultPreferences,
        ...parsed,
        notifications: {
          ...defaultPreferences.notifications,
          ...parsed.notifications,
        },
        privacy: { ...defaultPreferences.privacy, ...parsed.privacy },
        appearance: { ...defaultPreferences.appearance, ...parsed.appearance },
        ai: { ...defaultPreferences.ai, ...parsed.ai },
      };
    }
  } catch (error) {
    console.error("Failed to parse user preferences:", error);
  }

  return defaultPreferences;
}

// Save user preferences to localStorage (fallback for client-side)
export function saveUserPreferences(preferences: UserPreferences): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error("Failed to save user preferences:", error);
  }
}

// Database-integrated preferences functions
export async function updateUserPreferencesInDB(preferences: UserPreferences) {
  try {
    const response = await fetch("/api/user/preferences", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferences),
    });

    if (!response.ok) {
      throw new Error("Failed to update preferences in database");
    }

    // Also update localStorage for immediate client-side access
    saveUserPreferences(preferences);

    return await response.json();
  } catch (error) {
    console.error("Failed to update preferences in database:", error);
    // Fall back to localStorage only
    saveUserPreferences(preferences);
    throw error;
  }
}

export async function getUserPreferencesFromDB(): Promise<UserPreferences> {
  try {
    const response = await fetch("/api/user/preferences");

    if (!response.ok) {
      throw new Error("Failed to fetch preferences from database");
    }

    const dbPreferences = await response.json();

    // Merge with defaults and update localStorage
    const preferences = {
      ...defaultPreferences,
      ...dbPreferences,
      notifications: {
        ...defaultPreferences.notifications,
        ...dbPreferences?.notifications,
      },
      privacy: {
        ...defaultPreferences.privacy,
        ...dbPreferences?.privacy,
      },
      appearance: {
        ...defaultPreferences.appearance,
        ...dbPreferences?.appearance,
      },
      ai: {
        ...defaultPreferences.ai,
        ...dbPreferences?.ai,
      },
    };

    // Update localStorage for offline access
    saveUserPreferences(preferences);

    return preferences;
  } catch (error) {
    console.error("Failed to fetch preferences from database:", error);
    // Fall back to localStorage
    return getUserPreferences();
  }
}

// Update specific preference section
export function updatePreferences<T extends keyof UserPreferences>(
  section: T,
  updates: Partial<UserPreferences[T]>
): UserPreferences {
  const current = getUserPreferences();
  const updated = {
    ...current,
    [section]: {
      ...current[section],
      ...updates,
    },
  };

  saveUserPreferences(updated);
  return updated;
}

// Get AI model configuration
export function getAIModelConfig(modelId: string) {
  const models = {
    "gpt-4": {
      id: "gpt-4",
      name: "GPT-4",
      personality: "Analytical Genius",
      description: "Logical, precise, methodical thinking",
      color: "from-blue-500 to-cyan-500",
      avatar: "🧠",
      traits: ["logical", "precise", "thorough"],
      mood: "focused",
      style: "geometric",
      preferredSentiment: "technical",
    },
    claude: {
      id: "claude",
      name: "Claude",
      personality: "Creative Virtuoso",
      description: "Sophisticated, thoughtful, nuanced",
      color: "from-purple-500 to-pink-500",
      avatar: "🎨",
      traits: ["artistic", "empathetic", "nuanced"],
      mood: "inspired",
      style: "flowing",
      preferredSentiment: "creative",
    },
    gemini: {
      id: "gemini",
      name: "Gemini",
      personality: "Futuristic Innovator",
      description: "Cutting-edge, adaptive, lightning-fast",
      color: "from-green-500 to-emerald-500",
      avatar: "⚡",
      traits: ["adaptive", "fast", "innovative"],
      mood: "electric",
      style: "sharp",
      preferredSentiment: "problem-solving",
    },
  };

  return models[modelId as keyof typeof models] || models["gpt-4"];
}
