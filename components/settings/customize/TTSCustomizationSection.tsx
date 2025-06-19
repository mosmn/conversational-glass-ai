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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import {
  Volume2,
  VolumeX,
  Loader2,
  Settings,
  Play,
  Mic,
  Headphones,
  Languages,
  TestTube,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { ENGLISH_VOICES, ARABIC_VOICES } from "@/lib/ai/voice";

interface TTSPreferences {
  defaultEnglishVoice: string;
  defaultArabicVoice: string;
  autoCleanup: boolean;
  enableTTS: boolean;
  testSampleText: string;
}

export function TTSCustomizationSection() {
  const { toast } = useToast();
  const { preferences, updatePreferences, isLoading } = useUserPreferences();
  const [isSaving, setIsSaving] = useState(false);
  const [testText, setTestText] = useState(
    "Hello! This is a test of the text-to-speech feature. How does it sound?"
  );
  const [selectedTestVoice, setSelectedTestVoice] = useState("Fritz-PlayAI");
  const [testLanguage, setTestLanguage] = useState<"en" | "ar">("en");

  const {
    isPlaying,
    isGenerating,
    speak,
    stop,
    isSupported,
    canSpeak,
    currentVoice,
  } = useTextToSpeech({
    voice: selectedTestVoice,
    language: testLanguage,
    model: testLanguage === "ar" ? "playai-tts-arabic" : "playai-tts",
  });

  // Default TTS preferences
  const defaultTTSPreferences: TTSPreferences = {
    defaultEnglishVoice: "Fritz-PlayAI",
    defaultArabicVoice: "Ahmad-PlayAI",
    autoCleanup: true,
    enableTTS: true,
    testSampleText: testText,
  };

  const ttsSettings = preferences.tts || defaultTTSPreferences;

  const handleTTSSettingUpdate = async (
    key: keyof TTSPreferences,
    value: any
  ) => {
    try {
      setIsSaving(true);
      await updatePreferences({
        tts: {
          ...ttsSettings,
          [key]: value,
        },
      });

      toast({
        title: "TTS Settings Updated! 🎙️",
        description: "Your text-to-speech preferences have been saved",
      });
    } catch (error) {
      console.error("Error updating TTS setting:", error);
      toast({
        title: "Error",
        description: "Failed to update TTS setting",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestVoice = async (voiceName: string, language: "en" | "ar") => {
    if (isPlaying) {
      stop();
      return;
    }

    setSelectedTestVoice(voiceName);
    setTestLanguage(language);

    // Use Arabic test text for Arabic voices
    const arabicTestText =
      "مرحبا! هذا اختبار لخاصية تحويل النص إلى كلام. كيف يبدو الصوت؟";
    const textToSpeak = language === "ar" ? arabicTestText : testText;

    await speak(textToSpeak, {
      voice: voiceName,
      model: language === "ar" ? "playai-tts-arabic" : "playai-tts",
      language,
    });
  };

  const availableVoices =
    testLanguage === "ar" ? ARABIC_VOICES : ENGLISH_VOICES;

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-emerald-500/20 rounded-xl">
                <Volume2 className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Text-to-Speech Settings
              </span>
            </CardTitle>
            <CardDescription className="text-slate-400 leading-relaxed">
              Configure your text-to-speech preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
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

  if (!isSupported) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-slate-600/20 to-slate-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-slate-500/20 rounded-xl">
                <VolumeX className="h-5 w-5 text-slate-400" />
              </div>
              <span className="bg-gradient-to-r from-slate-400 to-slate-400 bg-clip-text text-transparent">
                Text-to-Speech Settings
              </span>
            </CardTitle>
            <CardDescription className="text-slate-400 leading-relaxed">
              Text-to-speech is not supported in this browser or context
            </CardDescription>
          </CardHeader>
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
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />

      <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 hover:border-emerald-500/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-white">
            <motion.div
              className="p-2 bg-emerald-500/20 rounded-xl"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Volume2 className="h-5 w-5 text-emerald-400" />
            </motion.div>
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent font-semibold">
              Text-to-Speech Settings
            </span>
          </CardTitle>
          <CardDescription className="text-slate-400 leading-relaxed">
            Customize your text-to-speech experience with 23 high-quality voices
            powered by Groq
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Enable TTS Toggle */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex items-center justify-between p-4 bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 rounded-xl hover:bg-slate-800/50 hover:border-slate-600/50 transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                <Settings className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <Label className="text-white font-medium">
                  Enable Text-to-Speech
                </Label>
                <p className="text-slate-400 text-sm">
                  Turn TTS buttons on or off across the application
                </p>
              </div>
            </div>
            <Switch
              checked={ttsSettings.enableTTS}
              onCheckedChange={(checked) =>
                handleTTSSettingUpdate("enableTTS", checked)
              }
              disabled={isSaving}
            />
          </motion.div>

          {ttsSettings.enableTTS && (
            <>
              {/* Default Voice Settings */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-white font-medium">Default Voices</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* English Voice Selection */}
                  <div className="space-y-3">
                    <Label className="text-slate-300 text-sm">
                      English Voice
                    </Label>
                    <Select
                      value={ttsSettings.defaultEnglishVoice}
                      onValueChange={(value) =>
                        handleTTSSettingUpdate("defaultEnglishVoice", value)
                      }
                    >
                      <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ENGLISH_VOICES.map((voice) => (
                          <SelectItem key={voice} value={voice}>
                            {voice.replace("-PlayAI", "")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Arabic Voice Selection */}
                  <div className="space-y-3">
                    <Label className="text-slate-300 text-sm">
                      Arabic Voice
                    </Label>
                    <Select
                      value={ttsSettings.defaultArabicVoice}
                      onValueChange={(value) =>
                        handleTTSSettingUpdate("defaultArabicVoice", value)
                      }
                    >
                      <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ARABIC_VOICES.map((voice) => (
                          <SelectItem key={voice} value={voice}>
                            {voice.replace("-PlayAI", "")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>

              <Separator className="bg-slate-700/50" />

              {/* Voice Testing Section */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <TestTube className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-white font-medium">Voice Testing</h3>
                </div>

                {/* Language Selection for Testing */}
                <div className="flex items-center gap-4">
                  <Languages className="h-4 w-4 text-slate-400" />
                  <Select
                    value={testLanguage}
                    onValueChange={(value: "en" | "ar") =>
                      setTestLanguage(value)
                    }
                  >
                    <SelectTrigger className="w-32 bg-slate-800/50 border-slate-600/50 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Test Text Input */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">Test Text</Label>
                  <Textarea
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    placeholder="Enter text to test voices..."
                    className="bg-slate-800/50 border-slate-600/50 text-white resize-none"
                    rows={2}
                  />
                </div>

                {/* Voice Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableVoices.map((voice) => {
                    const isCurrentlyPlaying =
                      isPlaying && currentVoice === voice;

                    return (
                      <Button
                        key={voice}
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestVoice(voice, testLanguage)}
                        disabled={isGenerating}
                        className={cn(
                          "flex items-center justify-between gap-2 p-3 transition-all duration-200",
                          isCurrentlyPlaying
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                            : "bg-slate-800/30 border-slate-600/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500/50"
                        )}
                      >
                        <span className="text-sm font-medium">
                          {voice.replace("-PlayAI", "")}
                        </span>
                        {isGenerating && selectedTestVoice === voice ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isCurrentlyPlaying ? (
                          <VolumeX className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </motion.div>

              <Separator className="bg-slate-700/50" />

              {/* Advanced Settings */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-purple-400" />
                  <h3 className="text-white font-medium">Advanced Settings</h3>
                </div>

                {/* Auto Cleanup Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 rounded-xl hover:bg-slate-800/50 hover:border-slate-600/50 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30">
                      <Mic className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <Label className="text-white font-medium">
                        Auto Cleanup Audio
                      </Label>
                      <p className="text-slate-400 text-sm">
                        Automatically clean up audio files after playing to save
                        memory
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={ttsSettings.autoCleanup}
                    onCheckedChange={(checked) =>
                      handleTTSSettingUpdate("autoCleanup", checked)
                    }
                    disabled={isSaving}
                  />
                </div>
              </motion.div>
            </>
          )}

          {/* Status Info */}
          {isPlaying && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
            >
              <Volume2 className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-sm">
                Playing: {currentVoice?.replace("-PlayAI", "")}
              </span>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
