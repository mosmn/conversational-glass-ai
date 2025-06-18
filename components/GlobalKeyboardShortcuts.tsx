"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";

export function GlobalKeyboardShortcuts() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { preferences } = useUserPreferences();
  const [showHelp, setShowHelp] = useState(false);

  // Get shortcuts enabled status from user preferences
  const shortcutsEnabled = preferences?.shortcuts?.enabled ?? true;

  // Initialize global keyboard shortcuts
  useKeyboardShortcuts({
    onNewChat: () => {
      router.push("/chat");
    },
    onOpenSearch: () => {
      // Try to find and focus any search input on the page
      const searchInput = document.querySelector(
        'input[placeholder*="search" i], input[placeholder*="Search" i]'
      ) as HTMLInputElement;

      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    },
    onShowHelp: () => {
      setShowHelp(true);
    },
    enabled: isSignedIn && shortcutsEnabled,
  });

  return (
    <KeyboardShortcutsHelp
      isOpen={showHelp}
      onClose={() => setShowHelp(false)}
    />
  );
}
