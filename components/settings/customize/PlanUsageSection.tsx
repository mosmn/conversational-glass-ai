"use client";

import React, { useState, useEffect } from "react";
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
  MessageCircle,
  BarChart3,
  ArrowUp,
} from "lucide-react";

interface UsageStats {
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  messagesThisMonth: number;
  daysUntilReset: number;
}

interface PlanUsageData {
  plan: "free" | "pro";
  stats: UsageStats;
}

export function PlanUsageSection() {
  const { toast } = useToast();
  const [usageData, setUsageData] = useState<PlanUsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Free plan limits
  const FREE_PLAN_LIMITS = {
    messagesPerMonth: 100,
    conversationsPerMonth: 20,
    tokensPerMonth: 50000,
  };

  // Fetch usage data
  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        const response = await fetch("/api/user/profile");
        const result = await response.json();

        if (result.success) {
          setUsageData({
            plan: result.data.plan,
            stats: result.data.stats,
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to load usage data",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching usage data:", error);
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

  const calculateUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-amber-500";
    return "bg-emerald-500";
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Crown className="h-5 w-5 text-amber-400" />
            Plan & Usage
          </CardTitle>
          <CardDescription className="text-slate-400">
            View your current plan and usage statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="w-20 h-6 bg-slate-700 rounded"></div>
            <div className="space-y-3">
              <div className="w-full h-4 bg-slate-700 rounded"></div>
              <div className="w-full h-2 bg-slate-700 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usageData) {
    return (
      <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Crown className="h-5 w-5 text-amber-400" />
            Plan & Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-400">
            Failed to load usage data. Please refresh the page.
          </div>
        </CardContent>
      </Card>
    );
  }

  const { plan, stats } = usageData;
  const isPro = plan === "pro";

  // Calculate usage percentages for free plan
  const messageUsagePercent = isPro
    ? 0
    : calculateUsagePercentage(
        stats.messagesThisMonth,
        FREE_PLAN_LIMITS.messagesPerMonth
      );
  const conversationUsagePercent = isPro
    ? 0
    : calculateUsagePercentage(
        stats.totalConversations,
        FREE_PLAN_LIMITS.conversationsPerMonth
      );
  const tokenUsagePercent = isPro
    ? 0
    : calculateUsagePercentage(
        stats.totalTokens,
        FREE_PLAN_LIMITS.tokensPerMonth
      );

  return (
    <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Crown className="h-5 w-5 text-amber-400" />
          Plan & Usage
        </CardTitle>
        <CardDescription className="text-slate-400">
          View your current plan and usage statistics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Current Plan</h3>
            <p className="text-sm text-slate-400">
              {isPro
                ? "Unlimited usage and priority support"
                : "Basic usage with monthly limits"}
            </p>
          </div>
          <Badge
            variant={isPro ? "default" : "outline"}
            className={
              isPro
                ? "bg-amber-600 text-white border-amber-500"
                : "border-slate-600 text-slate-300"
            }
          >
            {isPro ? "Pro" : "Free"}
          </Badge>
        </div>

        {/* Usage Statistics */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Usage This Month
          </h4>

          {!isPro && (
            <>
              {/* Messages Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Messages
                  </span>
                  <span className="text-slate-300">
                    {stats.messagesThisMonth} /{" "}
                    {FREE_PLAN_LIMITS.messagesPerMonth}
                  </span>
                </div>
                <Progress value={messageUsagePercent} className="h-2" />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{messageUsagePercent.toFixed(0)}% used</span>
                  <span>Resets in {stats.daysUntilReset} days</span>
                </div>
              </div>

              {/* Tokens Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Tokens
                  </span>
                  <span className="text-slate-300">
                    {stats.totalTokens.toLocaleString()} /{" "}
                    {FREE_PLAN_LIMITS.tokensPerMonth.toLocaleString()}
                  </span>
                </div>
                <Progress value={tokenUsagePercent} className="h-2" />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{tokenUsagePercent.toFixed(0)}% used</span>
                  <span>Resets in {stats.daysUntilReset} days</span>
                </div>
              </div>
            </>
          )}

          {/* All-time Statistics */}
          <div className="pt-4 border-t border-slate-700">
            <h5 className="text-sm font-medium text-slate-300 mb-3">
              All-time Statistics
            </h5>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                <div className="text-2xl font-bold text-emerald-400">
                  {stats.totalConversations}
                </div>
                <div className="text-xs text-slate-400">Conversations</div>
              </div>
              <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">
                  {stats.totalMessages}
                </div>
                <div className="text-xs text-slate-400">Messages</div>
              </div>
            </div>
          </div>
        </div>

        {/* Upgrade Section (for free users) */}
        {!isPro && (
          <div className="pt-4 border-t border-slate-700">
            <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-amber-400 mb-1">
                    Upgrade to Pro
                  </h4>
                  <p className="text-xs text-slate-300 mb-3">
                    Get unlimited messages, priority support, and early access
                    to new features.
                  </p>
                </div>
                <Crown className="h-5 w-5 text-amber-400 flex-shrink-0" />
              </div>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => {
                  toast({
                    title: "Coming Soon!",
                    description:
                      "Pro plans will be available soon. Stay tuned!",
                  });
                }}
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </div>
          </div>
        )}

        {/* Reset Information */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-700">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Usage resets monthly
          </span>
          <span>{stats.daysUntilReset} days remaining</span>
        </div>
      </CardContent>
    </Card>
  );
}
