"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Crown,
  TrendingUp,
  Calendar,
  Zap,
  MessageSquare,
  Clock,
  Sparkles,
  ArrowUp,
  BarChart3,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UsageData {
  plan: "free" | "pro";
  messagesThisMonth: number;
  tokensThisMonth: number;
  resetDate: string;
  totalConversations: number;
  totalMessages: number;
}

export function PlanUsageSection() {
  const { toast } = useToast();
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [animatedUsage, setAnimatedUsage] = useState({
    messages: 0,
    tokens: 0,
  });

  // Constants for free plan limits
  const FREE_MESSAGE_LIMIT = 100;
  const FREE_TOKEN_LIMIT = 50000;

  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        const response = await fetch("/api/user/profile");
        const result = await response.json();

        if (result.success) {
          setUsageData(result.data.usage);
        } else {
          toast({
            title: "Error",
            description: "Failed to load usage data",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching usage:", error);
        toast({
          title: "Error",
          description: "Failed to load usage data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsageData();
  }, [toast]);

  // Animate usage counters
  useEffect(() => {
    if (usageData) {
      const duration = 1500;
      const steps = 60;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        const progress = step / steps;
        const easeOut = 1 - Math.pow(1 - progress, 3);

        setAnimatedUsage({
          messages: Math.round(usageData.messagesThisMonth * easeOut),
          tokens: Math.round(usageData.tokensThisMonth * easeOut),
        });

        if (step >= steps) {
          clearInterval(timer);
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [usageData]);

  const handleUpgrade = () => {
    toast({
      title: "Coming Soon! 🚀",
      description: "Pro plans will be available soon with unlimited access.",
    });
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-purple-500/10 transition-all duration-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <Crown className="h-5 w-5 text-purple-400" />
              </div>
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Plan & Usage
              </span>
            </CardTitle>
            <CardDescription className="text-slate-400 leading-relaxed">
              Track your usage and manage your subscription
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="w-24 h-6 bg-slate-700 rounded-lg"></div>
                <div className="w-16 h-6 bg-slate-700 rounded-full"></div>
              </div>
              <div className="space-y-3">
                <div className="w-full h-4 bg-slate-700 rounded-lg"></div>
                <div className="w-full h-4 bg-slate-700 rounded-lg"></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="w-full h-16 bg-slate-700 rounded-xl"></div>
                <div className="w-full h-16 bg-slate-700 rounded-xl"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!usageData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-2xl blur-xl opacity-70" />
        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-red-500/20 rounded-xl">
                <Crown className="h-5 w-5 text-red-400" />
              </div>
              Plan & Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-400 text-center py-8">
              <div className="mb-4">⚠️</div>
              Failed to load usage data. Please refresh the page.
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const messageUsagePercent =
    usageData.plan === "free"
      ? Math.min((usageData.messagesThisMonth / FREE_MESSAGE_LIMIT) * 100, 100)
      : 0;

  const tokenUsagePercent =
    usageData.plan === "free"
      ? Math.min((usageData.tokensThisMonth / FREE_TOKEN_LIMIT) * 100, 100)
      : 0;

  const daysUntilReset = Math.ceil(
    (new Date(usageData.resetDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const isNearLimit = messageUsagePercent > 80 || tokenUsagePercent > 80;
  const isPro = usageData.plan === "pro";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative group"
    >
      {/* Glow effect */}
      <div
        className={cn(
          "absolute inset-0 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500",
          isPro
            ? "bg-gradient-to-r from-amber-600/20 to-yellow-600/20"
            : isNearLimit
            ? "bg-gradient-to-r from-red-600/20 to-orange-600/20"
            : "bg-gradient-to-r from-purple-600/20 to-blue-600/20"
        )}
      />

      <Card
        className={cn(
          "relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl transition-all duration-500",
          isPro
            ? "hover:shadow-amber-500/10 hover:border-amber-500/30"
            : "hover:shadow-purple-500/10 hover:border-purple-500/30"
        )}
      >
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-white">
            <motion.div
              className={cn(
                "p-2 rounded-xl",
                isPro ? "bg-amber-500/20" : "bg-purple-500/20"
              )}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Crown
                className={cn(
                  "h-5 w-5",
                  isPro ? "text-amber-400" : "text-purple-400"
                )}
              />
            </motion.div>
            <span
              className={cn(
                "bg-clip-text text-transparent font-semibold",
                isPro
                  ? "bg-gradient-to-r from-amber-400 to-yellow-400"
                  : "bg-gradient-to-r from-purple-400 to-blue-400"
              )}
            >
              Plan & Usage
            </span>
          </CardTitle>
          <CardDescription className="text-slate-400 leading-relaxed">
            Track your usage and manage your subscription
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Current Plan */}
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="flex items-center gap-3">
              <div className="text-lg font-bold text-white">Current Plan</div>
              {isPro && (
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Sparkles className="h-5 w-5 text-amber-400" />
                </motion.div>
              )}
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-base font-semibold px-4 py-1 rounded-full border-2",
                isPro
                  ? "border-amber-500/50 text-amber-400 bg-amber-500/10"
                  : "border-purple-500/50 text-purple-400 bg-purple-500/10"
              )}
            >
              {isPro ? "Pro" : "Free"}
            </Badge>
          </motion.div>

          {/* Usage Statistics for Free Plan */}
          {!isPro && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <MessageSquare className="h-4 w-4 text-blue-400" />
                    <span>Messages this month</span>
                  </div>
                  <div className="text-sm font-mono">
                    <span
                      className={cn(
                        "font-bold",
                        messageUsagePercent > 90
                          ? "text-red-400"
                          : messageUsagePercent > 75
                          ? "text-orange-400"
                          : "text-emerald-400"
                      )}
                    >
                      {animatedUsage.messages.toLocaleString()}
                    </span>
                    <span className="text-slate-500">
                      {" "}
                      / {FREE_MESSAGE_LIMIT.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Progress
                    value={messageUsagePercent}
                    className="h-3 bg-slate-800 rounded-full overflow-hidden"
                    style={{
                      background:
                        "linear-gradient(to right, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.6))",
                    }}
                  />
                  <div className="flex justify-between text-xs">
                    <span
                      className={cn(
                        "font-medium",
                        messageUsagePercent > 90
                          ? "text-red-400"
                          : messageUsagePercent > 75
                          ? "text-orange-400"
                          : "text-emerald-400"
                      )}
                    >
                      {messageUsagePercent.toFixed(1)}% used
                    </span>
                    <span className="text-slate-500">
                      {(
                        FREE_MESSAGE_LIMIT - usageData.messagesThisMonth
                      ).toLocaleString()}{" "}
                      remaining
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <Zap className="h-4 w-4 text-purple-400" />
                    <span>Tokens this month</span>
                  </div>
                  <div className="text-sm font-mono">
                    <span
                      className={cn(
                        "font-bold",
                        tokenUsagePercent > 90
                          ? "text-red-400"
                          : tokenUsagePercent > 75
                          ? "text-orange-400"
                          : "text-emerald-400"
                      )}
                    >
                      {animatedUsage.tokens.toLocaleString()}
                    </span>
                    <span className="text-slate-500">
                      {" "}
                      / {FREE_TOKEN_LIMIT.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Progress
                    value={tokenUsagePercent}
                    className="h-3 bg-slate-800 rounded-full overflow-hidden"
                    style={{
                      background:
                        "linear-gradient(to right, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.6))",
                    }}
                  />
                  <div className="flex justify-between text-xs">
                    <span
                      className={cn(
                        "font-medium",
                        tokenUsagePercent > 90
                          ? "text-red-400"
                          : tokenUsagePercent > 75
                          ? "text-orange-400"
                          : "text-emerald-400"
                      )}
                    >
                      {tokenUsagePercent.toFixed(1)}% used
                    </span>
                    <span className="text-slate-500">
                      {(
                        FREE_TOKEN_LIMIT - usageData.tokensThisMonth
                      ).toLocaleString()}{" "}
                      remaining
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <Clock className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-slate-300">
                  Usage resets in{" "}
                  <span className="font-semibold text-emerald-400">
                    {daysUntilReset} days
                  </span>
                </span>
              </div>
            </motion.div>
          )}

          {/* Pro Plan Benefits */}
          {isPro && (
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-xl border border-amber-500/30">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Crown className="h-8 w-8 text-amber-400" />
                </motion.div>
                <div>
                  <h3 className="text-lg font-bold text-amber-400">
                    Pro Plan Active
                  </h3>
                  <p className="text-sm text-slate-300">
                    Unlimited messages and tokens
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* All-Time Statistics */}
          <motion.div
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Card className="bg-slate-800/30 border-slate-700/50 rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">
                      Total Conversations
                    </div>
                    <div className="text-xl font-bold text-white">
                      {usageData.totalConversations.toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/30 border-slate-700/50 rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Total Messages</div>
                    <div className="text-xl font-bold text-white">
                      {usageData.totalMessages.toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Upgrade CTA for Free Users */}
          {!isPro && (
            <motion.div
              className="pt-6 border-t border-slate-700/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-purple-400" />
                  <span className="text-slate-400">
                    Need more? Upgrade to Pro
                  </span>
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleUpgrade}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 rounded-xl font-semibold shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
                  >
                    <ArrowUp className="h-4 w-4 mr-2" />
                    Upgrade Now
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
