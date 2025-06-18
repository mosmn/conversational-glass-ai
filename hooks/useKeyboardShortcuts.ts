"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

// Keyboard shortcut definitions
export interface KeyboardShortcut {
  id: string;
  action: string;
  key: string;
  description: string;
  category: string;
  handler: () => void;
}

interface KeyboardShortcutsConfig {
  enabled: boolean;
  shortcuts: KeyboardShortcut[];
}

interface UseKeyboardShortcutsProps {
  // Chat-specific callbacks
  onNewChat?: () => void;
  onToggleSidebar?: () => void;
  onSendMessage?: () => void;
  onClearChat?: () => void;
  onExportChat?: () => void;
  onShareChat?: () => void;
  onRegenerateResponse?: () => void;
  onOpenSearch?: () => void;
  onShowHelp?: () => void;

  // General callbacks
  inputRef?: React.RefObject<HTMLTextAreaElement | HTMLInputElement>;

  // Settings
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onNewChat,
  onToggleSidebar,
  onSendMessage,
  onClearChat,
  onExportChat,
  onShareChat,
  onRegenerateResponse,
  onOpenSearch,
  onShowHelp,
  inputRef,
  enabled = true,
}: UseKeyboardShortcutsProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const shortcutsEnabledRef = useRef(enabled);

  // Update the ref when enabled prop changes
  useEffect(() => {
    shortcutsEnabledRef.current = enabled;
  }, [enabled]);

  // Default action handlers
  const defaultHandlers = {
    newChat: useCallback(() => {
      if (onNewChat) {
        onNewChat();
      } else {
        router.push("/chat");
      }
      toast({
        title: "New Chat",
        description: "Starting a new conversation",
      });
    }, [onNewChat, router, toast]),

    search: useCallback(() => {
      if (onOpenSearch) {
        onOpenSearch();
      } else {
        // Try to focus search input if it exists
        const searchInput = document.querySelector(
          'input[placeholder*="search" i], input[placeholder*="Search" i]'
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        } else {
          toast({
            title: "Search",
            description: "Search functionality not available in this context",
          });
        }
      }
    }, [onOpenSearch, toast]),

    settings: useCallback(() => {
      router.push("/settings");
      toast({
        title: "Settings",
        description: "Opening settings panel",
      });
    }, [router, toast]),

    sendMessage: useCallback(() => {
      if (onSendMessage) {
        onSendMessage();
      } else if (inputRef?.current) {
        // Try to find and click send button
        const sendButton = document.querySelector(
          'button[type="submit"], button[aria-label*="send" i], button[title*="send" i]'
        ) as HTMLButtonElement;
        if (sendButton && !sendButton.disabled) {
          sendButton.click();
        }
      }
    }, [onSendMessage, inputRef]),

    newLine: useCallback(() => {
      if (inputRef?.current) {
        const textarea = inputRef.current;
        const start = textarea.selectionStart ?? 0;
        const end = textarea.selectionEnd ?? 0;
        const value = textarea.value;

        textarea.value =
          value.substring(0, start) + "\n" + value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 1;

        // Trigger input event to update React state
        const event = new Event("input", { bubbles: true });
        textarea.dispatchEvent(event);
      }
    }, [inputRef]),

    clearChat: useCallback(() => {
      if (onClearChat) {
        onClearChat();
        toast({
          title: "Chat Cleared",
          description: "Current conversation has been cleared",
        });
      } else {
        toast({
          title: "Clear Chat",
          description: "Clear chat functionality not available in this context",
        });
      }
    }, [onClearChat, toast]),

    exportChat: useCallback(() => {
      if (onExportChat) {
        onExportChat();
      } else {
        toast({
          title: "Export Chat",
          description: "Export functionality not available in this context",
        });
      }
    }, [onExportChat, toast]),

    shareChat: useCallback(() => {
      if (onShareChat) {
        onShareChat();
      } else {
        toast({
          title: "Share Chat",
          description: "Share functionality not available in this context",
        });
      }
    }, [onShareChat, toast]),

    regenerate: useCallback(() => {
      if (onRegenerateResponse) {
        onRegenerateResponse();
      } else {
        toast({
          title: "Regenerate",
          description: "Regenerate functionality not available in this context",
        });
      }
    }, [onRegenerateResponse, toast]),

    toggleSidebar: useCallback(() => {
      if (onToggleSidebar) {
        onToggleSidebar();
      } else {
        // Try to find and click sidebar toggle button
        const sidebarToggle = document.querySelector(
          'button[aria-label*="sidebar" i], button[title*="sidebar" i]'
        ) as HTMLButtonElement;
        if (sidebarToggle) {
          sidebarToggle.click();
        } else {
          toast({
            title: "Toggle Sidebar",
            description: "Sidebar toggle not available in this context",
          });
        }
      }
    }, [onToggleSidebar, toast]),

    showHelp: useCallback(() => {
      if (onShowHelp) {
        onShowHelp();
      } else {
        toast({
          title: "Keyboard Shortcuts Help",
          description: "Press Cmd+? to view all available shortcuts",
        });
      }
    }, [onShowHelp, toast]),
  };

  // Define keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      id: "new-chat",
      action: "New Chat",
      key: "Cmd+N",
      description: "Start a new conversation",
      category: "Navigation",
      handler: defaultHandlers.newChat,
    },
    {
      id: "search",
      action: "Search",
      key: "Cmd+K",
      description: "Search conversations and messages",
      category: "Navigation",
      handler: defaultHandlers.search,
    },
    {
      id: "settings",
      action: "Settings",
      key: "Cmd+,",
      description: "Open settings panel",
      category: "Navigation",
      handler: defaultHandlers.settings,
    },
    {
      id: "send-message",
      action: "Send Message",
      key: "Enter",
      description: "Send the current message",
      category: "Chat",
      handler: defaultHandlers.sendMessage,
    },
    {
      id: "new-line",
      action: "New Line",
      key: "Shift+Enter",
      description: "Add a new line in message",
      category: "Chat",
      handler: defaultHandlers.newLine,
    },
    {
      id: "clear-chat",
      action: "Clear Chat",
      key: "Cmd+Shift+C",
      description: "Clear current conversation",
      category: "Chat",
      handler: defaultHandlers.clearChat,
    },
    {
      id: "export-chat",
      action: "Export Chat",
      key: "Cmd+E",
      description: "Export conversation",
      category: "Actions",
      handler: defaultHandlers.exportChat,
    },
    {
      id: "share-chat",
      action: "Share Chat",
      key: "Cmd+Shift+S",
      description: "Share current conversation",
      category: "Actions",
      handler: defaultHandlers.shareChat,
    },
    {
      id: "regenerate",
      action: "Regenerate",
      key: "Cmd+R",
      description: "Regenerate last AI response",
      category: "Actions",
      handler: defaultHandlers.regenerate,
    },
    {
      id: "toggle-sidebar",
      action: "Toggle Sidebar",
      key: "Cmd+\\",
      description: "Show/hide conversation sidebar",
      category: "Interface",
      handler: defaultHandlers.toggleSidebar,
    },
    {
      id: "show-help",
      action: "Show Help",
      key: "Cmd+?",
      description: "Show keyboard shortcuts help",
      category: "Interface",
      handler: defaultHandlers.showHelp,
    },
  ];

  // Parse key combination
  const parseKeyCombo = (keyCombo: string) => {
    const parts = keyCombo.split("+");
    const modifiers = {
      cmd: false,
      ctrl: false,
      shift: false,
      alt: false,
    };
    let key = "";

    for (const part of parts) {
      const lowerPart = part.toLowerCase();
      if (lowerPart === "cmd" || lowerPart === "meta") {
        modifiers.cmd = true;
      } else if (lowerPart === "ctrl") {
        modifiers.ctrl = true;
      } else if (lowerPart === "shift") {
        modifiers.shift = true;
      } else if (lowerPart === "alt") {
        modifiers.alt = true;
      } else {
        key = part;
      }
    }

    return { modifiers, key };
  };

  // Check if event matches shortcut
  const matchesShortcut = (
    event: KeyboardEvent,
    shortcut: KeyboardShortcut
  ) => {
    const { modifiers, key } = parseKeyCombo(shortcut.key);
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

    // Handle Cmd key (Meta on Mac, Ctrl on Windows/Linux)
    const cmdKey = isMac ? event.metaKey : event.ctrlKey;
    const expectedCmd = isMac ? modifiers.cmd : modifiers.cmd || modifiers.ctrl;

    return (
      (expectedCmd ? cmdKey : !cmdKey) &&
      (modifiers.shift ? event.shiftKey : !event.shiftKey) &&
      (modifiers.alt ? event.altKey : !event.altKey) &&
      event.key.toLowerCase() === key.toLowerCase()
    );
  };

  // Keyboard event handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't handle shortcuts if disabled
      if (!shortcutsEnabledRef.current) return;

      // Don't handle shortcuts when typing in input fields (except for specific cases)
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true";

      // Special handling for textarea shortcuts
      if (isInputField && target.tagName === "TEXTAREA") {
        // Allow Enter and Shift+Enter in textareas
        for (const shortcut of shortcuts) {
          if (
            (shortcut.id === "send-message" || shortcut.id === "new-line") &&
            matchesShortcut(event, shortcut)
          ) {
            event.preventDefault();
            shortcut.handler();
            return;
          }
        }
        // Don't handle other shortcuts in textarea
        return;
      }

      // Don't handle shortcuts in other input fields
      if (isInputField) return;

      // Check for matching shortcuts
      for (const shortcut of shortcuts) {
        if (matchesShortcut(event, shortcut)) {
          // Prevent browser defaults for our shortcuts
          event.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts]
  );

  // Register/unregister event listeners
  useEffect(() => {
    if (enabled) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [enabled, handleKeyDown]);

  // Return the shortcuts for display purposes
  return {
    shortcuts,
    enabled: shortcutsEnabledRef.current,
  };
}

// Export default shortcuts for display in settings
export const DEFAULT_KEYBOARD_SHORTCUTS = [
  {
    id: "new-chat",
    action: "New Chat",
    key: "Cmd+N",
    description: "Start a new conversation",
    category: "Navigation",
  },
  {
    id: "search",
    action: "Search",
    key: "Cmd+K",
    description: "Search conversations and messages",
    category: "Navigation",
  },
  {
    id: "settings",
    action: "Settings",
    key: "Cmd+,",
    description: "Open settings panel",
    category: "Navigation",
  },
  {
    id: "send-message",
    action: "Send Message",
    key: "Enter",
    description: "Send the current message",
    category: "Chat",
  },
  {
    id: "new-line",
    action: "New Line",
    key: "Shift+Enter",
    description: "Add a new line in message",
    category: "Chat",
  },
  {
    id: "clear-chat",
    action: "Clear Chat",
    key: "Cmd+Shift+C",
    description: "Clear current conversation",
    category: "Chat",
  },
  {
    id: "export-chat",
    action: "Export Chat",
    key: "Cmd+E",
    description: "Export conversation",
    category: "Actions",
  },
  {
    id: "share-chat",
    action: "Share Chat",
    key: "Cmd+Shift+S",
    description: "Share current conversation",
    category: "Actions",
  },
  {
    id: "regenerate",
    action: "Regenerate",
    key: "Cmd+R",
    description: "Regenerate last AI response",
    category: "Actions",
  },
  {
    id: "toggle-sidebar",
    action: "Toggle Sidebar",
    key: "Cmd+\\",
    description: "Show/hide conversation sidebar",
    category: "Interface",
  },
  {
    id: "show-help",
    action: "Show Help",
    key: "Cmd+?",
    description: "Show keyboard shortcuts help",
    category: "Interface",
  },
];
