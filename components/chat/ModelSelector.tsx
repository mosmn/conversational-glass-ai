"use client";

import React, { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap,
  Brain,
  Cpu,
  Sparkles,
  Clock,
  DollarSign,
  ChevronDown,
  Star,
  Flame,
  Diamond,
  Rocket,
  Settings,
  Key,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModels } from "@/hooks/useModels";
import type { Model } from "@/lib/api/client";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  showRecommendations?: boolean;
  className?: string;
}

export function ModelSelector({
  selectedModel,
  onModelChange,
  showRecommendations = true,
  className,
}: ModelSelectorProps) {
  const [selectedTab, setSelectedTab] = useState("all");
  const { models, loading, error, modelsByProvider, recommendations } =
    useModels();

  // Get provider icon
  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "groq":
        return "⚡";
      case "openai":
        return "🤖";
      case "claude":
      case "anthropic":
        return "🧩";
      case "gemini":
      case "google":
        return "🔍";
      case "openrouter":
        return "🔀";
      default:
        return "🤖";
    }
  };

  // Get model icon based on provider and characteristics
  const getModelIcon = (model: Model) => {
    if (model.provider === "groq") {
      if (model.name.includes("70b") || model.name.includes("70B")) {
        return Flame;
      } else if (model.name.includes("guard") || model.name.includes("Guard")) {
        return Diamond;
      } else {
        return Zap;
      }
    } else if (model.provider === "openai") {
      return model.name.includes("4") ? Brain : Rocket;
    } else if (model.provider === "claude" || model.provider === "anthropic") {
      return Sparkles;
    } else if (model.provider === "gemini" || model.provider === "google") {
      return Cpu;
    }
    return Brain;
  };

  // Get speed color
  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case "fast":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "slow":
        return "text-orange-400";
      default:
        return "text-gray-400";
    }
  };

  // Get efficiency color (cost)
  const getEfficiencyColor = (efficiency: string) => {
    switch (efficiency) {
      case "high":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "low":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  // Format context window
  const formatContextWindow = (contextWindow: number): string => {
    if (contextWindow >= 1000000) {
      return `${Math.round(contextWindow / 1000000)}M`;
    } else if (contextWindow >= 1000) {
      return `${Math.round(contextWindow / 1000)}K`;
    }
    return `${contextWindow}`;
  };

  // Get models by tab
  const getModelsByTab = (tab: string) => {
    switch (tab) {
      case "groq":
        return modelsByProvider.groq || [];
      case "openai":
        return modelsByProvider.openai || [];
      case "claude":
        return modelsByProvider.claude || [];
      case "gemini":
        return modelsByProvider.gemini || [];
      case "openrouter":
        return modelsByProvider.openrouter || [];
      case "recommended":
        return models.filter((m) => m.isRecommended);
      case "new":
        return models.filter((m) => m.isNew);
      default:
        return models;
    }
  };

  const currentModel = models.find((m) => m.id === selectedModel) || null;

  // Loading state
  if (loading) {
    return (
      <Button
        variant="outline"
        className={cn(
          "border-slate-600 min-w-[220px] justify-between",
          "text-white bg-slate-800/50",
          "backdrop-blur-sm",
          className
        )}
        disabled
      >
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs bg-slate-600/20">
            <Brain className="h-3 w-3 animate-pulse" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">Loading models...</span>
            <span className="text-xs text-slate-400">Please wait</span>
          </div>
        </div>
      </Button>
    );
  }

  // Error state
  if (error) {
    return (
      <Button
        variant="outline"
        className={cn(
          "border-red-600 min-w-[220px] justify-between",
          "text-white bg-red-900/20",
          "backdrop-blur-sm",
          className
        )}
        disabled
      >
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs bg-red-600/20">
            <Settings className="h-3 w-3" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">Error loading models</span>
            <span className="text-xs text-red-400">Check API keys</span>
          </div>
        </div>
      </Button>
    );
  }

  // No models available
  if (models.length === 0) {
    return (
      <Button
        variant="outline"
        className={cn(
          "border-amber-600 min-w-[220px] justify-between",
          "text-white bg-amber-900/20",
          "backdrop-blur-sm",
          className
        )}
        disabled
      >
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs bg-amber-600/20">
            <Key className="h-3 w-3" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">No models available</span>
            <span className="text-xs text-amber-400">Add API keys</span>
          </div>
        </div>
      </Button>
    );
  }

  // Use first model if selected model not found
  const displayModel = currentModel || models[0];
  const ModelIcon = getModelIcon(displayModel);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "border-slate-600 hover:border-emerald-500 min-w-[220px] justify-between",
            "text-white hover:text-white bg-slate-800/50 hover:bg-slate-700/50",
            "backdrop-blur-sm transition-all duration-200",
            className
          )}
        >
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs bg-slate-600/20 text-slate-400">
              <ModelIcon className="h-3 w-3" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{displayModel.name}</span>
              <span className="text-xs text-slate-400 capitalize">
                {displayModel.provider}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {displayModel.isNew && (
              <Badge className="bg-emerald-600 text-white text-xs px-1 py-0">
                NEW
              </Badge>
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[600px] p-0 bg-slate-800 border-slate-700 shadow-xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700">
          <h3 className="font-semibold text-xl mb-2 text-white flex items-center">
            <Brain className="h-5 w-5 mr-2 text-emerald-400" />
            Choose AI Model
          </h3>
          <p className="text-sm text-slate-300">
            Select the perfect AI model for your task. Models are available
            based on your configured API keys.
          </p>
        </div>

        {/* Model Tabs */}
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="w-full"
        >
          <div className="px-6 pt-4 pb-2">
            <TabsList className="grid w-full grid-cols-7 bg-slate-900/50 text-xs">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="recommended" className="text-xs">
                ⭐ Top
              </TabsTrigger>
              <TabsTrigger value="groq" className="text-xs">
                ⚡ Groq
              </TabsTrigger>
              <TabsTrigger value="openai" className="text-xs">
                🤖 OpenAI
              </TabsTrigger>
              <TabsTrigger value="claude" className="text-xs">
                🧩 Claude
              </TabsTrigger>
              <TabsTrigger value="gemini" className="text-xs">
                🔍 Gemini
              </TabsTrigger>
              <TabsTrigger value="openrouter" className="text-xs">
                🔀 Router
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-4 pb-4 max-h-[500px] overflow-y-auto">
            <TabsContent value={selectedTab} className="mt-2 space-y-3">
              {getModelsByTab(selectedTab).map((model) => {
                const ModelIcon = getModelIcon(model);
                return (
                  <Card
                    key={model.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                      "border-2 hover:shadow-lg hover:shadow-black/20",
                      selectedModel === model.id
                        ? "bg-emerald-600/20 border-emerald-500 shadow-lg shadow-emerald-500/20"
                        : "bg-slate-800/30 border-slate-700 hover:border-slate-600 hover:bg-slate-700/50"
                    )}
                    onClick={() => onModelChange(model.id)}
                  >
                    <CardContent className="p-4">
                      {/* Model Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-600/20 border border-slate-500/30">
                            <ModelIcon className="h-6 w-6 text-slate-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-semibold text-white">
                                {model.name}
                              </h4>
                              {model.isNew && (
                                <Badge className="bg-emerald-600 text-white text-xs px-2 py-0">
                                  NEW
                                </Badge>
                              )}
                              {model.isRecommended && (
                                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              )}
                            </div>
                            <p className="text-sm text-slate-300 leading-relaxed">
                              {model.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs border-slate-600",
                              selectedModel === model.id
                                ? "border-emerald-500 text-emerald-400"
                                : "text-slate-400"
                            )}
                          >
                            {getProviderIcon(model.provider)} {model.provider}
                          </Badge>
                          {selectedModel === model.id && (
                            <Badge className="bg-emerald-600 text-white">
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Performance Metrics */}
                      <div className="grid grid-cols-3 gap-4 mb-3 p-3 bg-slate-900/30 rounded-lg">
                        <div className="text-center">
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <Clock className="h-3 w-3 text-slate-500" />
                            <span className="text-xs text-slate-500">
                              Speed
                            </span>
                          </div>
                          <span
                            className={cn(
                              "text-sm font-medium capitalize",
                              getSpeedColor(model.performance.speed)
                            )}
                          >
                            {model.performance.speed}
                          </span>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <DollarSign className="h-3 w-3 text-slate-500" />
                            <span className="text-xs text-slate-500">Cost</span>
                          </div>
                          <span
                            className={cn(
                              "text-sm font-medium capitalize",
                              getEfficiencyColor(model.performance.efficiency)
                            )}
                          >
                            {model.performance.efficiency === "high"
                              ? "Low"
                              : model.performance.efficiency === "low"
                              ? "High"
                              : "Medium"}
                          </span>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <Brain className="h-3 w-3 text-slate-500" />
                            <span className="text-xs text-slate-500">
                              Context
                            </span>
                          </div>
                          <span className="text-sm font-medium text-slate-200">
                            {formatContextWindow(model.contextWindow)}
                          </span>
                        </div>
                      </div>

                      {/* Tags and Best Use Case */}
                      <div className="mb-3">
                        <h5 className="text-xs font-medium text-slate-400 mb-2">
                          Best For
                        </h5>
                        <div className="text-sm text-slate-300 mb-2">
                          {model.bestUseCase}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {model.tags
                            .slice(0, 3)
                            .map((tag: string, idx: number) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs border-slate-600 text-slate-400"
                              >
                                {tag}
                              </Badge>
                            ))}
                        </div>
                      </div>

                      {/* Tier */}
                      <div className="flex items-center justify-between">
                        <Badge
                          className={cn(
                            "text-xs",
                            model.tier === "premium"
                              ? "bg-purple-600/20 text-purple-400 border-purple-500/30"
                              : model.tier === "standard"
                              ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                              : "bg-green-600/20 text-green-400 border-green-500/30"
                          )}
                        >
                          {model.tier.charAt(0).toUpperCase() +
                            model.tier.slice(1)}
                        </Badge>
                        {model.capabilities.multiModal && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-slate-700/50 text-slate-300"
                          >
                            Multi-modal
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </div>
        </Tabs>

        {/* Smart Recommendations Footer */}
        {showRecommendations && recommendations && (
          <>
            <DropdownMenuSeparator />
            <div className="p-6 bg-gradient-to-r from-slate-800 to-slate-700">
              <h4 className="font-medium mb-3 text-emerald-400 flex items-center">
                <Sparkles className="h-4 w-4 mr-2" />
                💡 Smart Recommendations
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <span className="text-emerald-400">⚡</span>
                    <div>
                      <strong className="text-white">Fastest:</strong>
                      <div className="text-slate-300">
                        {recommendations.fastest?.name ||
                          "No fast model available"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-400">🧠</span>
                    <div>
                      <strong className="text-white">Smartest:</strong>
                      <div className="text-slate-300">
                        {recommendations.smartest?.name ||
                          "No advanced model available"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <span className="text-green-400">💰</span>
                    <div>
                      <strong className="text-white">Most Efficient:</strong>
                      <div className="text-slate-300">
                        {recommendations.cheapest?.name ||
                          "No efficient model available"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-400">⚖️</span>
                    <div>
                      <strong className="text-white">Balanced:</strong>
                      <div className="text-slate-300">
                        {recommendations.balanced?.name ||
                          "No balanced model available"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
