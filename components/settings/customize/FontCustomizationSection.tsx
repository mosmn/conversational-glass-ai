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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  useUserPreferences,
  useFontPreferences,
} from "@/hooks/useUserPreferences";
import {
  Type,
  Code,
  Save,
  Check,
  Sparkles,
  Eye,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FontSettings {
  mainFont: string;
  codeFont: string;
}

// Font options
const MAIN_FONTS = [
  { value: "Inter", label: "Inter", category: "Sans Serif" },
  { value: "System", label: "System Default", category: "System" },
  { value: "Arial", label: "Arial", category: "Sans Serif" },
  { value: "Helvetica", label: "Helvetica", category: "Sans Serif" },
  { value: "Georgia", label: "Georgia", category: "Serif" },
  { value: "Times New Roman", label: "Times New Roman", category: "Serif" },
  { value: "Roboto", label: "Roboto", category: "Sans Serif" },
  { value: "Open Sans", label: "Open Sans", category: "Sans Serif" },
  { value: "Poppins", label: "Poppins", category: "Sans Serif" },
  { value: "Lato", label: "Lato", category: "Sans Serif" },
];

const CODE_FONTS = [
  { value: "Fira Code", label: "Fira Code", category: "Ligatures" },
  { value: "JetBrains Mono", label: "JetBrains Mono", category: "Ligatures" },
  { value: "Monaco", label: "Monaco", category: "Monospace" },
  { value: "Consolas", label: "Consolas", category: "Monospace" },
  { value: "Courier New", label: "Courier New", category: "Monospace" },
  { value: "SF Mono", label: "SF Mono", category: "Monospace" },
  { value: "Roboto Mono", label: "Roboto Mono", category: "Monospace" },
  { value: "Source Code Pro", label: "Source Code Pro", category: "Monospace" },
  { value: "Ubuntu Mono", label: "Ubuntu Mono", category: "Monospace" },
  { value: "Cascadia Code", label: "Cascadia Code", category: "Ligatures" },
];

export function FontCustomizationSection() {
  const { toast } = useToast();
  const { updatePreferences, isLoading: prefsLoading } = useUserPreferences();
  const fontPrefs = useFontPreferences();

  const [fontSettings, setFontSettings] = useState<FontSettings>({
    mainFont: "Inter",
    codeFont: "Fira Code",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load current font settings from preferences context
  useEffect(() => {
    if (!prefsLoading) {
      setFontSettings(fontPrefs);
      setIsLoading(false);
    }
  }, [fontPrefs, prefsLoading]);

  // Track changes
  useEffect(() => {
    setHasChanges(true);
  }, [fontSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences({ fonts: fontSettings });
      setHasChanges(false);
      toast({
        title: "Saved! ✨",
        description: "Your font preferences have been updated",
      });
    } catch (error) {
      console.error("Error saving font settings:", error);
      toast({
        title: "Error",
        description: "Failed to save font settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setFontSettings({
      mainFont: "Inter",
      codeFont: "Fira Code",
    });
  };

  const updateFont = (type: keyof FontSettings, value: string) => {
    setFontSettings((prev) => ({ ...prev, [type]: value }));
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-amber-500/10 transition-all duration-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-amber-500/20 rounded-xl">
                <Type className="h-5 w-5 text-amber-400" />
              </div>
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Font Customization
              </span>
            </CardTitle>
            <CardDescription className="text-slate-400 leading-relaxed">
              Customize typography for optimal reading experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="w-32 h-4 bg-slate-700 rounded-lg"></div>
                  <div className="w-full h-12 bg-slate-700 rounded-xl"></div>
                  <div className="w-full h-20 bg-slate-700 rounded-xl"></div>
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
      transition={{ duration: 0.5, delay: 0.4 }}
      className="relative group"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />

      <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-amber-500/10 transition-all duration-500 hover:border-amber-500/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <motion.div
                className="p-2 bg-amber-500/20 rounded-xl"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Type className="h-5 w-5 text-amber-400" />
              </motion.div>
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent font-semibold">
                Font Customization
              </span>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={resetToDefaults}
                variant="ghost"
                size="sm"
                className="text-amber-400 hover:bg-amber-500/10 border border-amber-500/30 rounded-xl"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </motion.div>
          </CardTitle>
          <CardDescription className="text-slate-400 leading-relaxed">
            Customize typography settings with live preview for optimal reading
            experience
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Main Font Selection */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <Label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Type className="h-4 w-4 text-amber-400" />
              Main Text Font
            </Label>
            <Select
              value={fontSettings.mainFont}
              onValueChange={(value) => updateFont("mainFont", value)}
            >
              <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300 rounded-xl focus:border-amber-500/50 transition-colors">
                <SelectValue placeholder="Select main font" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 rounded-xl">
                {MAIN_FONTS.map((font) => (
                  <SelectItem
                    key={font.value}
                    value={font.value}
                    className="text-slate-300 focus:bg-slate-700 focus:text-white"
                    style={{ fontFamily: font.value }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{font.label}</span>
                      <span className="text-xs text-slate-500 ml-2">
                        {font.category}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Main Font Preview */}
            <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-medium text-slate-400">
                  Main Text Preview
                </span>
              </div>
              <div
                className="text-slate-300 leading-relaxed"
                style={{ fontFamily: fontSettings.mainFont }}
              >
                <div className="text-lg mb-2">
                  The quick brown fox jumps over the lazy dog
                </div>
                <div className="text-sm text-slate-400">
                  This is how your chat messages and interface text will appear.
                  The font affects readability and overall user experience.
                </div>
              </div>
            </div>
          </motion.div>

          {/* Code Font Selection */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Code className="h-4 w-4 text-amber-400" />
              Code Font
            </Label>
            <Select
              value={fontSettings.codeFont}
              onValueChange={(value) => updateFont("codeFont", value)}
            >
              <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-300 rounded-xl focus:border-amber-500/50 transition-colors">
                <SelectValue placeholder="Select code font" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 rounded-xl">
                {CODE_FONTS.map((font) => (
                  <SelectItem
                    key={font.value}
                    value={font.value}
                    className="text-slate-300 focus:bg-slate-700 focus:text-white"
                    style={{ fontFamily: font.value }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{font.label}</span>
                      <span className="text-xs text-slate-500 ml-2">
                        {font.category}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Code Font Preview */}
            <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-medium text-slate-400">
                  Code Preview
                </span>
              </div>
              <div
                className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg"
                style={{ fontFamily: fontSettings.codeFont }}
              >
                <div className="text-purple-400">const</div>
                <div className="text-blue-400">
                  {"function"} <span className="text-yellow-400">example</span>
                  {"() {"}
                </div>
                <div className="pl-4 text-slate-300">
                  console.log(
                  <span className="text-green-400">"Hello, World!"</span>);
                </div>
                <div className="text-blue-400">{"}"}</div>
              </div>
            </div>
          </motion.div>

          {/* Font Info */}
          <motion.div
            className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-slate-300 mb-1">
                  Font Tips
                </div>
                <div className="text-xs text-slate-500 leading-relaxed">
                  • Fonts with ligatures (Fira Code, JetBrains Mono) enhance
                  code readability
                  <br />
                  • System fonts load faster and provide better performance
                  <br />• Changes apply immediately across the application
                </div>
              </div>
            </div>
          </motion.div>

          {/* Save Button */}
          <motion.div
            className="flex items-center justify-between pt-6 border-t border-slate-700/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Type className="h-3 w-3" />
              <span>Font changes apply immediately</span>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className={cn(
                  "rounded-xl font-semibold transition-all duration-300",
                  hasChanges
                    ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white border-0 shadow-lg hover:shadow-amber-500/25"
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
