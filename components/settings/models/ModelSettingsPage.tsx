"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  Brain,
  RefreshCw,
  Filter,
  Grid3X3,
  List,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModelCard } from "./ModelCard";
import { ProviderSection } from "./ProviderSection";
import { ModelDetailPanel } from "./ModelDetailPanel";
import { UsageAnalytics } from "./UsageAnalytics";
import { RecommendationPanel } from "./RecommendationPanel";
import { ModelTester } from "./ModelTester";

interface ModelData {
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
}

export function ModelSettingsPage() {
  const { user } = useUser();
  const [models, setModels] = useState<ModelData[]>([]);
  const [providerStatus, setProviderStatus] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<ModelData | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [preferences, setPreferences] = useState<any>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  // Fetch models and provider status
  useEffect(() => {
    fetchModelsData();
    fetchUserPreferences();
  }, []);

  const fetchModelsData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/models");
      if (!response.ok) throw new Error("Failed to fetch models");

      const data = await response.json();
      if (data.success) {
        setModels(data.data.models || []);
        setProviderStatus(data.data.providerStatus || {});
      }
    } catch (error) {
      console.error("Error fetching models:", error);
      toast.error("Failed to load models");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPreferences = async () => {
    try {
      const response = await fetch("/api/user/preferences");
      if (response.ok) {
        const prefs = await response.json();
        setPreferences(prefs);
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    }
  };

  const updateDefaultModel = async (modelId: string) => {
    try {
      const updatedPrefs = {
        ...preferences,
        ai: {
          ...preferences?.ai,
          defaultModel: modelId,
        },
      };

      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPrefs),
      });

      if (response.ok) {
        setPreferences(updatedPrefs);
        toast.success("Default model updated");
      }
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast.error("Failed to update default model");
    }
  };

  // Filter models based on search and provider
  const filteredModels = models.filter((model) => {
    const matchesSearch =
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider =
      filterProvider === "all" || model.provider === filterProvider;
    return matchesSearch && matchesProvider;
  });

  // Group models by provider
  const modelsByProvider = filteredModels.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, ModelData[]>);

  const providers = Object.keys(providerStatus);

  return (
    <div className="p-6 space-y-8">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative group"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />

        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  className="p-3 bg-emerald-500/20 rounded-xl"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Brain className="h-6 w-6 text-emerald-400" />
                </motion.div>
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    AI Models
                  </CardTitle>
                  <p className="text-slate-400 mt-1">
                    Configure model preferences and capabilities
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-slate-800/40 rounded-xl p-1 border border-slate-700/50">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={
                      viewMode === "grid"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "hover:bg-slate-700/50 text-slate-400 hover:text-white"
                    }
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className={
                      viewMode === "list"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "hover:bg-slate-700/50 text-slate-400 hover:text-white"
                    }
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                {/* Refresh Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchModelsData}
                  disabled={loading}
                  className="border-slate-600 hover:border-emerald-500 text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Search and Filters */}
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/40 border-slate-600 focus:border-emerald-500 focus:ring-emerald-500/20 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={filterProvider}
                  onChange={(e) => setFilterProvider(e.target.value)}
                  className="bg-slate-800/40 border border-slate-600 rounded-xl px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none text-slate-300"
                >
                  <option value="all">All Providers</option>
                  {providers.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Provider Status */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-400 uppercase tracking-wide">
                  Provider Status
                </span>
              </div>
              {providers.map((provider) => {
                const status = providerStatus[provider];
                const isConfigured = status?.configured;

                return (
                  <motion.div
                    key={provider}
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/40 border border-slate-700/50"
                  >
                    {isConfigured ? (
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                    )}
                    <span className="text-sm font-medium text-slate-300">
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-xs bg-slate-700/50 text-slate-300 border-slate-600"
                    >
                      {status?.modelCount || 0}
                    </Badge>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="inline-block"
            >
              <Loader2 className="h-8 w-8 text-emerald-400 mb-4" />
            </motion.div>
            <p className="text-slate-400">Loading models...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Recommendations Panel */}
          <RecommendationPanel
            models={models}
            userPreferences={preferences}
            onModelSelect={setSelectedModel}
          />

          {/* Usage Analytics */}
          <UsageAnalytics models={models} userPreferences={preferences} />

          {/* Models by Provider */}
          {Object.entries(modelsByProvider).map(
            ([provider, providerModels]) => (
              <ProviderSection
                key={provider}
                provider={provider}
                models={providerModels}
                viewMode={viewMode}
                selectedModel={selectedModel}
                defaultModel={preferences?.ai?.defaultModel}
                onModelSelect={setSelectedModel}
                onSetDefault={updateDefaultModel}
                onConfigureModel={(model) => {
                  setSelectedModel(model);
                  setDetailPanelOpen(true);
                }}
              />
            )
          )}

          {filteredModels.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Brain className="h-16 w-16 text-slate-600 mx-auto mb-4" />
              </motion.div>
              <h3 className="text-xl font-semibold text-slate-400 mb-2">
                No models found
              </h3>
              <p className="text-slate-500">
                Try adjusting your search or filter criteria
              </p>
            </motion.div>
          )}
        </div>
      )}

      {/* Model Detail Panel */}
      <AnimatePresence>
        {detailPanelOpen && selectedModel && (
          <ModelDetailPanel
            model={selectedModel}
            preferences={preferences}
            onClose={() => setDetailPanelOpen(false)}
            onSave={fetchUserPreferences}
          />
        )}
      </AnimatePresence>

      {/* Model Tester */}
      <ModelTester
        models={models}
        onTestComplete={(results) => {
          toast.success("Model test completed");
        }}
      />
    </div>
  );
}
