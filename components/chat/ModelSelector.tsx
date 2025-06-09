"use client";

import React from "react";
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
import { Zap, Brain, Cpu, Sparkles, Clock, DollarSign } from "lucide-react";

import type { Model as APIModel } from "@/lib/api/client";

interface Model {
  id: string;
  name: string;
  description: string;
  speed: "Fast" | "Medium" | "Slower";
  cost: "Lower" | "Medium" | "Higher";
  icon: React.ComponentType<any>;
  color: string;
  capabilities: string[];
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  models?: APIModel[];
  showRecommendations?: boolean;
}

export function ModelSelector({
  selectedModel,
  onModelChange,
  models: apiModels = [],
  showRecommendations = true,
}: ModelSelectorProps) {
  // Convert API models to UI models with fallback to hardcoded models
  const fallbackModels: Model[] = [
    {
      id: "gpt-4",
      name: "GPT-4",
      description: "Most capable model for complex reasoning",
      speed: "Slower",
      cost: "Higher",
      icon: Brain,
      color: "emerald",
      capabilities: [
        "Complex reasoning",
        "Code generation",
        "Creative writing",
        "Analysis",
      ],
    },
    {
      id: "gpt-3.5",
      name: "GPT-3.5 Turbo",
      description: "Fast and efficient for most tasks",
      speed: "Fast",
      cost: "Lower",
      icon: Zap,
      color: "blue",
      capabilities: ["Quick responses", "General chat", "Simple coding", "Q&A"],
    },
    {
      id: "claude-3",
      name: "Claude-3 Sonnet",
      description: "Thoughtful, nuanced responses",
      speed: "Medium",
      cost: "Medium",
      icon: Sparkles,
      color: "purple",
      capabilities: [
        "Thoughtful analysis",
        "Writing",
        "Reasoning",
        "Safety-focused",
      ],
    },
    {
      id: "gemini",
      name: "Gemini Pro",
      description: "Multi-modal AI with vision capabilities",
      speed: "Fast",
      cost: "Medium",
      icon: Cpu,
      color: "amber",
      capabilities: ["Multi-modal", "Image analysis", "Code", "Fast responses"],
    },
  ];

  // Convert API models to UI format or use fallback
  const models: Model[] =
    apiModels.length > 0
      ? apiModels.map((apiModel) => ({
          id: apiModel.id,
          name: apiModel.name,
          description: apiModel.description,
          speed:
            apiModel.performance.speed === "fast"
              ? "Fast"
              : apiModel.performance.speed === "medium"
              ? "Medium"
              : "Slower",
          cost:
            apiModel.pricing.inputCostPer1kTokens < 0.001
              ? "Lower"
              : apiModel.pricing.inputCostPer1kTokens < 0.01
              ? "Medium"
              : "Higher",
          icon: getIconForProvider(apiModel.provider),
          color: getColorForProvider(apiModel.provider),
          capabilities: apiModel.uiHints.tags,
        }))
      : fallbackModels;

  function getIconForProvider(provider: string) {
    switch (provider) {
      case "openai":
        return Brain;
      case "anthropic":
        return Sparkles;
      case "google":
        return Cpu;
      case "groq":
        return Zap;
      default:
        return Brain;
    }
  }

  function getColorForProvider(provider: string) {
    switch (provider) {
      case "openai":
        return "emerald";
      case "anthropic":
        return "purple";
      case "google":
        return "amber";
      case "groq":
        return "blue";
      default:
        return "emerald";
    }
  }

  const currentModel = models.find((m) => m.id === selectedModel) || models[0];

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case "Fast":
        return "text-green-400";
      case "Medium":
        return "text-yellow-400";
      case "Slower":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getCostColor = (cost: string) => {
    switch (cost) {
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="border-slate-600 hover:border-emerald-500 min-w-[200px] justify-start text-white hover:text-white"
        >
          <currentModel.icon
            className={`h-4 w-4 mr-2 text-${currentModel.color}-400`}
          />
          <span className="flex-1 text-left">{currentModel.name}</span>
          <Badge
            variant="outline"
            className={`ml-2 border-${currentModel.color}-500 text-${currentModel.color}-400`}
          >
            {currentModel.speed}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-96 p-0 bg-slate-800 border-slate-700"
      >
        <div className="p-4 border-b border-slate-700">
          <h3 className="font-semibold text-lg mb-2 text-white">
            Choose AI Model
          </h3>
          <p className="text-sm text-slate-300">
            Each model has different strengths. Choose based on your task
            complexity and speed needs.
          </p>
        </div>

        <div className="p-2 space-y-2">
          {models.map((model) => (
            <Card
              key={model.id}
              className={`cursor-pointer transition-all duration-200 hover:bg-slate-700/70 ${
                selectedModel === model.id
                  ? `bg-${model.color}-600/20 border-${model.color}-500 hover:bg-${model.color}-600/30`
                  : "bg-slate-800/30 border-slate-700 hover:border-slate-600"
              }`}
              onClick={() => onModelChange(model.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 bg-${model.color}-600/20 rounded-lg flex items-center justify-center`}
                    >
                      <model.icon
                        className={`h-5 w-5 text-${model.color}-400`}
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{model.name}</h4>
                      <p className="text-sm text-slate-300">
                        {model.description}
                      </p>
                    </div>
                  </div>
                  {selectedModel === model.id && (
                    <Badge className={`bg-${model.color}-600 text-white`}>
                      Active
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span className={getSpeedColor(model.speed)}>
                        {model.speed}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-3 w-3 text-slate-500" />
                      <span className={getCostColor(model.cost)}>
                        {model.cost} cost
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex flex-wrap gap-1">
                    {model.capabilities.slice(0, 3).map((capability, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-xs bg-slate-700 text-slate-200 border-slate-600"
                      >
                        {capability}
                      </Badge>
                    ))}
                    {model.capabilities.length > 3 && (
                      <Badge
                        variant="secondary"
                        className="text-xs bg-slate-700 text-slate-200 border-slate-600"
                      >
                        +{model.capabilities.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {showRecommendations && (
          <>
            <DropdownMenuSeparator />
            <div className="p-4 bg-slate-800/50">
              <h4 className="font-medium mb-2 text-emerald-400">
                💡 Smart Recommendations
              </h4>
              <div className="space-y-2 text-sm text-slate-300">
                <div>
                  • <strong className="text-white">Complex tasks:</strong> Use
                  GPT-4 for reasoning and analysis
                </div>
                <div>
                  • <strong className="text-white">Quick chats:</strong> GPT-3.5
                  Turbo for fast responses
                </div>
                <div>
                  • <strong className="text-white">Creative work:</strong>{" "}
                  Claude-3 for thoughtful writing
                </div>
                <div>
                  • <strong className="text-white">Visual content:</strong>{" "}
                  Gemini Pro for image analysis
                </div>
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
