"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Settings,
  Zap,
  Brain,
  Sparkles,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ModelCard } from "./ModelCard";
import { cn } from "@/lib/utils";
import {
  getProviderIcon,
  getProviderColor,
  getProviderDisplayName,
} from "@/lib/utils/provider-icons";

interface ProviderSectionProps {
  provider: string;
  models: any[];
  viewMode: "grid" | "list";
  selectedModel: any;
  defaultModel?: string;
  onModelSelect: (model: any) => void;
  onSetDefault: (modelId: string) => void;
  onConfigureModel: (model: any) => void;
}

const getProviderConfig = (provider: string) => {
  const providerColor = getProviderColor(provider);
  const baseConfigs = {
    openai: {
      name: getProviderDisplayName(provider),
      description: "Industry-leading language models",
      website: "https://openai.com",
      features: ["GPT-4", "Function Calling", "Reliable", "Well-documented"],
    },
    claude: {
      name: getProviderDisplayName(provider),
      description: "Constitutional AI with strong reasoning",
      website: "https://anthropic.com",
      features: ["Constitutional AI", "Long Context", "Safe", "Thoughtful"],
    },
    anthropic: {
      name: getProviderDisplayName(provider),
      description: "Constitutional AI with strong reasoning",
      website: "https://anthropic.com",
      features: ["Constitutional AI", "Long Context", "Safe", "Thoughtful"],
    },
    gemini: {
      name: getProviderDisplayName(provider),
      description: "Advanced multimodal capabilities",
      website: "https://ai.google.dev",
      features: ["Multimodal", "Fast", "Versatile", "Scalable"],
    },
    google: {
      name: getProviderDisplayName(provider),
      description: "Advanced multimodal capabilities",
      website: "https://ai.google.dev",
      features: ["Multimodal", "Fast", "Versatile", "Scalable"],
    },
    groq: {
      name: getProviderDisplayName(provider),
      description: "Lightning-fast inference speed",
      website: "https://groq.com",
      features: ["Ultra-fast", "Low Latency", "Efficient", "Open Models"],
    },
    openrouter: {
      name: getProviderDisplayName(provider),
      description: "Access to multiple AI models",
      website: "https://openrouter.ai",
      features: ["Multiple Models", "Competitive Pricing", "Unified API"],
    },
  };

  return (
    baseConfigs[provider.toLowerCase() as keyof typeof baseConfigs] || {
      name: getProviderDisplayName(provider),
      description: "AI language models",
      website: "#",
      features: [],
    }
  );
};

export function ProviderSection({
  provider,
  models,
  viewMode,
  selectedModel,
  defaultModel,
  onModelSelect,
  onSetDefault,
  onConfigureModel,
}: ProviderSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const config = getProviderConfig(provider);
  const ProviderIcon = getProviderIcon(provider);
  const providerColor = getProviderColor(provider);

  // Sort models by recommendation and name
  const sortedModels = [...models].sort((a, b) => {
    if (a.isRecommended && !b.isRecommended) return -1;
    if (!a.isRecommended && b.isRecommended) return 1;
    if (a.id === defaultModel) return -1;
    if (b.id === defaultModel) return 1;
    return a.name.localeCompare(b.name);
  });

  const defaultModelInProvider = models.find((m) => m.id === defaultModel);
  const recommendedModels = models.filter((m) => m.isRecommended);
  const newModels = models.filter((m) => m.isNew);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Provider Header */}
      <motion.div
        className="relative group"
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-2xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `linear-gradient(to right, ${providerColor}20, ${providerColor}20)`,
          }}
        />

        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Provider Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border border-slate-600/30"
                  style={{
                    backgroundColor: `${providerColor}20`,
                    borderColor: `${providerColor}40`,
                  }}
                >
                  <ProviderIcon
                    className="h-6 w-6"
                    size={24}
                    style={{ color: providerColor }}
                  />
                </div>

                {/* Provider Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-white">
                      {config.name}
                    </h2>
                    <Badge
                      variant="secondary"
                      className="bg-slate-800/50 text-slate-300 border-slate-600/50"
                    >
                      {models.length} model{models.length !== 1 ? "s" : ""}
                    </Badge>
                    {defaultModelInProvider && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Default Provider
                      </Badge>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm mb-3">
                    {config.description}
                  </p>

                  {/* Features */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {config.features.map((feature) => (
                      <Badge
                        key={feature}
                        variant="outline"
                        className="border-slate-600/50 text-slate-300 text-xs bg-slate-800/30"
                      >
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4">
                {/* Stats */}
                <div className="text-right text-sm space-y-1">
                  {recommendedModels.length > 0 && (
                    <div className="text-amber-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      {recommendedModels.length} recommended
                    </div>
                  )}
                  {newModels.length > 0 && (
                    <div className="text-teal-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                      {newModels.length} new
                    </div>
                  )}
                  {defaultModelInProvider && (
                    <div className="text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      Default: {defaultModelInProvider.name}
                    </div>
                  )}
                </div>

                {/* External Link */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(config.website, "_blank")}
                  className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>

                {/* Expand/Collapse */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Models Grid/List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sortedModels.map((model, index) => (
                  <motion.div
                    key={`${provider}:${model.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <ModelCard
                      model={model}
                      isSelected={selectedModel?.id === model.id}
                      isDefault={model.id === defaultModel}
                      viewMode={viewMode}
                      onSelect={onModelSelect}
                      onSetDefault={onSetDefault}
                      onConfigure={onConfigureModel}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedModels.map((model, index) => (
                  <motion.div
                    key={`${provider}:${model.id}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <ModelCard
                      model={model}
                      isSelected={selectedModel?.id === model.id}
                      isDefault={model.id === defaultModel}
                      viewMode={viewMode}
                      onSelect={onModelSelect}
                      onSetDefault={onSetDefault}
                      onConfigure={onConfigureModel}
                    />
                  </motion.div>
                ))}
              </div>
            )}

            {models.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <AlertCircle className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                </motion.div>
                <h3 className="text-lg font-semibold text-slate-400 mb-2">
                  No models available
                </h3>
                <p className="text-slate-500 text-sm">
                  Check your API configuration for this provider
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
