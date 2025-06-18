"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Keyboard,
  Save,
  Check,
  Sparkles,
  Command,
  RotateCcw,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_KEYBOARD_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";

interface ShortcutSettings {
  enabled: boolean;
  customMappings: Record<string, string>;
}

export function KeyboardShortcutsSection() {
  const { toast } = useToast();
  const [shortcutSettings, setShortcutSettings] = useState<ShortcutSettings>({
    enabled: true,
    customMappings: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load current shortcut settings
  useEffect(() => {
    const fetchShortcutSettings = async () => {
      try {
        const response = await fetch("/api/user/preferences");
        const result = await response.json();

        if (result.success && result.data.shortcuts) {
          setShortcutSettings(result.data.shortcuts);
        }
      } catch (error) {
        console.error("Error fetching shortcut settings:", error);
        toast({
          title: "Error",
          description: "Failed to load keyboard shortcut settings",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchShortcutSettings();
  }, [toast]);

  // Track changes
  useEffect(() => {
    setHasChanges(true);
  }, [shortcutSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shortcuts: shortcutSettings,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setHasChanges(false);
        toast({
          title: "Saved! ✨",
          description: "Your keyboard shortcut preferences have been updated",
        });
      } else {
        throw new Error(result.error || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving shortcut settings:", error);
      toast({
        title: "Error",
        description: "Failed to save keyboard shortcut settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleShortcuts = (enabled: boolean) => {
    setShortcutSettings((prev) => ({ ...prev, enabled }));
  };

  const resetToDefaults = () => {
    setShortcutSettings({
      enabled: true,
      customMappings: {},
    });
  };

  // Group shortcuts by category
  const groupedShortcuts = DEFAULT_KEYBOARD_SHORTCUTS.reduce(
    (acc: Record<string, typeof DEFAULT_KEYBOARD_SHORTCUTS>, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, typeof DEFAULT_KEYBOARD_SHORTCUTS>
  );

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 to-cyan-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-teal-500/10 transition-all duration-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-teal-500/20 rounded-xl">
                <Keyboard className="h-5 w-5 text-teal-400" />
              </div>
              <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Keyboard Shortcuts
              </span>
            </CardTitle>
            <CardDescription className="text-slate-400 leading-relaxed">
              Configure keyboard shortcuts for faster navigation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="w-32 h-4 bg-slate-700 rounded-lg"></div>
                  <div className="w-full h-16 bg-slate-700 rounded-xl"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="relative group"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 to-cyan-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />

      <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-teal-500/10 transition-all duration-500 hover:border-teal-500/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <motion.div
                className="p-2 bg-teal-500/20 rounded-xl"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Keyboard className="h-5 w-5 text-teal-400" />
              </motion.div>
              <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent font-semibold">
                Keyboard Shortcuts
              </span>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={resetToDefaults}
                variant="ghost"
                size="sm"
                className="text-teal-400 hover:bg-teal-500/10 border border-teal-500/30 rounded-xl"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </motion.div>
          </CardTitle>
          <CardDescription className="text-slate-400 leading-relaxed">
            Configure keyboard shortcuts for faster navigation and productivity
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Enable/Disable Toggle */}
          <motion.div
            className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <div className="flex items-center gap-4">
              <motion.div
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-500/30"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Zap className="h-5 w-5 text-teal-400" />
              </motion.div>
              <div>
                <div className="text-sm font-semibold text-white">
                  Enable Keyboard Shortcuts
                </div>
                <div className="text-xs text-slate-500">
                  Allow keyboard shortcuts throughout the application
                </div>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Switch
                checked={shortcutSettings.enabled}
                onCheckedChange={toggleShortcuts}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-teal-600 data-[state=checked]:to-cyan-600"
              />
            </motion.div>
          </motion.div>

          {/* Shortcuts List */}
          <div
            className={cn(
              "space-y-6 transition-opacity duration-300",
              !shortcutSettings.enabled && "opacity-50 pointer-events-none"
            )}
          >
            {Object.entries(groupedShortcuts).map(
              ([category, shortcuts], categoryIndex) => (
                <motion.div
                  key={category}
                  className="space-y-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.2 + categoryIndex * 0.1,
                    duration: 0.5,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                    <h4 className="text-sm font-semibold text-slate-300">
                      {category}
                    </h4>
                  </div>

                  <div className="grid gap-3">
                    {shortcuts.map((shortcut, index) => (
                      <motion.div
                        key={shortcut.id}
                        className="flex items-center justify-between p-3 bg-slate-800/20 hover:bg-slate-800/40 border border-slate-700/30 rounded-xl transition-all duration-300 group/shortcut"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.3 + categoryIndex * 0.1 + index * 0.05,
                          duration: 0.5,
                        }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div>
                            <div className="text-sm font-medium text-slate-300 group-hover/shortcut:text-white transition-colors">
                              {shortcut.action}
                            </div>
                            <div className="text-xs text-slate-500">
                              {shortcut.description}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="border-teal-500/50 text-teal-300 bg-teal-500/10 font-mono text-xs px-3 py-1"
                        >
                          {shortcut.key}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )
            )}
          </div>

          {/* Status Note */}
          <motion.div
            className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-teal-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-slate-300 mb-1">
                  Keyboard Shortcuts Active
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  All keyboard shortcuts are now fully functional! They work
                  throughout the application and can be enabled or disabled
                  using the toggle above. Custom key mappings coming soon.
                </div>
              </div>
            </div>
          </motion.div>

          {/* Save Button */}
          <motion.div
            className="flex items-center justify-between pt-6 border-t border-slate-700/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Sparkles className="h-3 w-3" />
              <span>Shortcuts take effect immediately</span>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className={cn(
                  "rounded-xl font-semibold transition-all duration-300",
                  hasChanges
                    ? "bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white border-0 shadow-lg hover:shadow-teal-500/25"
                    : "bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed"
                )}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : hasChanges ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Saved
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
