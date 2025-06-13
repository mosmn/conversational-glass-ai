"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronDown,
  Star,
  Brain,
  Settings,
  Key,
  Zap,
  Target,
  Sparkles,
  ArrowRight,
  Clock,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEnabledModels } from "@/hooks/useEnabledModels";
import type { Model } from "@/lib/api/client";
import {
  getProviderIcon,
  getModelIcon,
  getProviderColor,
  getProviderDisplayName,
} from "@/lib/utils/provider-icons";
import {
  saveSelectedModel,
  loadSelectedModel,
  isModelStillValid,
} from "@/lib/utils/model-persistence";
import Link from "next/link";
import { Input } from "@/components/ui/input";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  showRecommendations?: boolean;
  className?: string;
}

// Smart model categories for easy user selection
const getModelCategory = (
  model: Model
): "fast" | "smart" | "balanced" | "creative" => {
  const name = model.name.toLowerCase();
  const provider = model.provider.toLowerCase();

  // Fast models (good for quick responses)
  if (provider === "groq" || name.includes("3.5") || name.includes("haiku")) {
    return "fast";
  }

  // Smart models (best quality)
  if (
    name.includes("gpt-4") ||
    name.includes("claude-3-opus") ||
    name.includes("sonnet")
  ) {
    return "smart";
  }

  // Creative models (good for creative tasks)
  if (name.includes("claude") || name.includes("gemini-pro")) {
    return "creative";
  }

  // Default to balanced
  return "balanced";
};

const categoryInfo = {
  fast: {
    icon: Zap,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    label: "Fast",
    description: "Quick responses",
  },
  smart: {
    icon: Brain,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    label: "Smart",
    description: "Best quality",
  },
  balanced: {
    icon: Target,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    label: "Balanced",
    description: "Good all-around",
  },
  creative: {
    icon: Sparkles,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    label: "Creative",
    description: "Best for creativity",
  },
};

export function ModelSelector({
  selectedModel,
  onModelChange,
  showRecommendations = true,
  className,
}: ModelSelectorProps) {
  const [wasRestored, setWasRestored] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { enabledModels, loading, error, defaultModel } = useEnabledModels();

  // Load persisted model selection on mount when no model is selected
  useEffect(() => {
    if (enabledModels.length === 0) return;

    // CRITICAL FIX: If there's already a selected model and it's valid, don't change it
    // This prevents overriding user's model selection in branch conversations
    if (selectedModel && enabledModels.find((m) => m.id === selectedModel)) {
      console.log(
        "🔒 ModelSelector: Keeping existing selected model:",
        selectedModel
      );
      return;
    }

    console.log("🔄 ModelSelector: Initializing model selection...");
    console.log("  Current selectedModel:", selectedModel);
    console.log("  Available models:", enabledModels.length);
    console.log("  Default model from preferences:", defaultModel);

    // First, try to use the user's default model from preferences
    if (defaultModel && enabledModels.find((m) => m.id === defaultModel)) {
      console.log("✅ Using default model from preferences:", defaultModel);
      onModelChange(defaultModel);
      return;
    }

    // Second, try to restore from localStorage
    const persistedSelection = loadSelectedModel();
    if (
      persistedSelection &&
      isModelStillValid(persistedSelection, enabledModels)
    ) {
      // Restore the previously selected model if it's still valid
      console.log(
        "✅ Restoring from localStorage:",
        persistedSelection.modelId
      );
      onModelChange(persistedSelection.modelId);
      setWasRestored(true);
      // Clear the restoration indicator after a few seconds
      setTimeout(() => setWasRestored(false), 3000);
    } else {
      // Fallback: select the first recommended or first available model
      const fallbackModel =
        enabledModels.find((m) => m.isRecommended) || enabledModels[0];
      if (fallbackModel) {
        console.log("✅ Using fallback model:", fallbackModel.id);
        onModelChange(fallbackModel.id);
      }
    }
  }, [enabledModels, selectedModel, onModelChange, defaultModel]);

  // Save model selection to localStorage when it changes
  useEffect(() => {
    if (!selectedModel || enabledModels.length === 0) return;

    const currentModel = enabledModels.find((m) => m.id === selectedModel);
    if (currentModel) {
      saveSelectedModel(
        selectedModel,
        currentModel.provider,
        currentModel.name
      );
    }
  }, [selectedModel, enabledModels]);

  // Loading state
  if (loading) {
    return (
      <Button
        variant="outline"
        className={cn(
          "border-slate-600 min-w-[120px] sm:min-w-[200px] justify-between",
          "text-white bg-slate-800/50 backdrop-blur-sm text-xs sm:text-sm",
          className
        )}
        disabled
      >
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-md flex items-center justify-center bg-slate-600/20">
            <Brain className="h-3 w-3 animate-pulse" />
          </div>
          <span className="text-sm">Loading models...</span>
        </div>
      </Button>
    );
  }

  // Error state
  if (error) {
    return (
      <Link href="/settings/api-keys">
        <Button
          variant="outline"
          className={cn(
            "border-red-600 min-w-[200px] justify-between",
            "text-white bg-red-900/20 backdrop-blur-sm hover:bg-red-900/30",
            className
          )}
        >
          <div className="flex items-center space-x-2">
            <Key className="h-4 w-4 text-red-400" />
            <span className="text-sm">Setup API Keys</span>
          </div>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    );
  }

  // No models available - direct user to enable models
  if (enabledModels.length === 0) {
    return (
      <Link href="/settings/models">
        <Button
          variant="outline"
          className={cn(
            "border-amber-600 min-w-[200px] justify-between",
            "text-white bg-amber-900/20 backdrop-blur-sm hover:bg-amber-900/30",
            "hover:scale-105 transition-all duration-200",
            className
          )}
        >
          <div className="flex items-center space-x-2">
            <Settings className="h-4 w-4 text-amber-400" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">No Models Enabled</span>
              <span className="text-xs text-amber-300">
                Click to enable models
              </span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-amber-400" />
        </Button>
      </Link>
    );
  }

  const currentModel =
    enabledModels.find((m) => m.id === selectedModel) || enabledModels[0];
  const ModelIcon = getModelIcon(currentModel.name, currentModel.provider);

  // Categorize enabled models for better UX
  const categorizedModels = {
    recommended: enabledModels.filter((m) => m.isRecommended),
    fast: enabledModels.filter((m) => getModelCategory(m) === "fast"),
    smart: enabledModels.filter((m) => getModelCategory(m) === "smart"),
    creative: enabledModels.filter((m) => getModelCategory(m) === "creative"),
    recent: enabledModels.filter((m) => m.isNew),
  };

  // Get the category of current model for better display
  const currentCategory = getModelCategory(currentModel);
  const categoryConfig = categoryInfo[currentCategory];

  // Filtered results when searching
  const normalizedSearch = searchTerm.toLowerCase();
  const searchResults = enabledModels.filter(
    (m) =>
      m.name.toLowerCase().includes(normalizedSearch) ||
      m.id.toLowerCase().includes(normalizedSearch) ||
      m.provider.toLowerCase().includes(normalizedSearch)
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "border-slate-600 hover:border-emerald-500 min-w-[200px] justify-between",
            "text-white hover:text-white bg-slate-800/50 hover:bg-slate-700/50",
            "backdrop-blur-sm transition-all duration-200",
            className
          )}
        >
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-md flex items-center justify-center bg-slate-600/20 flex-shrink-0">
              <ModelIcon
                className="h-2.5 w-2.5 sm:h-3 sm:w-3"
                size={12}
                style={{ color: getProviderColor(currentModel.provider) }}
              />
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="text-xs sm:text-sm font-medium truncate">
                {currentModel.name}
              </span>
              <div className="flex items-center space-x-1">
                <categoryConfig.icon
                  className={cn(
                    "h-2 w-2 sm:h-2.5 sm:w-2.5",
                    categoryConfig.color
                  )}
                />
                <span className="text-xs text-slate-400">
                  {categoryConfig.label}
                </span>
                {wasRestored && (
                  <span className="text-xs text-emerald-400 animate-pulse hidden sm:inline">
                    • Restored
                  </span>
                )}
              </div>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[350px] sm:w-[400px] p-0 bg-slate-800 border-slate-700 shadow-xl"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg text-white mb-1">
                Choose AI Model
              </h3>
              <p className="text-sm text-slate-300">
                {enabledModels.length} enabled model
                {enabledModels.length !== 1 ? "s" : ""} available
              </p>
            </div>
            <Link href="/settings/models">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white hover:bg-slate-700/50"
              >
                <Settings className="h-4 w-4 mr-1" />
                All Models
              </Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-700 bg-slate-800/60 backdrop-blur">
          <Input
            placeholder="Search models..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-700/40 border-slate-600 placeholder-slate-400 text-sm"
            autoFocus
          />
        </div>

        <div className="p-2 sm:p-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
          {/* Search Results */}
          {searchTerm.trim() !== "" ? (
            <div className="space-y-1">
              {searchResults.length > 0 ? (
                searchResults.map((model) => {
                  const ModelIconComponent = getModelIcon(
                    model.name,
                    model.provider
                  );
                  const isSelected = selectedModel === model.id;

                  return (
                    <Card
                      key={`${model.provider}:${model.id}`}
                      className={cn(
                        "cursor-pointer transition-all duration-200",
                        isSelected
                          ? "bg-emerald-600/20 border-emerald-500 shadow-emerald-500/10"
                          : "bg-slate-800/30 border-slate-700 hover:border-slate-600 hover:bg-slate-700/50"
                      )}
                      onClick={() => {
                        onModelChange(model.id);
                        setSearchTerm("");
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-600/20">
                              <ModelIconComponent
                                className="h-4 w-4"
                                size={16}
                                style={{
                                  color: getProviderColor(model.provider),
                                }}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white text-sm">
                                  {model.name}
                                </span>
                                {isSelected && (
                                  <Badge className="bg-emerald-600 text-white text-xs px-1 py-0">
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-slate-400">
                                  {getProviderDisplayName(model.provider)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-400">
                              {model.bestUseCase}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <p className="text-center text-sm text-slate-400 py-6">
                  No models found.
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Recommended Models */}
              {categorizedModels.recommended.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span className="text-xs font-medium text-yellow-400 uppercase tracking-wide">
                      Recommended
                    </span>
                  </div>
                  <div className="space-y-1">
                    {categorizedModels.recommended.map((model) => {
                      const ModelIconComponent = getModelIcon(
                        model.name,
                        model.provider
                      );
                      const isSelected = selectedModel === model.id;

                      return (
                        <Card
                          key={`${model.provider}:${model.id}`}
                          className={cn(
                            "cursor-pointer transition-all duration-200",
                            isSelected
                              ? "bg-emerald-600/20 border-emerald-500 shadow-emerald-500/10"
                              : "bg-slate-800/30 border-slate-700 hover:border-slate-600 hover:bg-slate-700/50"
                          )}
                          onClick={() => onModelChange(model.id)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-600/20">
                                  <ModelIconComponent
                                    className="h-4 w-4"
                                    size={16}
                                    style={{
                                      color: getProviderColor(model.provider),
                                    }}
                                  />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-white text-sm">
                                      {model.name}
                                    </span>
                                    {isSelected && (
                                      <Badge className="bg-emerald-600 text-white text-xs px-1 py-0">
                                        Active
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-slate-400">
                                      {getProviderDisplayName(model.provider)}
                                    </span>
                                    {/* Quick performance indicators */}
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-2.5 w-2.5 text-slate-500" />
                                      <span
                                        className={cn(
                                          "text-xs capitalize",
                                          model.performance.speed === "fast"
                                            ? "text-green-400"
                                            : model.performance.speed ===
                                              "medium"
                                            ? "text-yellow-400"
                                            : "text-orange-400"
                                        )}
                                      >
                                        {model.performance.speed}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-slate-400">
                                  {model.bestUseCase}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Categories */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {Object.entries(categoryInfo).map(([category, config]) => {
                  const categoryModels =
                    categorizedModels[
                      category as keyof typeof categorizedModels
                    ] || [];
                  if (categoryModels.length === 0) return null;

                  return (
                    <Card
                      key={category}
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                        config.bg,
                        config.border,
                        "bg-slate-800/30 border hover:border-slate-600"
                      )}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <config.icon
                            className={cn("h-4 w-4", config.color)}
                          />
                          <span className="font-medium text-white text-sm">
                            {config.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">
                          {config.description}
                        </p>
                        <div className="space-y-1">
                          {categoryModels.slice(0, 2).map((model) => (
                            <button
                              key={`${model.provider}:${model.id}`}
                              onClick={() => onModelChange(model.id)}
                              className={cn(
                                "w-full text-left p-2 rounded-md transition-colors",
                                selectedModel === model.id
                                  ? "bg-emerald-600/20 text-emerald-400"
                                  : "hover:bg-slate-700/50 text-slate-300"
                              )}
                            >
                              <div className="text-xs font-medium">
                                {model.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {getProviderDisplayName(model.provider)}
                              </div>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Quick access to model settings */}
              <DropdownMenuSeparator />
              <div className="pt-2">
                <Link href="/settings/models">
                  <Button
                    variant="ghost"
                    className="w-full justify-between text-slate-300 hover:text-white hover:bg-slate-700/50"
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span>Model Settings & More</span>
                    </div>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
