"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Skeleton } from "../../../components/ui/skeleton";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { useToast } from "../../../components/ui/use-toast";
import { Input } from "../../../components/ui/input";
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
  Shield,
  ShieldCheck,
  RotateCcw,
  Download,
  Upload,
  Activity,
  Timer,
  TrendingUp,
  Info,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { AddApiKeyModal } from "../../../components/settings/AddApiKeyModal";

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
  auditFingerprint?: string;
}

interface SecurityAudit {
  timestamp: string;
  securityScore: number;
  securityLevel: "critical" | "warning" | "good" | "excellent";
  encryption: {
    isSecure: boolean;
    score: number;
    warnings: string[];
    recommendations: string[];
    critical: string[];
  };
  keyMetrics: {
    totalKeys: number;
    validKeys: number;
    invalidKeys: number;
    pendingKeys: number;
    providers: string[];
    oldestKey: number | null;
    newestKey: number | null;
    lastValidation: number | null;
  };
  rateLimitStatus: {
    [key: string]: {
      remaining: number;
      resetTime: number;
      isBlocked: boolean;
      blockReason?: string;
    };
  };
  recommendations: string[];
  warnings: string[];
  critical: string[];
  summary: {
    totalIssues: number;
    criticalIssues: number;
    isSecure: boolean;
    needsAttention: boolean;
  };
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
  const [securityAudit, setSecurityAudit] = useState<SecurityAudit | null>(
    null
  );
  const [auditLoading, setAuditLoading] = useState(false);
  const [showSecurityPanel, setShowSecurityPanel] = useState(false);
  const [rotationLoading, setRotationLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showRotationModal, setShowRotationModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
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
    fetchSecurityAudit(); // Load security audit on page load
  }, []);

  // Fetch security audit
  const fetchSecurityAudit = async () => {
    if (auditLoading) return;

    setAuditLoading(true);
    try {
      const response = await fetch("/api/user/security/audit");
      if (response.ok) {
        const data = await response.json();
        setSecurityAudit(data.audit);
      } else {
        console.error("Failed to load security audit");
      }
    } catch (error) {
      console.error("Error fetching security audit:", error);
    } finally {
      setAuditLoading(false);
    }
  };

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

        // Refresh keys and security audit to get updated status
        await fetchApiKeys();
        await fetchSecurityAudit();
      } else {
        // Handle rate limiting specifically
        if (response.status === 429) {
          toast({
            title: "Rate Limited",
            description:
              data.error +
              (data.resetTime
                ? ` Try again at ${new Date(
                    data.resetTime
                  ).toLocaleTimeString()}`
                : ""),
            variant: "destructive",
          });
        } else {
          toast({
            title: "Test Failed",
            description: data.error,
            variant: "destructive",
          });
        }
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
    fetchSecurityAudit(); // Refresh security audit
  };

  // Helper function for security level styling
  const getSecurityLevelConfig = (level: string) => {
    switch (level) {
      case "excellent":
        return {
          color: "text-emerald-400",
          bg: "bg-emerald-500/20",
          border: "border-emerald-500/30",
          icon: ShieldCheck,
        };
      case "good":
        return {
          color: "text-blue-400",
          bg: "bg-blue-500/20",
          border: "border-blue-500/30",
          icon: Shield,
        };
      case "warning":
        return {
          color: "text-yellow-400",
          bg: "bg-yellow-500/20",
          border: "border-yellow-500/30",
          icon: AlertTriangle,
        };
      case "critical":
        return {
          color: "text-red-400",
          bg: "bg-red-500/20",
          border: "border-red-500/30",
          icon: XCircle,
        };
      default:
        return {
          color: "text-slate-400",
          bg: "bg-slate-500/20",
          border: "border-slate-500/30",
          icon: Shield,
        };
    }
  };

  // Validate all pending API keys
  const validateAllPendingKeys = async () => {
    try {
      const response = await fetch("/api/user/api-keys/validate-all", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Validation Complete",
          description: data.message,
        });
        await fetchApiKeys(); // Refresh the list
      } else {
        toast({
          title: "Validation Failed",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate API keys",
        variant: "destructive",
      });
    }
  };

  // Check if there are any pending keys
  const hasPendingKeys = apiKeys.some((key) => key.status === "pending");

  // Rotate all encryption keys
  const rotateKeys = async () => {
    setRotationLoading(true);
    try {
      const response = await fetch("/api/user/api-keys/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmRotation: true }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Keys Rotated Successfully",
          description: `Rotated ${data.rotatedCount} API keys with new encryption.`,
        });
        await fetchApiKeys();
        await fetchSecurityAudit();
        setShowRotationModal(false);
      } else {
        throw new Error(data.error || "Rotation failed");
      }
    } catch (error: any) {
      toast({
        title: "Rotation Failed",
        description: error.message || "Failed to rotate encryption keys",
        variant: "destructive",
      });
    } finally {
      setRotationLoading(false);
    }
  };

  // Export encrypted keys
  const exportKeys = async () => {
    if (!exportPassword || exportPassword.length < 12) {
      toast({
        title: "Invalid Password",
        description: "Export password must be at least 12 characters",
        variant: "destructive",
      });
      return;
    }

    setExportLoading(true);
    try {
      const response = await fetch("/api/user/api-keys/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exportPassword,
          confirmExport: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Create download
        const blob = new Blob([data.exportPackage], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `convo-glass-keys-backup-${new Date()
          .toISOString()
          .slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Export Successful",
          description: `Exported ${data.exportedCount} encrypted API keys`,
        });

        setShowExportModal(false);
        setExportPassword("");
        await fetchSecurityAudit();
      } else {
        throw new Error(data.error || "Export failed");
      }
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export API keys",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 p-4 sm:p-6">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 mb-3">
            <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              API Keys
            </h1>
          </div>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-3xl">
            Loading your API keys...
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
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
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 p-4 sm:p-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 sm:mb-8"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              API Keys
            </h1>
            {securityAudit && (
              <div className="flex items-center gap-2">
                <Badge
                  className={cn(
                    "text-xs",
                    getSecurityLevelConfig(securityAudit.securityLevel).bg,
                    getSecurityLevelConfig(securityAudit.securityLevel).color,
                    getSecurityLevelConfig(securityAudit.securityLevel).border
                  )}
                >
                  <Shield className="h-3 w-3 mr-1" />
                  Score: {securityAudit.securityScore}/100
                </Badge>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasPendingKeys && (
              <Button
                onClick={validateAllPendingKeys}
                className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30"
                variant="outline"
                size="sm"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Validate Pending Keys
              </Button>
            )}
            <Button
              onClick={() => setShowSecurityPanel(!showSecurityPanel)}
              className="bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30"
              variant="outline"
              size="sm"
            >
              <Shield className="h-4 w-4 mr-2" />
              Security Dashboard
            </Button>
            <Button
              onClick={() => setShowExportModal(true)}
              className="bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30"
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={() => setShowRotationModal(true)}
              className="bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30"
              variant="outline"
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Rotate Keys
            </Button>
          </div>
        </div>
        <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-3xl">
          Bring your own API keys (BYOK) to reduce costs and maintain control
          over your AI model usage. Add keys from multiple providers to unlock
          advanced features and personalized experiences.
        </p>
        {hasPendingKeys && (
          <Alert className="mt-4 bg-yellow-500/10 border-yellow-500/30">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-200">
              Some of your API keys are still being validated. Click "Validate
              Pending Keys" above to check them now.
            </AlertDescription>
          </Alert>
        )}
      </motion.div>

      {/* Security Dashboard Panel */}
      <AnimatePresence>
        {showSecurityPanel && securityAudit && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl blur-xl opacity-70" />
              <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="p-2 rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        <Shield className="h-5 w-5 text-blue-400" />
                      </motion.div>
                      <div>
                        <h3 className="text-white font-semibold">
                          Security Dashboard
                        </h3>
                        <p className="text-sm text-slate-400">
                          Real-time security analysis
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={fetchSecurityAudit}
                      variant="ghost"
                      size="sm"
                      disabled={auditLoading}
                      className="text-slate-400 hover:text-blue-400"
                    >
                      {auditLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <Activity className="h-4 w-4" />
                        </motion.div>
                      ) : (
                        <Activity className="h-4 w-4" />
                      )}
                      Refresh
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Security Score and Level */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-800/40 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">
                          Security Score
                        </span>
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {securityAudit.securityScore}/100
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${securityAudit.securityScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-slate-800/40 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">
                          Security Level
                        </span>
                        {React.createElement(
                          getSecurityLevelConfig(securityAudit.securityLevel)
                            .icon,
                          {
                            className: `h-4 w-4 ${
                              getSecurityLevelConfig(
                                securityAudit.securityLevel
                              ).color
                            }`,
                          }
                        )}
                      </div>
                      <div
                        className={cn(
                          "text-2xl font-bold capitalize",
                          getSecurityLevelConfig(securityAudit.securityLevel)
                            .color
                        )}
                      >
                        {securityAudit.securityLevel}
                      </div>
                      <div className="text-xs text-slate-500">
                        {securityAudit.summary.criticalIssues > 0
                          ? `${securityAudit.summary.criticalIssues} critical issues`
                          : "No critical issues"}
                      </div>
                    </div>

                    <div className="bg-slate-800/40 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">
                          Key Status
                        </span>
                        <Key className="h-4 w-4 text-blue-400" />
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {securityAudit.keyMetrics.validKeys}/
                        {securityAudit.keyMetrics.totalKeys}
                      </div>
                      <div className="text-xs text-slate-500">
                        Valid keys active
                      </div>
                    </div>
                  </div>

                  {/* Rate Limiting Status */}
                  {Object.keys(securityAudit.rateLimitStatus).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                        <Timer className="h-4 w-4" />
                        Rate Limiting Status
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(securityAudit.rateLimitStatus).map(
                          ([operation, status]) => (
                            <div
                              key={operation}
                              className="bg-slate-800/40 rounded-lg p-3"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-slate-400 capitalize">
                                  {operation.replace(/([A-Z])/g, " $1").trim()}
                                </span>
                                {status.isBlocked ? (
                                  <XCircle className="h-3 w-3 text-red-400" />
                                ) : (
                                  <CheckCircle className="h-3 w-3 text-emerald-400" />
                                )}
                              </div>
                              <div className="text-sm font-medium text-white">
                                {status.isBlocked
                                  ? "Blocked"
                                  : `${status.remaining} remaining`}
                              </div>
                              {status.resetTime && (
                                <div className="text-xs text-slate-500">
                                  Resets:{" "}
                                  {new Date(
                                    status.resetTime
                                  ).toLocaleTimeString()}
                                </div>
                              )}
                              {status.blockReason && (
                                <div className="text-xs text-red-400 mt-1">
                                  {status.blockReason}
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recommendations and Warnings */}
                  {(securityAudit.recommendations.length > 0 ||
                    securityAudit.warnings.length > 0 ||
                    securityAudit.critical.length > 0) && (
                    <div className="space-y-4">
                      {securityAudit.critical.length > 0 && (
                        <Alert className="bg-red-500/10 border-red-500/30">
                          <XCircle className="h-4 w-4 text-red-400" />
                          <AlertDescription>
                            <div className="font-medium text-red-300 mb-2">
                              Critical Issues
                            </div>
                            <ul className="space-y-1 text-red-200">
                              {securityAudit.critical.map((issue, index) => (
                                <li key={index} className="text-sm">
                                  • {issue}
                                </li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {securityAudit.warnings.length > 0 && (
                        <Alert className="bg-yellow-500/10 border-yellow-500/30">
                          <AlertTriangle className="h-4 w-4 text-yellow-400" />
                          <AlertDescription>
                            <div className="font-medium text-yellow-300 mb-2">
                              Warnings
                            </div>
                            <ul className="space-y-1 text-yellow-200">
                              {securityAudit.warnings.map((warning, index) => (
                                <li key={index} className="text-sm">
                                  • {warning}
                                </li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {securityAudit.recommendations.length > 0 && (
                        <Alert className="bg-blue-500/10 border-blue-500/30">
                          <Info className="h-4 w-4 text-blue-400" />
                          <AlertDescription>
                            <div className="font-medium text-blue-300 mb-2">
                              Recommendations
                            </div>
                            <ul className="space-y-1 text-blue-200">
                              {securityAudit.recommendations.map(
                                (rec, index) => (
                                  <li key={index} className="text-sm">
                                    • {rec}
                                  </li>
                                )
                              )}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
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
      {/* {apiKeys.length === 0 && (
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
      )} */}

      {/* Add API Key Modal */}
      <AddApiKeyModal
        isOpen={showAddModal}
        onClose={handleModalClose}
        onSuccess={handleModalClose}
        initialProvider={selectedProvider}
      />

      {/* Key Rotation Modal */}
      <AnimatePresence>
        {showRotationModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-500/20 rounded-xl">
                  <RotateCcw className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Rotate Encryption Keys
                  </h3>
                  <p className="text-sm text-slate-400">
                    Re-encrypt all API keys with new keys
                  </p>
                </div>
              </div>

              <Alert className="mb-4 bg-yellow-500/10 border-yellow-500/30">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-200">
                  This will re-encrypt all your API keys with new encryption
                  keys. Your API keys will remain functional, but the encryption
                  will be refreshed.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowRotationModal(false)}
                  className="border-slate-600 hover:border-slate-500"
                >
                  Cancel
                </Button>
                <Button
                  onClick={rotateKeys}
                  disabled={rotationLoading}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {rotationLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="mr-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <RotateCcw className="h-4 w-4 mr-2" />
                  )}
                  {rotationLoading ? "Rotating..." : "Rotate Keys"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/20 rounded-xl">
                  <Download className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Export API Keys
                  </h3>
                  <p className="text-sm text-slate-400">
                    Create encrypted backup of your keys
                  </p>
                </div>
              </div>

              <Alert className="mb-4 bg-blue-500/10 border-blue-500/30">
                <Info className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-200">
                  Your API keys will be exported in an encrypted format. The
                  backup file will be protected with the password you provide.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-2">
                    Export Password (min. 12 characters)
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter strong password..."
                    value={exportPassword}
                    onChange={(e) => setExportPassword(e.target.value)}
                    className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowExportModal(false);
                      setExportPassword("");
                    }}
                    className="border-slate-600 hover:border-slate-500"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={exportKeys}
                    disabled={exportLoading || exportPassword.length < 12}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {exportLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="mr-2"
                      >
                        <Download className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {exportLoading ? "Exporting..." : "Export Keys"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
