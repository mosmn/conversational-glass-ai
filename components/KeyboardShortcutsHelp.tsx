"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Keyboard, Command, X } from "lucide-react";
import { DEFAULT_KEYBOARD_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";
import { useUserPreferences } from "@/hooks/useUserPreferences";

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({
  isOpen,
  onClose,
}: KeyboardShortcutsHelpProps) {
  const { preferences } = useUserPreferences();
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  // Group shortcuts by category
  const groupedShortcuts = DEFAULT_KEYBOARD_SHORTCUTS.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, typeof DEFAULT_KEYBOARD_SHORTCUTS>
  );

  // Convert shortcut keys for display
  const formatShortcutKey = (key: string) => {
    if (isMac) {
      return key
        .replace(/Cmd/g, "⌘")
        .replace(/Shift/g, "⇧")
        .replace(/Alt/g, "⌥");
    }
    return key.replace(/Cmd/g, "Ctrl");
  };

  const shortcutsEnabled = preferences?.shortcuts?.enabled ?? true;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-white">
            <motion.div
              className="p-2 bg-teal-500/20 rounded-xl"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Keyboard className="h-5 w-5 text-teal-400" />
            </motion.div>
            <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              Keyboard Shortcuts
            </span>
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {shortcutsEnabled
              ? "Use these keyboard shortcuts to navigate faster"
              : "Keyboard shortcuts are disabled. Enable them in Settings > Customize"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {Object.entries(groupedShortcuts).map(
            ([category, shortcuts], categoryIndex) => (
              <motion.div
                key={category}
                className="space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: categoryIndex * 0.1, duration: 0.5 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-white">
                    {category}
                  </h3>
                </div>

                <div className="grid gap-2">
                  {shortcuts.map((shortcut, index) => (
                    <motion.div
                      key={shortcut.id}
                      className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                        shortcutsEnabled
                          ? "bg-slate-800/30 hover:bg-slate-800/50"
                          : "bg-slate-800/10 opacity-50"
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: categoryIndex * 0.1 + index * 0.05,
                        duration: 0.3,
                      }}
                      whileHover={shortcutsEnabled ? { scale: 1.02 } : {}}
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-300">
                          {shortcut.action}
                        </div>
                        <div className="text-xs text-slate-500">
                          {shortcut.description}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`font-mono text-xs px-3 py-1 ${
                          shortcutsEnabled
                            ? "border-teal-500/50 text-teal-300 bg-teal-500/10"
                            : "border-slate-600 text-slate-500 bg-slate-800/20"
                        }`}
                      >
                        {formatShortcutKey(shortcut.key)}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )
          )}
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-slate-700/50 mt-6">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Command className="h-3 w-3" />
            <span>Press {isMac ? "⌘" : "Ctrl"}+? to toggle this help</span>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white hover:bg-slate-800/50"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
