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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Palette,
  Eye,
  EyeOff,
  Zap,
  BarChart3,
  Save,
  Check,
  Sparkles,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserPreferences } from "@/hooks/useUserPreferences";

export function VisualCustomizationSection() {
  const { toast } = useToast();
  const { preferences, updatePreferences, isLoading } = useUserPreferences();
  const [isSaving, setIsSaving] = useState(false);

  const visualSettings = preferences.visual;

  const handleToggle = async (
    key: keyof typeof visualSettings,
    value: boolean
  ) => {
    try {
      setIsSaving(true);
      await updatePreferences({
        visual: {
          ...visualSettings,
          [key]: value,
        },
      });

      toast({
        title: "Updated! ✨",
        description: "Your visual setting has been updated",
      });
    } catch (error) {
      console.error("Error updating visual setting:", error);
      toast({
        title: "Error",
        description: "Failed to update visual setting",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <Palette className="h-5 w-5 text-blue-400" />
              </div>
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Visual Customization
              </span>
            </CardTitle>
            <CardDescription className="text-slate-400 leading-relaxed">
              Customize the visual appearance and behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl"
                >
                  <div className="space-y-2">
                    <div className="w-32 h-4 bg-slate-600 rounded"></div>
                    <div className="w-48 h-3 bg-slate-600 rounded"></div>
                  </div>
                  <div className="w-12 h-6 bg-slate-600 rounded-full"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const settingsConfig = [
    {
      key: "boringTheme" as keyof typeof visualSettings,
      icon: Palette,
      title: "Boring Theme",
      description:
        "Remove all colors, animations, and fancy effects for ultra-minimal UI",
      color: "blue",
    },
    {
      key: "hidePersonalInfo" as keyof typeof visualSettings,
      icon: visualSettings.hidePersonalInfo ? EyeOff : Eye,
      title: "Hide Personal Information",
      description: "Hide your name and profile details from the interface",
      color: "amber",
    },
    {
      key: "disableThematicBreaks" as keyof typeof visualSettings,
      icon: Zap,
      title: "Disable Thematic Breaks",
      description: "Remove visual separators and thematic elements",
      color: "emerald",
    },
    {
      key: "statsForNerds" as keyof typeof visualSettings,
      icon: BarChart3,
      title: "Stats for Nerds",
      description: "Show detailed metrics like tokens/sec, response time, etc.",
      color: "purple",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="relative group"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />

      <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 hover:border-blue-500/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-white">
            <motion.div
              className="p-2 bg-blue-500/20 rounded-xl"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Palette className="h-5 w-5 text-blue-400" />
            </motion.div>
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent font-semibold">
              Visual Customization
            </span>
          </CardTitle>
          <CardDescription className="text-slate-400 leading-relaxed">
            Customize the visual appearance and interface behavior
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Settings List */}
          <div className="space-y-4">
            {settingsConfig.map((setting, index) => {
              const Icon = setting.icon;
              const isEnabled = visualSettings[setting.key];

              return (
                <motion.div
                  key={setting.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="relative group/item"
                >
                  <div
                    className={cn(
                      "p-4 rounded-xl border transition-all duration-300 group-hover/item:scale-[1.02]",
                      isEnabled
                        ? "bg-slate-800/60 backdrop-blur-sm border-slate-600/50 shadow-lg"
                        : "bg-slate-800/20 backdrop-blur-sm border-slate-700/30 hover:bg-slate-800/40 hover:border-slate-600/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <motion.div
                          className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300",
                            isEnabled
                              ? `bg-${setting.color}-500/20 border border-${setting.color}-500/30`
                              : "bg-slate-700/50 border border-slate-600/50"
                          )}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 10,
                          }}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5 transition-colors duration-300",
                              isEnabled
                                ? `text-${setting.color}-400`
                                : "text-slate-400"
                            )}
                          />
                        </motion.div>

                        <div>
                          <div
                            className={cn(
                              "text-sm font-semibold transition-colors duration-300",
                              isEnabled ? "text-white" : "text-slate-300"
                            )}
                          >
                            {setting.title}
                          </div>
                          <div className="text-xs text-slate-500 leading-tight max-w-xs">
                            {setting.description}
                          </div>
                        </div>
                      </div>

                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={(checked) =>
                            handleToggle(setting.key, checked)
                          }
                          className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-cyan-600"
                        />
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Info Box */}
          <motion.div
            className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div className="flex items-start gap-3">
              <Settings className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-slate-300 mb-1">
                  Customization Tips
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  • Boring Theme makes everything black & white instantly
                  <br />
                  • Stats for Nerds shows technical details in chat messages
                  <br />• All changes apply immediately without saving
                  {visualSettings.boringTheme && (
                    <>
                      <br />
                      <br />
                      <span className="text-amber-400 font-medium">
                        ⚫ Boring Theme Active - Black & White Mode Enabled!
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Auto-save status */}
          <motion.div
            className="flex items-center justify-center pt-4 border-t border-slate-700/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Sparkles className="h-3 w-3" />
              <span>Visual changes apply immediately</span>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
