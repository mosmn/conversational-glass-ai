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
    color: "from-blue-500 to-cyan-500",
    website: "https://platform.openai.com/api-keys",
    models: ["GPT-4 Turbo", "GPT-3.5 Turbo", "GPT-4 Vision"],
  },
  claude: {
    name: "Anthropic Claude",
    description: "Claude 3.5 Sonnet, Haiku, and other reasoning models",
    icon: Sparkles,
    color: "from-orange-400 to-red-500",
    website: "https://console.anthropic.com/",
    models: ["Claude 3.5 Sonnet", "Claude 3 Haiku", "Claude 3 Opus"],
  },
  gemini: {
    name: "Google Gemini",
    description: "Gemini Pro, Flash, and multimodal AI capabilities",
    icon: Crown,
    color: "from-purple-400 to-pink-500",
    website: "https://makersuite.google.com/app/apikey",
    models: ["Gemini Pro 1.5", "Gemini Flash 1.5", "Gemini Vision"],
  },
  openrouter: {
    name: "OpenRouter",
    description: "Access 100+ models through a single API endpoint",
    icon: Globe,
    color: "from-green-400 to-emerald-500",
    website: "https://openrouter.ai/keys",
    models: ["GPT-4", "Claude", "Llama", "Mistral", "Many more..."],
  },
  groq: {
    name: "Groq",
    description: "Ultra-fast inference with Llama and Mixtral models",
    icon: Zap,
    color: "from-yellow-400 to-orange-500",
    website: "https://console.groq.com/keys",
    models: ["Llama 3.1", "Mixtral 8x7B", "Gemma 2"],
  },
};

// Status configurations
const STATUS_CONFIG = {
  pending: {
    label: "Validating",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    icon: Clock,
  },
  valid: {
    label: "Active",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: CheckCircle,
  },
  invalid: {
    label: "Invalid",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: XCircle,
  },
  quota_exceeded: {
    label: "Quota Exceeded",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    icon: AlertTriangle,
  },
  rate_limited: {
    label: "Rate Limited",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
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
        title: "Test Failed",
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
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "Failed to delete API key",
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
    if (!acc[key.provider]) {
      acc[key.provider] = [];
    }
    acc[key.provider].push(key);
    return acc;
  }, {} as Record<string, ApiKey[]>);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-4">
          <motion.div
            className="p-3 bg-amber-500/20 rounded-xl"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Key className="h-6 w-6 text-amber-400" />
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              API Keys
            </h1>
            <p className="text-slate-400 text-lg">
              Bring your own keys for maximum control and cost efficiency
            </p>
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <Key className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-amber-100">
            <strong>BYOK (Bring Your Own Keys):</strong> Use your own API keys
            for direct access to AI providers. Your keys are encrypted and
            stored securely.{" "}
            <a
              href="#"
              className="text-amber-400 hover:text-amber-300 underline"
            >
              Learn more about security
            </a>
          </AlertDescription>
        </Alert>
      </motion.div>

      {/* Provider Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(PROVIDERS).map(([providerId, provider], index) => {
          const Icon = provider.icon;
          const providerKeys = keysByProvider[providerId] || [];
          const hasKeys = providerKeys.length > 0;
          const validKeys = providerKeys.filter(
            (key) => key.status === "valid"
          ).length;

          return (
            <motion.div
              key={providerId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="relative group h-full bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300">
                {/* Glow effect */}
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-20 rounded-xl blur-xl transition-opacity duration-300",
                    provider.color
                  )}
                />

                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className={cn(
                          "p-2 rounded-lg bg-gradient-to-br",
                          provider.color,
                          "bg-opacity-20"
                        )}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 10,
                        }}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </motion.div>
                      <div>
                        <CardTitle className="text-white">
                          {provider.name}
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-sm">
                          {provider.description}
                        </CardDescription>
                      </div>
                    </div>

                    {hasKeys && (
                      <Badge
                        variant="secondary"
                        className="bg-slate-700/50 text-slate-300"
                      >
                        {validKeys}/{providerKeys.length}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="relative space-y-4">
                  {/* Models */}
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-2">
                      Popular Models
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {provider.models.slice(0, 3).map((model, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs border-slate-600 text-slate-400"
                        >
                          {model}
                        </Badge>
                      ))}
                      {provider.models.length > 3 && (
                        <Badge
                          variant="outline"
                          className="text-xs border-slate-600 text-slate-400"
                        >
                          +{provider.models.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Keys */}
                  {hasKeys ? (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-slate-300">
                        Your Keys
                      </h4>
                      {providerKeys.map((key) => {
                        const StatusIcon = STATUS_CONFIG[key.status].icon;
                        const isTesting = testingKeys.has(key.id);

                        return (
                          <motion.div
                            key={key.id}
                            layout
                            className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/30"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <StatusIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-white truncate">
                                    {key.keyName}
                                  </span>
                                  {key.metadata.isDefault && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      Default
                                    </Badge>
                                  )}
                                </div>
                                <Badge
                                  className={cn(
                                    "text-xs mt-1",
                                    STATUS_CONFIG[key.status].color
                                  )}
                                >
                                  {STATUS_CONFIG[key.status].label}
                                </Badge>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => testApiKey(key.id)}
                                disabled={isTesting}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                              >
                                {isTesting ? (
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{
                                      duration: 1,
                                      repeat: Infinity,
                                      ease: "linear",
                                    }}
                                  >
                                    <TestTube className="h-4 w-4" />
                                  </motion.div>
                                ) : (
                                  <TestTube className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteApiKey(key.id)}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-slate-400 text-sm mb-3">
                        No API keys configured
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      className={cn(
                        "flex-1 bg-gradient-to-r text-white border-0",
                        provider.color
                      )}
                      onClick={() => {
                        setSelectedProvider(providerId);
                        setShowAddModal(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Key
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-400 hover:text-white"
                      onClick={() => window.open(provider.website, "_blank")}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {apiKeys.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center py-12"
        >
          <motion.div
            className="inline-flex p-4 bg-slate-800/40 rounded-full mb-4"
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Key className="h-8 w-8 text-slate-400" />
          </motion.div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No API Keys Yet
          </h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Add your first API key to start using your own provider accounts for
            better control and pricing.
          </p>
          <Button
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
            onClick={() => {
              setSelectedProvider("");
              setShowAddModal(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Key
          </Button>
        </motion.div>
      )}

      {/* Add API Key Modal */}
      <AddApiKeyModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          fetchApiKeys();
          setShowAddModal(false);
        }}
        initialProvider={selectedProvider}
      />
    </div>
  );
}
