"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import {
  MessageSquare,
  Users,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Calendar,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface HistoryStats {
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  modelsUsed: string[];
  averageMessagesPerConversation: number;
  conversationsThisMonth: number;
  messagesThisMonth: number;
  oldestConversation?: string;
  newestConversation?: string;
}

interface SyncStatus {
  lastSyncTime: string;
  totalConversations: number;
  totalMessages: number;
  syncStatus: "synced" | "pending" | "error";
  pendingSync: number;
  conflictsDetected: number;
  healthScore: number;
}

export function HistoryOverview() {
  const { user } = useUser();
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch history stats
      const statsResponse = await fetch("/api/user/stats");
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      // Fetch sync status
      const syncResponse = await fetch("/api/conversations/bulk-operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "sync-status" }),
      });

      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        setSyncStatus(syncData.syncStatus);
      }
    } catch (error) {
      console.error("Failed to fetch history data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      // Trigger sync operation
      await fetch("/api/conversations/bulk-operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "sync-status" }),
      });

      // Refresh data
      await fetchData();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-600/20 to-slate-500/20 rounded-2xl blur-xl opacity-70" />
            <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24 bg-slate-700 rounded-lg" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 bg-slate-700 mb-2 rounded-lg" />
                <Skeleton className="h-3 w-32 bg-slate-700 rounded-lg" />
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  const syncStatusColor = {
    synced: "text-emerald-400",
    pending: "text-amber-400",
    error: "text-red-400",
  }[syncStatus?.syncStatus || "error"];

  const syncStatusIcon = {
    synced: CheckCircle,
    pending: RefreshCw,
    error: AlertCircle,
  }[syncStatus?.syncStatus || "error"];

  const SyncIcon = syncStatusIcon;

  return (
    <div className="space-y-6">
      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Total Conversations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
          <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:border-emerald-500/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Conversations
              </CardTitle>
              <div className="p-2 bg-emerald-500/20 rounded-xl">
                <MessageSquare className="h-4 w-4 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatNumber(stats?.totalConversations || 0)}
              </div>
              <p className="text-xs text-slate-400">
                {stats?.conversationsThisMonth || 0} this month
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Total Messages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
          <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:border-blue-500/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Messages
              </CardTitle>
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <Activity className="h-4 w-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatNumber(stats?.totalMessages || 0)}
              </div>
              <p className="text-xs text-slate-400">
                {stats?.messagesThisMonth || 0} this month
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Average Messages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
          <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:border-purple-500/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Avg per Chat
              </CardTitle>
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <TrendingUp className="h-4 w-4 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats?.averageMessagesPerConversation || 0}
              </div>
              <p className="text-xs text-slate-400">
                messages per conversation
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sync Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
          <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:border-amber-500/30 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">
                Sync Status
              </CardTitle>
              <div className="p-2 bg-amber-500/20 rounded-xl">
                <SyncIcon className={`h-4 w-4 ${syncStatusColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="secondary"
                  className={`${syncStatusColor} bg-slate-800/50`}
                >
                  {syncStatus?.syncStatus || "Unknown"}
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Last sync: {formatDate(syncStatus?.lastSyncTime)}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Models & Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
          <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 rounded-xl">
                  <Users className="h-5 w-5 text-emerald-400" />
                </div>
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  AI Models Used
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {stats?.modelsUsed?.map((model) => (
                  <Badge
                    key={model}
                    variant="secondary"
                    className="bg-slate-800/50 text-slate-300"
                  >
                    {model}
                  </Badge>
                )) || (
                  <Badge
                    variant="secondary"
                    className="bg-slate-800/50 text-slate-400"
                  >
                    No models used yet
                  </Badge>
                )}
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-700/50">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Tokens</span>
                  <span className="text-white font-medium">
                    {formatNumber(stats?.totalTokens || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">First Chat</span>
                  <span className="text-white font-medium">
                    {formatDate(stats?.oldestConversation)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Latest Chat</span>
                  <span className="text-white font-medium">
                    {formatDate(stats?.newestConversation)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sync Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
          <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <div className="p-2 bg-blue-500/20 rounded-xl">
                  <Clock className="h-5 w-5 text-blue-400" />
                </div>
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Synchronization
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Health Score</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${syncStatus?.healthScore || 0}%` }}
                      />
                    </div>
                    <span className="text-sm text-white font-medium">
                      {syncStatus?.healthScore || 0}%
                    </span>
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Pending Sync</span>
                  <span className="text-white font-medium">
                    {syncStatus?.pendingSync || 0}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Conflicts</span>
                  <span className="text-white font-medium">
                    {syncStatus?.conflictsDetected || 0}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
