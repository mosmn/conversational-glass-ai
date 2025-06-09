"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Brain,
  Plus,
  X,
  Save,
  Sparkles,
  User,
  Briefcase,
  Heart,
  Info,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonalizationData {
  displayName: string;
  description: string;
  traits: string[];
  additionalInfo: string;
}

export function AIPersonalizationSection() {
  const { toast } = useToast();
  const [personalization, setPersonalization] = useState<PersonalizationData>({
    displayName: "",
    description: "",
    traits: [],
    additionalInfo: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newTrait, setNewTrait] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Character limits
  const DISPLAY_NAME_LIMIT = 50;
  const DESCRIPTION_LIMIT = 100;
  const TRAIT_LIMIT = 100;
  const TRAIT_COUNT_LIMIT = 50;
  const ADDITIONAL_INFO_LIMIT = 3000;

  // Load current personalization data
  useEffect(() => {
    const fetchPersonalization = async () => {
      try {
        const response = await fetch("/api/user/preferences");
        const result = await response.json();

        if (result.success && result.data.personalization) {
          setPersonalization(result.data.personalization);
        }
      } catch (error) {
        console.error("Error fetching personalization:", error);
        toast({
          title: "Error",
          description: "Failed to load personalization settings",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonalization();
  }, [toast]);

  // Track changes
  useEffect(() => {
    setHasChanges(true);
  }, [personalization]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalization,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setHasChanges(false);
        toast({
          title: "Saved! ✨",
          description: "Your AI personalization settings have been updated",
        });
      } else {
        throw new Error(result.error || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving personalization:", error);
      toast({
        title: "Error",
        description: "Failed to save personalization settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addTrait = () => {
    if (
      newTrait.trim() &&
      newTrait.length <= TRAIT_LIMIT &&
      personalization.traits.length < TRAIT_COUNT_LIMIT &&
      !personalization.traits.includes(newTrait.trim())
    ) {
      setPersonalization((prev) => ({
        ...prev,
        traits: [...prev.traits, newTrait.trim()],
      }));
      setNewTrait("");
    }
  };

  const removeTrait = (index: number) => {
    setPersonalization((prev) => ({
      ...prev,
      traits: prev.traits.filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-purple-500/10 transition-all duration-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <Brain className="h-5 w-5 text-purple-400" />
              </div>
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                AI Personalization
              </span>
            </CardTitle>
            <CardDescription className="text-slate-400 leading-relaxed">
              Customize how the AI interacts with you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="w-32 h-4 bg-slate-700 rounded-lg"></div>
                  <div className="w-full h-12 bg-slate-700 rounded-xl"></div>
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
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative group"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />

      <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 hover:border-purple-500/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-white">
            <motion.div
              className="p-2 bg-purple-500/20 rounded-xl"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Brain className="h-5 w-5 text-purple-400" />
            </motion.div>
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-semibold">
              AI Personalization
            </span>
          </CardTitle>
          <CardDescription className="text-slate-400 leading-relaxed">
            Customize how the AI interacts with you and understands your
            preferences
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Display Name */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <Label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <User className="h-4 w-4 text-purple-400" />
              What should Convo Glass call you?
            </Label>
            <div className="relative">
              <Input
                value={personalization.displayName}
                onChange={(e) =>
                  setPersonalization((prev) => ({
                    ...prev,
                    displayName: e.target.value.slice(0, DISPLAY_NAME_LIMIT),
                  }))
                }
                placeholder="Your preferred name or nickname"
                className="bg-slate-800/50 border-slate-600/50 text-slate-300 rounded-xl pr-16 focus:border-purple-500/50 transition-colors"
                maxLength={DISPLAY_NAME_LIMIT}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                {personalization.displayName.length}/{DISPLAY_NAME_LIMIT}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              This helps the AI address you personally in conversations
            </p>
          </motion.div>

          {/* Description */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-purple-400" />
              What do you do?
            </Label>
            <div className="relative">
              <Input
                value={personalization.description}
                onChange={(e) =>
                  setPersonalization((prev) => ({
                    ...prev,
                    description: e.target.value.slice(0, DESCRIPTION_LIMIT),
                  }))
                }
                placeholder="Your role, profession, or main activities"
                className="bg-slate-800/50 border-slate-600/50 text-slate-300 rounded-xl pr-16 focus:border-purple-500/50 transition-colors"
                maxLength={DESCRIPTION_LIMIT}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                {personalization.description.length}/{DESCRIPTION_LIMIT}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              This provides context for more relevant and helpful responses
            </p>
          </motion.div>

          {/* AI Traits */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Heart className="h-4 w-4 text-purple-400" />
              What traits should Convo Glass have?
            </Label>

            {/* Add new trait */}
            <div className="flex gap-2">
              <Input
                value={newTrait}
                onChange={(e) =>
                  setNewTrait(e.target.value.slice(0, TRAIT_LIMIT))
                }
                placeholder="e.g., friendly, analytical, creative..."
                className="flex-1 bg-slate-800/50 border-slate-600/50 text-slate-300 rounded-xl focus:border-purple-500/50 transition-colors"
                maxLength={TRAIT_LIMIT}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTrait();
                  }
                }}
              />
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={addTrait}
                  disabled={
                    !newTrait.trim() ||
                    personalization.traits.length >= TRAIT_COUNT_LIMIT
                  }
                  className="bg-purple-600 hover:bg-purple-700 text-white border-0 rounded-xl font-medium"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>

            <div className="text-xs text-slate-500 flex items-center justify-between">
              <span>Define the AI's personality and communication style</span>
              <span>
                {personalization.traits.length}/{TRAIT_COUNT_LIMIT} traits
              </span>
            </div>

            {/* Traits list */}
            <AnimatePresence>
              {personalization.traits.length > 0 && (
                <motion.div
                  className="flex flex-wrap gap-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {personalization.traits.map((trait, index) => (
                    <motion.div
                      key={trait}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 15,
                      }}
                    >
                      <Badge
                        variant="outline"
                        className="border-purple-500/50 text-purple-300 bg-purple-500/10 flex items-center gap-2 pl-3 pr-2 py-1"
                      >
                        <span>{trait}</span>
                        <motion.button
                          onClick={() => removeTrait(index)}
                          className="text-purple-300 hover:text-white transition-colors"
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.8 }}
                        >
                          <X className="h-3 w-3" />
                        </motion.button>
                      </Badge>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Additional Info */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Info className="h-4 w-4 text-purple-400" />
              Anything else Convo Glass should know?
            </Label>
            <div className="relative">
              <Textarea
                value={personalization.additionalInfo}
                onChange={(e) =>
                  setPersonalization((prev) => ({
                    ...prev,
                    additionalInfo: e.target.value.slice(
                      0,
                      ADDITIONAL_INFO_LIMIT
                    ),
                  }))
                }
                placeholder="Share your preferences, goals, interests, or any context that would help the AI assist you better..."
                className="bg-slate-800/30 border-slate-600/50 text-slate-300 resize-none rounded-xl min-h-[120px] focus:border-purple-500/50 transition-colors"
                maxLength={ADDITIONAL_INFO_LIMIT}
                rows={5}
              />
              <div className="absolute bottom-3 right-3 text-xs text-slate-500">
                {personalization.additionalInfo.length}/{ADDITIONAL_INFO_LIMIT}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Provide additional context about your work, interests,
              communication style, or any specific needs
            </p>
          </motion.div>

          {/* Save Button */}
          <motion.div
            className="flex items-center justify-between pt-6 border-t border-slate-700/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Sparkles className="h-3 w-3" />
              <span>Personalization helps improve AI responses</span>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className={cn(
                  "rounded-xl font-semibold transition-all duration-300",
                  hasChanges
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg hover:shadow-purple-500/25"
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
