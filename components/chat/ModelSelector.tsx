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
  Eye,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

// Helper function to check if a model supports vision
const hasVisionCapability = (model: Model): boolean => {
  return !!(
    model.capabilities.multiModal &&
    model.capabilities.fileSupport?.images?.supported
  );
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
  const { enabledModels, loading, error, defaultModel, refetch } =
    useEnabledModels();

  // Listen for storage events to refresh models when preferences change in other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "model-preferences-updated") {
        refetch();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [refetch]);

  // Model persistence is now handled by usePersistentModel hook in ChatInterface

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

  // Filtered results when searching
  const normalizedSearch = searchTerm.toLowerCase();
  const searchResults =
    searchTerm.trim() !== ""
      ? enabledModels.filter(
          (m) =>
            m.name.toLowerCase().includes(normalizedSearch) ||
            m.id.toLowerCase().includes(normalizedSearch) ||
            m.provider.toLowerCase().includes(normalizedSearch)
        )
      : enabledModels; // Show all models when not searching

  // Sort models alphabetically for consistent display
  const sortedModels = searchResults.sort((a, b) =>
    a.name.localeCompare(b.name)
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
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-medium truncate">
                  {currentModel.name}
                </span>
                {hasVisionCapability(currentModel) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Eye className="h-3 w-3 text-blue-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Supports Vision</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-slate-400">
                  {getProviderDisplayName(currentModel.provider)}
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
                Settings
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

        {/* All Enabled Models - Simple List */}
        <div className="p-2 sm:p-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
          <div className="space-y-1">
            {sortedModels.length > 0 ? (
              sortedModels.map((model) => {
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
                              {hasVisionCapability(model) && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge className="bg-blue-600/80 text-white text-xs px-1.5 py-0.5 flex items-center gap-1">
                                        <Eye className="h-2.5 w-2.5" />
                                        Vision
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        Supports image analysis and vision tasks
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
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
                          <div className="text-xs text-slate-500">
                            {model.contextWindow?.toLocaleString()} tokens
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <p className="text-center text-sm text-slate-400 py-6">
                {searchTerm.trim() !== ""
                  ? "No models found."
                  : "No models enabled. Go to Settings to enable models."}
              </p>
            )}
          </div>

          {/* Quick access to model settings */}
          <div className="mt-4 pt-2 border-t border-slate-700">
            <Link href="/settings/models">
              <Button
                variant="ghost"
                className="w-full justify-between text-slate-300 hover:text-white hover:bg-slate-700/50"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Manage Models</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
