"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Clock,
  DollarSign,
  Activity,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface UsageAnalyticsProps {
  models: any[];
  userPreferences: any;
}

export function UsageAnalytics({
  models,
  userPreferences,
}: UsageAnalyticsProps) {
  // Mock analytics data - in production this would come from actual usage
  const analyticsData = {
    totalRequests: 1247,
    totalTokens: 89534,
    averageResponseTime: 2.3,
    estimatedCost: 12.45,
    topModels: [
      { name: "GPT-4", usage: 45, color: "emerald" },
      { name: "Claude-3 Sonnet", usage: 30, color: "orange" },
      { name: "Gemini Pro", usage: 25, color: "blue" },
    ],
    dailyUsage: [20, 35, 28, 42, 38, 45, 52],
  };

  const stats = [
    {
      title: "Total Requests",
      value: analyticsData.totalRequests.toLocaleString(),
      icon: Activity,
      color: "emerald",
      change: "+12%",
    },
    {
      title: "Tokens Used",
      value: `${(analyticsData.totalTokens / 1000).toFixed(1)}K`,
      icon: BarChart3,
      color: "blue",
      change: "+8%",
    },
    {
      title: "Avg Response",
      value: `${analyticsData.averageResponseTime}s`,
      icon: Clock,
      color: "amber",
      change: "-5%",
    },
    {
      title: "Est. Cost",
      value: `$${analyticsData.estimatedCost.toFixed(2)}`,
      icon: DollarSign,
      color: "teal",
      change: "+3%",
    },
  ];

  const colorMap = {
    emerald: {
      bg: "bg-emerald-500/20",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
      glow: "from-emerald-600/20 to-green-600/20",
    },
    blue: {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      border: "border-blue-500/30",
      glow: "from-blue-600/20 to-cyan-600/20",
    },
    amber: {
      bg: "bg-amber-500/20",
      text: "text-amber-400",
      border: "border-amber-500/30",
      glow: "from-amber-600/20 to-orange-600/20",
    },
    teal: {
      bg: "bg-teal-500/20",
      text: "text-teal-400",
      border: "border-teal-500/30",
      glow: "from-teal-600/20 to-cyan-600/20",
    },
    orange: {
      bg: "bg-orange-500/20",
      text: "text-orange-400",
      border: "border-orange-500/30",
      glow: "from-orange-600/20 to-red-600/20",
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="space-y-6"
    >
      {/* Overview Stats */}
      <motion.div
        className="relative group"
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/10 to-teal-600/10 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />

        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <motion.div
                className="p-2 bg-emerald-500/20 rounded-xl"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <BarChart3 className="h-5 w-5 text-emerald-400" />
              </motion.div>
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Usage Analytics
              </span>
            </CardTitle>
            <p className="text-slate-400 text-sm">
              Your AI model usage patterns and performance metrics
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                const colors = colorMap[stat.color as keyof typeof colorMap];

                return (
                  <motion.div
                    key={stat.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="relative group/stat"
                  >
                    {/* Stat card glow */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${colors.glow} rounded-xl opacity-0 group-hover/stat:opacity-100 transition-opacity duration-300`}
                    />

                    <div className="relative p-4 bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2 rounded-lg ${colors.bg}`}>
                          <Icon className={`h-4 w-4 ${colors.text}`} />
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs ${colors.text} ${colors.border} bg-slate-800/50`}
                        >
                          {stat.change}
                        </Badge>
                      </div>
                      <div>
                        <div
                          className={`text-2xl font-bold ${colors.text} mb-1`}
                        >
                          {stat.value}
                        </div>
                        <div className="text-sm text-slate-400">
                          {stat.title}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Model Usage Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="relative group"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />

        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <motion.div
                className="p-2 bg-blue-500/20 rounded-xl"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </motion.div>
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Top Models
              </span>
            </CardTitle>
            <p className="text-slate-400 text-sm">
              Most frequently used models this month
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.topModels.map((model, index) => {
                const colors = colorMap[model.color as keyof typeof colorMap];

                return (
                  <motion.div
                    key={model.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">
                          {model.name}
                        </span>
                        <span className={`text-sm font-medium ${colors.text}`}>
                          {model.usage}%
                        </span>
                      </div>
                      <div className="relative">
                        <Progress
                          value={model.usage}
                          className="h-2 bg-slate-700/50"
                        />
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${model.usage}%` }}
                          transition={{ duration: 1, delay: index * 0.2 }}
                          className={`absolute top-0 left-0 h-2 rounded-full ${colors.bg} ${colors.border} border`}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="mt-6 pt-4 border-t border-slate-700/50">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-slate-400">
                  <Sparkles className="h-4 w-4" />
                  <span>Based on last 30 days</span>
                </div>
                <div className="text-slate-300">
                  <span className="font-medium">{models.length}</span> models
                  configured
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
