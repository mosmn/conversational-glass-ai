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
} from "lucide-react";
import { cn } from "@/lib/utils";

import type { Model as APIModel } from "@/lib/api/client";

interface ProcessedModel {
  id: string;
  name: string;
  description: string;
  speed: "Ultra Fast" | "Fast" | "Medium" | "Slower";
  cost: "Free" | "Lower" | "Medium" | "Higher";
  icon: React.ComponentType<any>;
  color: string;
  provider: string;
  capabilities: string[];
  specialties: string[];
  contextWindow: string;
  recommended?: boolean;
  new?: boolean;
  originalModel: APIModel;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  models?: APIModel[];
  showRecommendations?: boolean;
  className?: string;
}

export function ModelSelector({
  selectedModel,
  onModelChange,
  models: apiModels = [],
  showRecommendations = true,
  className,
}: ModelSelectorProps) {
  const [selectedTab, setSelectedTab] = useState("all");

  // Process dynamic models from API
  const processApiModel = (model: APIModel): ProcessedModel => {
    // Determine speed based on provider and model characteristics
    let speed: "Ultra Fast" | "Fast" | "Medium" | "Slower" = "Medium";
    if (model.provider === "groq") {
      speed = "Ultra Fast";
    } else if (model.name.includes("Flash") || model.name.includes("Haiku")) {
      speed = "Fast";
    } else if (model.name.includes("GPT-4")) {
      speed = "Slower";
    } else {
      speed = "Fast";
    }

    // Determine cost based on pricing
    let cost: "Free" | "Lower" | "Medium" | "Higher" = "Medium";
    if (model.pricing) {
      const totalCost =
        model.pricing.inputCostPer1kTokens +
        model.pricing.outputCostPer1kTokens;
      if (totalCost < 0.0005) cost = "Free";
      else if (totalCost < 0.005) cost = "Lower";
      else if (totalCost < 0.02) cost = "Medium";
      else cost = "Higher";
    }

    // Determine icon based on provider and characteristics
    let icon = Brain;
    let color = "blue";
    if (model.provider === "groq") {
      if (model.name.includes("70b") || model.name.includes("70B")) {
        icon = Flame;
        color = "orange";
      } else if (model.name.includes("guard") || model.name.includes("Guard")) {
        icon = Diamond;
        color = "red";
      } else {
        icon = Zap;
        color = "yellow";
      }
    } else if (model.provider === "openai") {
      icon = model.name.includes("4") ? Brain : Rocket;
      color = model.name.includes("4") ? "emerald" : "blue";
    } else if (model.provider === "claude" || model.provider === "anthropic") {
      icon = Sparkles;
      color = "purple";
    } else if (model.provider === "gemini" || model.provider === "google") {
      icon = Cpu;
      color = "amber";
    }

    // Extract capabilities and specialties from description
    const capabilities = [];
    const specialties = [];

    if (
      model.description.includes("reasoning") ||
      model.description.includes("complex")
    ) {
      capabilities.push("Complex reasoning");
      specialties.push("Deep analysis");
    }
    if (
      model.description.includes("fast") ||
      model.description.includes("quick")
    ) {
      capabilities.push("Quick responses");
      specialties.push("Speed optimization");
    }
    if (
      model.description.includes("code") ||
      model.description.includes("programming")
    ) {
      capabilities.push("Code generation");
      specialties.push("Programming assistance");
    }
    if (
      model.description.includes("creative") ||
      model.description.includes("writing")
    ) {
      capabilities.push("Creative writing");
      specialties.push("Content creation");
    }
    if (
      model.description.includes("safety") ||
      model.description.includes("moderation")
    ) {
      capabilities.push("Content moderation");
      specialties.push("Safety analysis");
    }

    // Default capabilities if none detected
    if (capabilities.length === 0) {
      capabilities.push("General assistance", "Text processing");
    }
    if (specialties.length === 0) {
      specialties.push("Versatile responses", "General tasks");
    }

    return {
      id: model.id,
      name: model.name,
      description: model.description,
      speed,
      cost,
      icon,
      color,
      provider:
        model.provider.charAt(0).toUpperCase() + model.provider.slice(1),
      capabilities,
      specialties,
      contextWindow: formatContextWindow(model.contextWindow),
      recommended: model.provider === "groq" && model.name.includes("70B"),
      new: model.provider === "groq",
      originalModel: model,
    };
  };

  const formatContextWindow = (contextWindow: number): string => {
    if (contextWindow >= 1000000) {
      return `${Math.round(contextWindow / 1000000)}M`;
    } else if (contextWindow >= 1000) {
      return `${Math.round(contextWindow / 1000)}K`;
    }
    return `${contextWindow}`;
  };

  // Process all API models
  const enhancedModels: ProcessedModel[] = apiModels.map(processApiModel);

  // Use API models if available, otherwise empty (loading state)
  const finalModels = enhancedModels.length > 0 ? enhancedModels : [];

  // Filter models by provider for tabs
  const groqModels = finalModels.filter((m) => m.provider === "Groq");
  const openaiModels = finalModels.filter((m) => m.provider === "Openai");
  const anthropicModels = finalModels.filter(
    (m) => m.provider === "Claude" || m.provider === "Anthropic"
  );
  const googleModels = finalModels.filter(
    (m) => m.provider === "Gemini" || m.provider === "Google"
  );

  const getModelsByTab = (tab: string) => {
    switch (tab) {
      case "groq":
        return groqModels;
      case "openai":
        return openaiModels;
      case "anthropic":
        return anthropicModels;
      case "google":
        return googleModels;
      case "recommended":
        return finalModels.filter((m) => m.recommended);
      default:
        return finalModels;
    }
  };

  const currentModel =
    finalModels.find((m) => m.id === selectedModel) ||
    (finalModels.length > 0 ? finalModels[0] : null);

  // Show loading state if no models are available
  if (!currentModel) {
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

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case "Ultra Fast":
        return "text-green-300";
      case "Fast":
        return "text-green-400";
      case "Medium":
        return "text-yellow-400";
      case "Slower":
        return "text-orange-400";
      default:
        return "text-gray-400";
    }
  };

  const getCostColor = (cost: string) => {
    switch (cost) {
      case "Free":
        return "text-green-300";
      case "Lower":
        return "text-green-400";
      case "Medium":
        return "text-yellow-400";
      case "Higher":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "Groq":
        return "⚡";
      case "OpenAI":
        return "🤖";
      case "Anthropic":
        return "🧩";
      case "Google":
        return "🔍";
      default:
        return "🤖";
    }
  };

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
            <div
              className={cn(
                "w-6 h-6 rounded-md flex items-center justify-center text-xs",
                `bg-${currentModel.color}-600/20 text-${currentModel.color}-400`
              )}
            >
              <currentModel.icon className="h-3 w-3" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{currentModel.name}</span>
              <span className="text-xs text-slate-400">
                {currentModel.provider}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {currentModel.new && (
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
            Select the perfect AI model for your task. Each model has unique
            strengths optimized for different use cases.
          </p>
        </div>

        {/* Model Tabs */}
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="w-full"
        >
          <div className="px-6 pt-4 pb-2">
            <TabsList className="grid w-full grid-cols-6 bg-slate-900/50">
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
              <TabsTrigger value="anthropic" className="text-xs">
                🧩 Claude
              </TabsTrigger>
              <TabsTrigger value="google" className="text-xs">
                🔍 Google
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-4 pb-4 max-h-[500px] overflow-y-auto">
            <TabsContent value={selectedTab} className="mt-2 space-y-3">
              {getModelsByTab(selectedTab).map((model) => (
                <Card
                  key={model.id}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                    "border-2 hover:shadow-lg hover:shadow-black/20",
                    selectedModel === model.id
                      ? `bg-${model.color}-600/20 border-${model.color}-500 shadow-lg shadow-${model.color}-500/20`
                      : "bg-slate-800/30 border-slate-700 hover:border-slate-600 hover:bg-slate-700/50"
                  )}
                  onClick={() => onModelChange(model.id)}
                >
                  <CardContent className="p-4">
                    {/* Model Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div
                          className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center",
                            `bg-${model.color}-600/20 border border-${model.color}-500/30`
                          )}
                        >
                          <model.icon
                            className={cn("h-6 w-6", `text-${model.color}-400`)}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-semibold text-white">
                              {model.name}
                            </h4>
                            {model.new && (
                              <Badge className="bg-emerald-600 text-white text-xs px-2 py-0">
                                NEW
                              </Badge>
                            )}
                            {model.recommended && (
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
                              ? `border-${model.color}-500 text-${model.color}-400`
                              : "text-slate-400"
                          )}
                        >
                          {getProviderIcon(model.provider)} {model.provider}
                        </Badge>
                        {selectedModel === model.id && (
                          <Badge className={`bg-${model.color}-600 text-white`}>
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
                          <span className="text-xs text-slate-500">Speed</span>
                        </div>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            getSpeedColor(model.speed)
                          )}
                        >
                          {model.speed}
                        </span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1 mb-1">
                          <DollarSign className="h-3 w-3 text-slate-500" />
                          <span className="text-xs text-slate-500">Cost</span>
                        </div>
                        <span
                          className={cn(
                            "text-sm font-medium",
                            getCostColor(model.cost)
                          )}
                        >
                          {model.cost}
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
                          {model.contextWindow}
                        </span>
                      </div>
                    </div>

                    {/* Capabilities */}
                    <div className="mb-3">
                      <h5 className="text-xs font-medium text-slate-400 mb-2">
                        Core Capabilities
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {model.capabilities.map(
                          (capability: string, idx: number) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-xs bg-slate-700/50 text-slate-300 border-slate-600"
                            >
                              {capability}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>

                    {/* Specialties */}
                    <div>
                      <h5 className="text-xs font-medium text-slate-400 mb-2">
                        Best For
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {model.specialties.map(
                          (specialty: string, idx: number) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className={cn(
                                "text-xs border-slate-600 text-slate-400",
                                `hover:border-${model.color}-500 hover:text-${model.color}-400`
                              )}
                            >
                              {specialty}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </div>
        </Tabs>

        {/* Smart Recommendations Footer */}
        {showRecommendations && (
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
                    <span className="text-orange-400">🦙</span>
                    <div>
                      <strong className="text-white">Best Overall:</strong>
                      <div className="text-slate-300">
                        Llama 3.3 70B for versatile, high-quality responses
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-yellow-400">⚡</span>
                    <div>
                      <strong className="text-white">Fastest:</strong>
                      <div className="text-slate-300">
                        Llama 3.1 8B for instant responses
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <span className="text-emerald-400">🧠</span>
                    <div>
                      <strong className="text-white">Complex Tasks:</strong>
                      <div className="text-slate-300">
                        GPT-4 for deep reasoning and analysis
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-purple-400">✨</span>
                    <div>
                      <strong className="text-white">Creative Work:</strong>
                      <div className="text-slate-300">
                        Claude-3 for thoughtful, nuanced writing
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
