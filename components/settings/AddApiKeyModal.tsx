"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Key,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  CheckCircle,
  XCircle,
  Loader2,
  Brain,
  Sparkles,
  Crown,
  Globe,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AddApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProvider?: string;
}

// Provider configurations
const PROVIDERS = {
  openai: {
    name: "OpenAI",
    icon: Brain,
    color: "from-blue-500 to-cyan-500",
    website: "https://platform.openai.com/api-keys",
    keyFormat: "sk-...",
    description: "Create an API key from your OpenAI platform dashboard",
    steps: [
      "Go to platform.openai.com",
      "Sign in to your account",
      "Navigate to API Keys",
      "Click 'Create new secret key'",
      "Copy the key (you won't see it again)",
    ],
  },
  claude: {
    name: "Anthropic Claude",
    icon: Sparkles,
    color: "from-orange-400 to-red-500",
    website: "https://console.anthropic.com/",
    keyFormat: "sk-ant-...",
    description: "Generate an API key from your Anthropic console",
    steps: [
      "Visit console.anthropic.com",
      "Log in to your account",
      "Go to API Keys section",
      "Generate a new key",
      "Copy your secret key",
    ],
  },
  gemini: {
    name: "Google Gemini",
    icon: Crown,
    color: "from-purple-400 to-pink-500",
    website: "https://makersuite.google.com/app/apikey",
    keyFormat: "AI...",
    description: "Create an API key from Google AI Studio",
    steps: [
      "Open Google AI Studio",
      "Sign in with Google",
      "Navigate to 'Get API Key'",
      "Create API key",
      "Copy the generated key",
    ],
  },
  openrouter: {
    name: "OpenRouter",
    icon: Globe,
    color: "from-green-400 to-emerald-500",
    website: "https://openrouter.ai/keys",
    keyFormat: "sk-or-...",
    description: "Access 100+ models through OpenRouter",
    steps: [
      "Sign up at openrouter.ai",
      "Add credits to your account",
      "Go to Keys section",
      "Generate new API key",
      "Copy your key",
    ],
  },
  groq: {
    name: "Groq",
    icon: Zap,
    color: "from-yellow-400 to-orange-500",
    website: "https://console.groq.com/keys",
    keyFormat: "gsk_...",
    description: "Ultra-fast inference with Groq's hardware",
    steps: [
      "Create account at console.groq.com",
      "Verify your email",
      "Navigate to API Keys",
      "Create new key",
      "Save your API key",
    ],
  },
};

export function AddApiKeyModal({
  isOpen,
  onClose,
  onSuccess,
  initialProvider,
}: AddApiKeyModalProps) {
  const [provider, setProvider] = useState(initialProvider || "");
  const [keyName, setKeyName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const { toast } = useToast();

  const selectedProvider = provider
    ? PROVIDERS[provider as keyof typeof PROVIDERS]
    : null;

  // Reset form when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setProvider(initialProvider || "");
      setKeyName("");
      setApiKey("");
      setShowApiKey(false);
      setTestResult(null);
    }
  }, [isOpen, initialProvider]);

  // Test API key before saving
  const testApiKey = async () => {
    if (!provider || !apiKey) return;

    setIsTestingKey(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/user/api-keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({
          success: data.testResult.success,
          error: data.testResult.success ? undefined : data.testResult.error,
        });
      } else {
        setTestResult({
          success: false,
          error: data.error || "Test failed",
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: "Failed to test API key",
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  // Save API key
  const handleSave = async () => {
    if (!provider || !keyName || !apiKey) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          keyName,
          apiKey,
          metadata: {},
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: data.message || "API key added successfully",
        });
        onSuccess();
        onClose();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add API key",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add API key",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
            <motion.div
              className="p-2 bg-amber-500/20 rounded-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Key className="h-5 w-5 text-amber-400" />
            </motion.div>
            Add API Key
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Add your own API key for direct access to AI providers with better
            control and pricing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider" className="text-white font-medium">
              Provider *
            </Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                <SelectValue placeholder="Select an AI provider" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {Object.entries(PROVIDERS).map(([key, prov]) => {
                  const Icon = prov.icon;
                  return (
                    <SelectItem
                      key={key}
                      value={key}
                      className="text-white hover:bg-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {prov.name}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Provider Info */}
          {selectedProvider && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-slate-800/50 rounded-lg border border-slate-600/50"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <motion.div
                    className={cn(
                      "p-2 rounded-lg bg-gradient-to-br bg-opacity-20",
                      selectedProvider.color
                    )}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <selectedProvider.icon className="h-5 w-5 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="font-semibold text-white">
                      {selectedProvider.name}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {selectedProvider.description}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-400 hover:text-white"
                  onClick={() =>
                    window.open(selectedProvider.website, "_blank")
                  }
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Get Key
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-slate-300">Key format:</span>
                  <Badge
                    variant="outline"
                    className="text-xs border-slate-600 text-slate-400"
                  >
                    {selectedProvider.keyFormat}
                  </Badge>
                </div>

                <div className="text-sm text-slate-400">
                  <p className="font-medium mb-1">How to get your API key:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    {selectedProvider.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </motion.div>
          )}

          {/* Key Name */}
          <div className="space-y-2">
            <Label htmlFor="keyName" className="text-white font-medium">
              Key Name *
            </Label>
            <Input
              id="keyName"
              type="text"
              placeholder="e.g., Main OpenAI Key, Personal Claude Key"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              maxLength={100}
            />
            <p className="text-xs text-slate-500">
              A friendly name to identify this key
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-white font-medium">
              API Key *
            </Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                placeholder={
                  selectedProvider?.keyFormat || "Enter your API key"
                }
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 pr-24"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                {provider && apiKey && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-slate-400 hover:text-white text-xs"
                    onClick={testApiKey}
                    disabled={isTestingKey}
                  >
                    {isTestingKey ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Test"
                    )}
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Your API key is encrypted and stored securely
            </p>

            {/* Test Result */}
            <AnimatePresence>
              {testResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Alert
                    className={cn(
                      "border",
                      testResult.success
                        ? "border-green-500/30 bg-green-500/10"
                        : "border-red-500/30 bg-red-500/10"
                    )}
                  >
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                    <AlertDescription
                      className={
                        testResult.success ? "text-green-100" : "text-red-100"
                      }
                    >
                      {testResult.success
                        ? "API key is valid and working correctly!"
                        : `Test failed: ${testResult.error}`}
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-600 text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !provider || !keyName || !apiKey}
              className={cn(
                "bg-gradient-to-r text-white",
                selectedProvider?.color || "from-amber-500 to-orange-500"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Add API Key
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
