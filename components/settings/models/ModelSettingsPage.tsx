"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  Brain,
  Search,
  Filter,
  Settings,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  Star,
  Crown,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getProviderIcon,
  getProviderColor,
  getProviderDisplayName,
} from "@/lib/utils/provider-icons";
import { cn } from "@/lib/utils";

interface ModelData {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  contextWindow: number;
  description: string;
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
  isEnabled?: boolean; // User's preference
}

interface ProviderData {
  id: string;
  name: string;
  isEnabled: boolean;
  modelCount: number;
  enabledModelCount: number;
}

export function ModelSettingsPage() {
  const { user } = useUser();
  const [models, setModels] = useState<ModelData[]>([]);
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all"); // all, enabled, disabled
  const [sortBy, setSortBy] = useState<string>("name"); // name, provider, speed, enabled
  const [defaultModel, setDefaultModel] = useState<string>("");

  // Fetch models and user preferences
  useEffect(() => {
    fetchModelsData();
  }, []);

  const fetchModelsData = async () => {
    try {
      setLoading(true);
      const [modelsResponse, preferencesResponse] = await Promise.all([
        fetch("/api/models"),
        fetch("/api/user/preferences"),
      ]);

      if (modelsResponse.ok) {
        const modelsData = await modelsResponse.json();
        // The API returns models directly, not wrapped in success/data
        const allModels = modelsData.models || [];

        // Get user preferences for enabled models
        let enabledModels = new Set<string>();
        let userDefaultModel = "";

        if (preferencesResponse.ok) {
          const prefs = await preferencesResponse.json();
          enabledModels = new Set(prefs.ai?.enabledModels || []);
          userDefaultModel = prefs.ai?.defaultModel || "";

          // If no models are enabled yet, enable recommended ones by default
          if (enabledModels.size === 0) {
            allModels.forEach((model: ModelData) => {
              if (model.isRecommended) {
                enabledModels.add(model.id);
              }
            });
          }
        }

        // Add enabled status to models
        const modelsWithStatus = allModels.map((model: ModelData) => ({
          ...model,
          isEnabled: enabledModels.has(model.id),
        }));

        setModels(modelsWithStatus);
        setDefaultModel(userDefaultModel);

        // Create provider summary
        const providerMap = new Map<string, ProviderData>();
        modelsWithStatus.forEach((model: ModelData) => {
          if (!providerMap.has(model.provider)) {
            providerMap.set(model.provider, {
              id: model.provider,
              name: getProviderDisplayName(model.provider),
              isEnabled: false,
              modelCount: 0,
              enabledModelCount: 0,
            });
          }
          const provider = providerMap.get(model.provider)!;
          provider.modelCount++;
          if (model.isEnabled) {
            provider.enabledModelCount++;
          }
          provider.isEnabled = provider.enabledModelCount > 0;
        });

        setProviders(Array.from(providerMap.values()));
      }
    } catch (error) {
      console.error("Error fetching models:", error);
      toast.error("Failed to load models");
    } finally {
      setLoading(false);
    }
  };

  const updateModelEnabled = async (modelId: string, enabled: boolean) => {
    try {
      const updatedModels = models.map((model) =>
        model.id === modelId ? { ...model, isEnabled: enabled } : model
      );
      setModels(updatedModels);

      const enabledModelIds = updatedModels
        .filter((model) => model.isEnabled)
        .map((model) => model.id);

      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai: {
            enabledModels: enabledModelIds,
            defaultModel: enabled && !defaultModel ? modelId : defaultModel,
          },
        }),
      });

      if (response.ok) {
        toast.success(`${enabled ? "Enabled" : "Disabled"} model`);
        // If we disabled the default model, clear it
        if (!enabled && modelId === defaultModel) {
          setDefaultModel("");
        }
        // Refresh provider status
        fetchModelsData();
      } else {
        throw new Error("Failed to update preferences");
      }
    } catch (error) {
      console.error("Error updating model:", error);
      toast.error("Failed to update model");
      // Revert the change
      setModels(models);
    }
  };

  const toggleProviderEnabled = async (
    providerId: string,
    enabled: boolean
  ) => {
    try {
      const providerModels = models.filter(
        (model) => model.provider === providerId
      );
      const updatedModels = models.map((model) =>
        model.provider === providerId ? { ...model, isEnabled: enabled } : model
      );
      setModels(updatedModels);

      const enabledModelIds = updatedModels
        .filter((model) => model.isEnabled)
        .map((model) => model.id);

      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai: {
            enabledModels: enabledModelIds,
            defaultModel: defaultModel,
          },
        }),
      });

      if (response.ok) {
        toast.success(
          `${enabled ? "Enabled" : "Disabled"} ${getProviderDisplayName(
            providerId
          )} models`
        );
        fetchModelsData();
      } else {
        throw new Error("Failed to update preferences");
      }
    } catch (error) {
      console.error("Error updating provider:", error);
      toast.error("Failed to update provider");
      setModels(models);
    }
  };

  const setAsDefault = async (modelId: string) => {
    try {
      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai: {
            enabledModels: models.filter((m) => m.isEnabled).map((m) => m.id),
            defaultModel: modelId,
          },
        }),
      });

      if (response.ok) {
        setDefaultModel(modelId);
        toast.success("Default model updated");
      }
    } catch (error) {
      console.error("Error setting default:", error);
      toast.error("Failed to set default model");
    }
  };

  // Filter and sort models
  const filteredModels = models
    .filter((model) => {
      const matchesSearch =
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getProviderDisplayName(model.provider)
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesProvider =
        filterProvider === "all" || model.provider === filterProvider;

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "enabled" && model.isEnabled) ||
        (filterStatus === "disabled" && !model.isEnabled);

      return matchesSearch && matchesProvider && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "provider":
          return a.provider.localeCompare(b.provider);
        case "speed":
          const speedOrder = { fast: 0, medium: 1, slow: 2 };
          return (
            (speedOrder[a.performance?.speed || "medium"] || 1) -
            (speedOrder[b.performance?.speed || "medium"] || 1)
          );
        case "enabled":
          return Number(b.isEnabled) - Number(a.isEnabled);
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const enabledCount = models.filter((m) => m.isEnabled).length;
  const totalCount = models.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
          <p className="text-slate-300">Loading models...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />

        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  className="p-3 bg-emerald-500/20 rounded-xl"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <Brain className="h-6 w-6 text-emerald-400" />
                </motion.div>
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    Model Library
                  </CardTitle>
                  <p className="text-slate-400 mt-1">
                    Curate your perfect AI model collection
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {enabledCount}
                  </div>
                  <div className="text-xs text-slate-400">
                    of {totalCount} enabled
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchModelsData}
                  className="border-slate-600 hover:border-emerald-500"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Provider Quick Toggles */}
      <Card className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-emerald-400" />
            Provider Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {providers.map((provider) => {
              const ProviderIcon = getProviderIcon(provider.id);
              const providerColor = getProviderColor(provider.id);

              return (
                <div
                  key={provider.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
                    provider.isEnabled
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-slate-800/30 border-slate-700/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <ProviderIcon
                      className="h-5 w-5"
                      size={20}
                      style={{ color: providerColor }}
                    />
                    <div>
                      <div className="font-medium text-white text-sm">
                        {provider.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {provider.enabledModelCount}/{provider.modelCount}{" "}
                        models
                      </div>
                    </div>
                  </div>
                  <Switch
                    checked={provider.isEnabled}
                    onCheckedChange={(enabled) =>
                      toggleProviderEnabled(provider.id, enabled)
                    }
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search models by name, description, or provider..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Select value={filterProvider} onValueChange={setFilterProvider}>
                <SelectTrigger className="w-40 bg-slate-800/50 border-slate-600">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32 bg-slate-800/50 border-slate-600">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32 bg-slate-800/50 border-slate-600">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="provider">Provider</SelectItem>
                  <SelectItem value="speed">Speed</SelectItem>
                  <SelectItem value="enabled">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Models List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredModels.map((model) => {
            const ModelIcon = getProviderIcon(model.provider);
            const providerColor = getProviderColor(model.provider);
            const isDefault = model.id === defaultModel;

            return (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="relative group"
              >
                {/* Glow for enabled models */}
                {model.isEnabled && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-teal-600/10 rounded-xl blur-sm opacity-70" />
                )}

                <Card
                  className={cn(
                    "relative transition-all duration-200 hover:scale-[1.01]",
                    model.isEnabled
                      ? "bg-slate-900/40 border-emerald-500/30 shadow-emerald-500/5"
                      : "bg-slate-900/20 border-slate-700/50",
                    isDefault && "ring-2 ring-amber-500/50"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Model Icon & Info */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-700/30">
                            <ModelIcon
                              className="h-5 w-5"
                              size={20}
                              style={{ color: providerColor }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-white truncate">
                                {model.name}
                              </h3>
                              {isDefault && (
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Default
                                </Badge>
                              )}
                              {model.isRecommended && (
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  Recommended
                                </Badge>
                              )}
                              {model.isNew && (
                                <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30 text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-400 truncate max-w-md">
                              {model.description}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                              <span>
                                {getProviderDisplayName(model.provider)}
                              </span>
                              <span>
                                Speed: {model.performance?.speed || "medium"}
                              </span>
                              {model.capabilities.multiModal && (
                                <span>Multi-modal</span>
                              )}
                              {model.capabilities.vision && <span>Vision</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {model.isEnabled && !isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAsDefault(model.id)}
                            className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                          >
                            <Crown className="h-4 w-4 mr-1" />
                            Set Default
                          </Button>
                        )}

                        <div className="flex items-center gap-2">
                          {model.isEnabled ? (
                            <Eye className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-slate-500" />
                          )}
                          <Switch
                            checked={model.isEnabled}
                            onCheckedChange={(enabled) =>
                              updateModelEnabled(model.id, enabled)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredModels.length === 0 && (
        <Card className="bg-slate-900/20 border-slate-700/50">
          <CardContent className="p-12 text-center">
            <Search className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              No models found
            </h3>
            <p className="text-slate-500">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
