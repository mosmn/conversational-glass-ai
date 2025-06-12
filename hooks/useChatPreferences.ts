import { useState, useEffect } from "react";

export interface ChatPreferences {
  pinnedChats: string[];
  bookmarkedChats: string[];
  chatCategories: Record<string, string>;
  theme: string;
  notifications: boolean;
  autoSave: boolean;
}

const defaultPreferences: ChatPreferences = {
  pinnedChats: [],
  bookmarkedChats: [],
  chatCategories: {},
  theme: "dark",
  notifications: true,
  autoSave: true,
};

export function useChatPreferences() {
  const [preferences, setPreferences] =
    useState<ChatPreferences>(defaultPreferences);

  // Load preferences from localStorage only on client side
  useEffect(() => {
    const stored = localStorage.getItem("chat:preferences");
    if (stored) {
      try {
        setPreferences(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to parse stored preferences:", error);
      }
    }
  }, []);

  const savePreferences = (newPrefs: ChatPreferences) => {
    setPreferences(newPrefs);
    localStorage.setItem("chat:preferences", JSON.stringify(newPrefs));
  };

  const togglePin = (chatId: string) => {
    const newPinnedChats = preferences.pinnedChats.includes(chatId)
      ? preferences.pinnedChats.filter((id) => id !== chatId)
      : [...preferences.pinnedChats, chatId];

    savePreferences({
      ...preferences,
      pinnedChats: newPinnedChats,
    });

    return !preferences.pinnedChats.includes(chatId);
  };

  const toggleBookmark = (chatId: string) => {
    const newBookmarkedChats = preferences.bookmarkedChats.includes(chatId)
      ? preferences.bookmarkedChats.filter((id) => id !== chatId)
      : [...preferences.bookmarkedChats, chatId];

    savePreferences({
      ...preferences,
      bookmarkedChats: newBookmarkedChats,
    });

    return !preferences.bookmarkedChats.includes(chatId);
  };

  const removeFromPreferences = (chatId: string) => {
    savePreferences({
      ...preferences,
      pinnedChats: preferences.pinnedChats.filter((id) => id !== chatId),
      bookmarkedChats: preferences.bookmarkedChats.filter(
        (id) => id !== chatId
      ),
    });
  };

  return {
    preferences,
    savePreferences,
    togglePin,
    toggleBookmark,
    removeFromPreferences,
  };
}
