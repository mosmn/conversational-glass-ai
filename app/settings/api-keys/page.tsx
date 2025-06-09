"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import {
  Key,
  Plus,
  Settings,
  Eye,
  EyeOff,
  Trash2,
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Crown,
  Zap,
  Brain,
  Globe,
  Cpu,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AddApiKeyModal } from "@/components/settings/AddApiKeyModal";

// Types
interface ApiKey {
  id: string;
  provider: string;
  keyName: string;
  status: "pending" | "valid" | "invalid" | "quota_exceeded" | "rate_limited";
  quotaInfo: {
    totalLimit?: number;
    used?: number;
    remaining?: number;
    resetDate?: string;
    estimatedCost?: number;
    currency?: string;
  };
  lastValidated: string | null;
  lastError: string | null;
  metadata: {
    priority?: number;
    isDefault?: boolean;
    models?: string[];
  };
  keyPreview: string;
  createdAt: string;
  updatedAt: string;
}

// Provider configurations
const PROVIDERS = {
  openai: {
    name: "OpenAI",
    description: "GPT-4, GPT-3.5 Turbo, and other cutting-edge models",
    icon: Brain,
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-400",
    website: "https://platform.openai.com/api-keys",
    models: ["GPT-4 Turbo", "GPT-3.5 Turbo", "GPT-4 Vision"],
  },
  claude: {
    name: "Anthropic Claude",
    description: "Claude 3.5 Sonnet, Haiku, and other reasoning models",
    icon: Sparkles,
    gradient: "from-orange-500/20 to-red-500/20",
    iconColor: "text-orange-400",
    website: "https://console.anthropic.com/",
    models: ["Claude 3.5 Sonnet", "Claude 3 Haiku", "Claude 3 Opus"],
  },
  gemini: {
    name: "Google Gemini",
    description: "Gemini Pro, Flash, and multimodal AI capabilities",
    icon: Crown,
    gradient: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-400",
    website: "https://makersuite.google.com/app/apikey",
    models: ["Gemini Pro 1.5", "Gemini Flash 1.5", "Gemini Vision"],
  },
  openrouter: {
    name: "OpenRouter",
    description: "Access 100+ models through a single API endpoint",
    icon: Globe,
    gradient: "from-emerald-500/20 to-teal-500/20",
    iconColor: "text-emerald-400",
    website: "https://openrouter.ai/keys",
    models: ["GPT-4", "Claude", "Llama", "Mistral", "Many more..."],
  },
  groq: {
    name: "Groq",
    description: "Ultra-fast inference with Llama and Mixtral models",
    icon: Zap,
    gradient: "from-yellow-500/20 to-orange-500/20",
    iconColor: "text-yellow-400",
    website: "https://console.groq.com/keys",
    models: ["Llama 3.1", "Mixtral 8x7B", "Gemma 2"],
  },
};

// Status configurations
const STATUS_CONFIG = {
  pending: {
    label: "Validating",
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    icon: Clock,
  },
  valid: {
    label: "Active",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: CheckCircle,
  },
  invalid: {
    label: "Invalid",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: XCircle,
  },
  quota_exceeded: {
    label: "Quota Exceeded",
    className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    icon: AlertTriangle,
  },
  rate_limited: {
    label: "Rate Limited",
    className: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    icon: AlertTriangle,
  },
};

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingKeys, setTestingKeys] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const { toast } = useToast();

  // Fetch API keys
  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/user/api-keys");
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.keys || []);
      } else {
        toast({
          title: "Error",
          description: "Failed to load API keys",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load API keys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  // Test API key
  const testApiKey = async (keyId: string) => {
    setTestingKeys((prev) => new Set(prev).add(keyId));

    try {
      const response = await fetch("/api/user/api-keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: data.testResult.success ? "Key Valid" : "Key Invalid",
          description: data.message,
          variant: data.testResult.success ? "default" : "destructive",
        });

        // Refresh keys to get updated status
        await fetchApiKeys();
      } else {
        toast({
          title: "Test Failed",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test API key",
        variant: "destructive",
      });
    } finally {
      setTestingKeys((prev) => {
        const newSet = new Set(prev);
        newSet.delete(keyId);
        return newSet;
      });
    }
  };

  // Delete API key
  const deleteApiKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/user/api-keys/${keyId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "API key deleted successfully",
        });
        await fetchApiKeys();
      } else {
        toast({
          title: "Error",
          description: "Failed to delete API key",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  // Group keys by provider
  const keysByProvider = apiKeys.reduce((acc, key) => {
    if (!acc[key.provider]) acc[key.provider] = [];
    acc[key.provider].push(key);
    return acc;
  }, {} as Record<string, ApiKey[]>);

  const handleAddKey = (provider: string) => {
    setSelectedProvider(provider);
    setShowAddModal(true);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setSelectedProvider("");
    fetchApiKeys(); // Refresh the list
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-2 h-8 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              API Keys
            </h1>
          </div>
          <p className="text-slate-400 text-lg leading-relaxed max-w-3xl">
            Loading your API keys...
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-2xl blur-xl opacity-70" />
              <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
                <CardHeader>
                  <Skeleton className="h-6 w-32 bg-slate-700" />
                  <Skeleton className="h-4 w-48 bg-slate-700" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full bg-slate-700" />
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-8 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            API Keys
          </h1>
        </div>
        <p className="text-slate-400 text-lg leading-relaxed max-w-3xl">
          Bring your own API keys (BYOK) to reduce costs and maintain control
          over your AI model usage. Add keys from multiple providers to unlock
          advanced features and personalized experiences.
        </p>
      </motion.div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(PROVIDERS).map(([providerKey, provider], index) => {
          const providerKeys = keysByProvider[providerKey] || [];
          const hasKeys = providerKeys.length > 0;

          return (
            <motion.div
              key={providerKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative group"
            >
              {/* Glow effect */}
              <div
                className={cn(
                  "absolute inset-0 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500",
                  `bg-gradient-to-r ${provider.gradient}`
                )}
              />

              <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 hover:border-emerald-500/30 h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className={cn(
                          "p-2 rounded-xl bg-gradient-to-r",
                          provider.gradient
                        )}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 10,
                        }}
                      >
                        <provider.icon
                          className={cn("h-5 w-5", provider.iconColor)}
                        />
                      </motion.div>
                      <div>
                        <h3 className="text-white font-semibold">
                          {provider.name}
                        </h3>
                        {hasKeys && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          >
                            {providerKeys.length} key
                            {providerKeys.length !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <motion.a
                      href={provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </motion.a>
                  </CardTitle>
                  <CardDescription className="text-slate-400 leading-relaxed">
                    {provider.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Models */}
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">
                      Available Models
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {provider.models.slice(0, 3).map((model) => (
                        <Badge
                          key={model}
                          variant="secondary"
                          className="text-xs bg-slate-800/60 text-slate-300 border-slate-600/50"
                        >
                          {model}
                        </Badge>
                      ))}
                      {provider.models.length > 3 && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-slate-800/60 text-slate-300 border-slate-600/50"
                        >
                          +{provider.models.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* API Keys */}
                  {hasKeys ? (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Your Keys
                      </p>
                      {providerKeys.map((key) => {
                        const statusConfig = STATUS_CONFIG[key.status];
                        const StatusIcon = statusConfig.icon;
                        const isBeingTested = testingKeys.has(key.id);

                        return (
                          <motion.div
                            key={key.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-3 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={cn(
                                    "text-xs",
                                    statusConfig.className
                                  )}
                                >
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusConfig.label}
                                </Badge>
                                <span className="text-sm font-medium text-slate-300">
                                  {key.keyName}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => testApiKey(key.id)}
                                    disabled={isBeingTested}
                                    className="text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 h-7 w-7 p-0"
                                  >
                                    {isBeingTested ? (
                                      <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{
                                          duration: 1,
                                          repeat: Infinity,
                                          ease: "linear",
                                        }}
                                      >
                                        <TestTube className="h-3 w-3" />
                                      </motion.div>
                                    ) : (
                                      <TestTube className="h-3 w-3" />
                                    )}
                                  </Button>
                                </motion.div>
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteApiKey(key.id)}
                                    className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 h-7 w-7 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </motion.div>
                              </div>
                            </div>
                            <div className="text-xs text-slate-500 font-mono">
                              {key.keyPreview}
                            </div>
                            {key.lastError && (
                              <div className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
                                {key.lastError}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <motion.div
                        className="p-3 bg-slate-800/30 rounded-xl mb-3 mx-auto w-fit"
                        whileHover={{ scale: 1.05 }}
                      >
                        <Key className="h-6 w-6 text-slate-500" />
                      </motion.div>
                      <p className="text-sm text-slate-500 mb-4">
                        No API keys configured yet
                      </p>
                    </div>
                  )}

                  {/* Add Key Button */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      onClick={() => handleAddKey(providerKey)}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 rounded-xl h-10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add {provider.name} Key
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {apiKeys.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-2xl blur-xl opacity-70" />
          <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl text-center p-12">
            <motion.div
              className="p-4 bg-emerald-500/20 rounded-2xl mx-auto w-fit mb-6"
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Key className="h-12 w-12 text-emerald-400" />
            </motion.div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Welcome to BYOK
            </h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Get started by adding your first API key. Choose from OpenAI,
              Claude, Gemini, OpenRouter, or Groq to unlock powerful AI
              capabilities.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {Object.entries(PROVIDERS).map(([providerKey, provider]) => (
                <motion.div
                  key={providerKey}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddKey(providerKey)}
                    className="border-slate-600 hover:border-emerald-500 hover:bg-emerald-500/10"
                  >
                    <provider.icon
                      className={cn("h-4 w-4 mr-2", provider.iconColor)}
                    />
                    {provider.name}
                  </Button>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Add API Key Modal */}
      <AddApiKeyModal
        isOpen={showAddModal}
        onClose={handleModalClose}
        onSuccess={handleModalClose}
        initialProvider={selectedProvider}
      />
    </div>
  );
}
