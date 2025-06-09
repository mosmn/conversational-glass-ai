"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Zap,
  Eye,
  FileText,
  Search,
  Star,
  Crown,
  TrendingUp,
  Clock,
  DollarSign,
  Settings,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ModelCardProps {
  model: {
    id: string;
    name: string;
    provider: string;
    maxTokens: number;
    contextWindow: number;
    personality: string;
    description: string;
    visualConfig: {
      color: string;
      avatar: string;
      style: string;
    };
    capabilities: {
      streaming: boolean;
      functionCalling?: boolean;
      multiModal?: boolean;
      vision?: boolean;
      search?: boolean;
      pdfs?: boolean;
    };
    pricing?: {
      inputCostPer1kTokens: number;
      outputCostPer1kTokens: number;
    };
    performance?: {
      speed: "fast" | "medium" | "slow";
      capacity: "high" | "medium" | "low";
      efficiency: "high" | "medium" | "low";
    };
    isRecommended?: boolean;
    isNew?: boolean;
  };
  isSelected?: boolean;
  isDefault?: boolean;
  viewMode?: "grid" | "list";
  onSelect: (model: any) => void;
  onSetDefault: (modelId: string) => void;
  onConfigure: (model: any) => void;
}

const speedIcons = {
  fast: Zap,
  medium: Clock,
  slow: Brain,
};

const speedColors = {
  fast: "text-emerald-400",
  medium: "text-amber-400",
  slow: "text-blue-400",
};

const capabilityIcons = {
  vision: Eye,
  pdfs: FileText,
  search: Search,
  functionCalling: Settings,
  multiModal: Sparkles,
  streaming: TrendingUp,
};

export function ModelCard({
  model,
  isSelected,
  isDefault,
  viewMode = "grid",
  onSelect,
  onSetDefault,
  onConfigure,
}: ModelCardProps) {
  const SpeedIcon = speedIcons[model.performance?.speed || "medium"];
  const speedColor = speedColors[model.performance?.speed || "medium"];

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
    return tokens.toString();
  };

  const formatPrice = (price: number) => {
    return price < 0.001 ? "<$0.001" : `$${price.toFixed(3)}`;
  };

  const getCapabilities = () => {
    const caps = [];
    if (model.capabilities.vision) caps.push("vision");
    if (model.capabilities.pdfs) caps.push("pdfs");
    if (model.capabilities.search) caps.push("search");
    if (model.capabilities.functionCalling) caps.push("functionCalling");
    if (model.capabilities.multiModal) caps.push("multiModal");
    if (model.capabilities.streaming) caps.push("streaming");
    return caps;
  };

  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
        className="relative group"
      >
        {/* Selection glow */}
        {isSelected && (
          <motion.div
            layoutId="selectedGlow"
            className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-xl blur-sm opacity-70"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}

        <Card
          className={cn(
            "relative bg-slate-900/40 backdrop-blur-xl border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 cursor-pointer rounded-xl",
            isSelected &&
              "border-emerald-500/50 bg-slate-900/60 shadow-emerald-500/10",
            isDefault && "ring-2 ring-emerald-500/30"
          )}
          onClick={() => onSelect(model)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {/* Model Info */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${model.visualConfig.color
                      .replace("from-", "")
                      .replace("to-", ", ")})`,
                  }}
                >
                  {model.visualConfig.avatar}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">
                      {model.name}
                    </h3>
                    {isDefault && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        <Crown className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                    {model.isRecommended && (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        <Star className="h-3 w-3 mr-1" />
                        Recommended
                      </Badge>
                    )}
                    {model.isNew && (
                      <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 truncate mb-2">
                    {model.description}
                  </p>

                  {/* Capabilities */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {getCapabilities()
                      .slice(0, 4)
                      .map((cap) => {
                        const Icon =
                          capabilityIcons[cap as keyof typeof capabilityIcons];
                        return (
                          <div
                            key={cap}
                            className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 rounded-lg text-xs border border-slate-700/50"
                          >
                            <Icon className="h-3 w-3 text-slate-400" />
                            <span className="text-slate-300 capitalize">
                              {cap === "functionCalling" ? "Tools" : cap}
                            </span>
                          </div>
                        );
                      })}
                    {getCapabilities().length > 4 && (
                      <div className="text-xs text-slate-500 px-2 py-1">
                        +{getCapabilities().length - 4} more
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm">
                {/* Speed */}
                <div className="flex items-center gap-1">
                  <SpeedIcon className={cn("h-4 w-4", speedColor)} />
                  <span className="text-slate-400 capitalize">
                    {model.performance?.speed || "medium"}
                  </span>
                </div>

                {/* Context */}
                <div className="text-slate-400">
                  <span className="font-medium">
                    {formatTokens(model.contextWindow)}
                  </span>
                  <span className="text-xs ml-1">tokens</span>
                </div>

                {/* Pricing */}
                {model.pricing && (
                  <div className="text-slate-400">
                    <span className="font-medium">
                      {formatPrice(model.pricing.inputCostPer1kTokens)}
                    </span>
                    <span className="text-xs ml-1">/1K</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetDefault(model.id);
                      }}
                      className="border-slate-600 hover:border-emerald-500 text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      Set Default
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConfigure(model);
                    }}
                    className="border-slate-600 hover:border-teal-500 text-slate-300 hover:text-teal-400 hover:bg-teal-500/10"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.05, y: -5 }}
      transition={{ duration: 0.2 }}
      className="relative group"
    >
      {/* Selection glow */}
      {isSelected && (
        <motion.div
          layoutId="selectedGlow"
          className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-xl blur-sm opacity-70"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}

      <Card
        className={cn(
          "relative bg-slate-900/40 backdrop-blur-xl border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 cursor-pointer h-full rounded-xl shadow-lg hover:shadow-xl",
          isSelected &&
            "border-emerald-500/50 bg-slate-900/60 shadow-emerald-500/10",
          isDefault && "ring-2 ring-emerald-500/30"
        )}
        onClick={() => onSelect(model)}
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between mb-3">
            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${model.visualConfig.color
                  .replace("from-", "")
                  .replace("to-", ", ")})`,
              }}
            >
              {model.visualConfig.avatar}
            </div>

            {/* Provider badge */}
            <Badge
              variant="secondary"
              className="bg-slate-800/50 text-slate-300 border-slate-600/50"
            >
              {model.provider}
            </Badge>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-white text-sm leading-tight">
                {model.name}
              </h3>
              {isDefault && (
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              )}
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {model.isRecommended && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                  <Star className="h-2 w-2 mr-1" />
                  Recommended
                </Badge>
              )}
              {model.isNew && (
                <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30 text-xs">
                  New
                </Badge>
              )}
              {isDefault && (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                  Default
                </Badge>
              )}
            </div>

            <p className="text-xs text-slate-400 line-clamp-2 mb-3">
              {model.description}
            </p>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Capabilities */}
          <div className="flex items-center gap-1 flex-wrap mb-4">
            {getCapabilities()
              .slice(0, 3)
              .map((cap) => {
                const Icon =
                  capabilityIcons[cap as keyof typeof capabilityIcons];
                return (
                  <div
                    key={cap}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-800/50 rounded-lg text-xs border border-slate-700/50"
                    title={cap === "functionCalling" ? "Function Calling" : cap}
                  >
                    <Icon className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-300 capitalize">
                      {cap === "functionCalling" ? "Tools" : cap}
                    </span>
                  </div>
                );
              })}
            {getCapabilities().length > 3 && (
              <div className="text-xs text-slate-500 px-1">
                +{getCapabilities().length - 3}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="space-y-2 mb-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Context</span>
              <span className="font-medium text-slate-300">
                {formatTokens(model.contextWindow)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Speed</span>
              <div className="flex items-center gap-1">
                <SpeedIcon className={cn("h-3 w-3", speedColor)} />
                <span className={cn("font-medium capitalize", speedColor)}>
                  {model.performance?.speed || "medium"}
                </span>
              </div>
            </div>

            {model.pricing && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Cost</span>
                <span className="font-medium text-slate-300">
                  {formatPrice(model.pricing.inputCostPer1kTokens)}/1K
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {!isDefault && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetDefault(model.id);
                }}
                className="flex-1 border-slate-600 hover:border-emerald-500 text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 text-xs"
              >
                Set Default
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onConfigure(model);
              }}
              className="border-slate-600 hover:border-teal-500 text-slate-300 hover:text-teal-400 hover:bg-teal-500/10"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
