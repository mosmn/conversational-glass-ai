"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  HardDrive,
  TrendingUp,
  FileImage,
  FileText,
  File,
  Calendar,
  Clock,
  BarChart3,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface StorageStats {
  overview: {
    totalFiles: number;
    totalSize: number;
    totalSizeFormatted: string;
    quotaUsagePercent: number;
    quotaLimitGB: number;
    remainingBytes: number;
    oldestFile: string;
    newestFile: string;
    avgFileSize: number;
    largestFile: number;
  };
  byCategory: {
    images: {
      count: number;
      size: number;
      sizeFormatted: string;
      percentage: number;
    };
    pdfs: {
      count: number;
      size: number;
      sizeFormatted: string;
      percentage: number;
    };
    texts: {
      count: number;
      size: number;
      sizeFormatted: string;
      percentage: number;
    };
  };
  cleanup: {
    orphanedFiles: number;
    orphanedSize: number;
    orphanedSizeFormatted: string;
    potentialSavings: string;
  };
  activity: {
    thisMonth: {
      files: number;
      size: number;
      sizeFormatted: string;
    };
    last30Days: {
      files: number;
      size: number;
      sizeFormatted: string;
    };
  };
}

export function StorageUsageSection() {
  const { toast } = useToast();
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await fetch("/api/files/stats");

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        setStats(result.data);
      } else {
        throw new Error(result.error || "Failed to fetch storage statistics");
      }
    } catch (error) {
      console.error("Error fetching storage stats:", error);

      // Show error toast
      toast({
        title: "Error",
        description: "Failed to load storage statistics. Please try again.",
        variant: "destructive",
      });

      // Set empty stats on error
      setStats({
        overview: {
          totalFiles: 0,
          totalSize: 0,
          totalSizeFormatted: "0 Bytes",
          quotaUsagePercent: 0,
          quotaLimitGB: 5,
          remainingBytes: 5 * 1024 * 1024 * 1024,
          oldestFile: "",
          newestFile: "",
          avgFileSize: 0,
          largestFile: 0,
        },
        byCategory: {
          images: {
            count: 0,
            size: 0,
            sizeFormatted: "0 Bytes",
            percentage: 0,
          },
          pdfs: {
            count: 0,
            size: 0,
            sizeFormatted: "0 Bytes",
            percentage: 0,
          },
          texts: {
            count: 0,
            size: 0,
            sizeFormatted: "0 Bytes",
            percentage: 0,
          },
        },
        cleanup: {
          orphanedFiles: 0,
          orphanedSize: 0,
          orphanedSizeFormatted: "0 Bytes",
          potentialSavings: "0 Bytes",
        },
        activity: {
          thisMonth: {
            files: 0,
            size: 0,
            sizeFormatted: "0 Bytes",
          },
          last30Days: {
            files: 0,
            size: 0,
            sizeFormatted: "0 Bytes",
          },
        },
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getQuotaColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-400";
    if (percentage >= 75) return "text-amber-400";
    return "text-teal-400";
  };

  const getQuotaProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-amber-500";
    return "bg-teal-500";
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 to-cyan-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-teal-500/10 transition-all duration-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-teal-500/20 rounded-xl">
                <HardDrive className="h-5 w-5 text-teal-400" />
              </div>
              <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Storage Usage
              </span>
            </CardTitle>
            <CardDescription className="text-slate-400 leading-relaxed">
              Monitor your file storage usage and quota
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 animate-pulse">
              <div className="w-full h-4 bg-slate-700 rounded-lg"></div>
              <div className="w-3/4 h-4 bg-slate-700 rounded-lg"></div>
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

  if (!stats) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-2xl blur-xl opacity-70" />
        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-red-500/20 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              Storage Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 space-y-4">
              <div className="text-sm text-slate-400">
                <div className="mb-4">⚠️</div>
                Failed to load storage statistics.
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchStats()}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative group"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 to-cyan-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />

      <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-teal-500/10 transition-all duration-500 hover:border-teal-500/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-white">
            <motion.div
              className="p-2 bg-teal-500/20 rounded-xl"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <HardDrive className="h-5 w-5 text-teal-400" />
            </motion.div>
            <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              Storage Usage
            </span>
            {isRefreshing && (
              <RefreshCw className="h-4 w-4 text-teal-400 animate-spin" />
            )}
          </CardTitle>
          <CardDescription className="text-slate-400 leading-relaxed">
            Monitor your file storage usage and quota
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quota Overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Storage Quota</span>
              <span
                className={`text-sm font-medium ${getQuotaColor(
                  stats.overview.quotaUsagePercent
                )}`}
              >
                {stats.overview.totalSizeFormatted} /{" "}
                {stats.overview.quotaLimitGB} GB
              </span>
            </div>
            <div className="relative">
              <Progress
                value={stats.overview.quotaUsagePercent}
                className="h-3 bg-slate-800"
              />
              <div
                className={`absolute top-0 left-0 h-3 rounded-full transition-all duration-500 ${getQuotaProgressColor(
                  stats.overview.quotaUsagePercent
                )}`}
                style={{
                  width: `${Math.min(stats.overview.quotaUsagePercent, 100)}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{stats.overview.totalFiles} files</span>
              <span>
                {formatBytes(stats.overview.remainingBytes)} remaining
              </span>
            </div>
          </div>

          {/* File Type Breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-all duration-300"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileImage className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">
                  Images
                </span>
              </div>
              <div className="text-sm font-semibold text-white">
                {stats.byCategory.images.count}
              </div>
              <div className="text-xs text-slate-400">
                {stats.byCategory.images.sizeFormatted}
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-red-500/30 transition-all duration-300"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-red-400" />
                <span className="text-xs font-medium text-red-400">PDFs</span>
              </div>
              <div className="text-sm font-semibold text-white">
                {stats.byCategory.pdfs.count}
              </div>
              <div className="text-xs text-slate-400">
                {stats.byCategory.pdfs.sizeFormatted}
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-blue-500/30 transition-all duration-300"
            >
              <div className="flex items-center gap-2 mb-2">
                <File className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-medium text-blue-400">Text</span>
              </div>
              <div className="text-sm font-semibold text-white">
                {stats.byCategory.texts.count}
              </div>
              <div className="text-xs text-slate-400">
                {stats.byCategory.texts.sizeFormatted}
              </div>
            </motion.div>
          </div>

          {/* Activity Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-xs text-slate-400">This Month</span>
              </div>
              <div className="text-sm font-semibold text-white">
                {stats.activity.thisMonth.files} files
              </div>
              <div className="text-xs text-slate-500">
                {stats.activity.thisMonth.sizeFormatted}
              </div>
            </div>

            <div className="p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-xs text-slate-400">Last 30 Days</span>
              </div>
              <div className="text-sm font-semibold text-white">
                {stats.activity.last30Days.files} files
              </div>
              <div className="text-xs text-slate-500">
                {stats.activity.last30Days.sizeFormatted}
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchStats(true)}
              disabled={isRefreshing}
              className="text-slate-400 hover:text-teal-400 hover:bg-teal-500/10"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh Stats
            </Button>
          </div>

          {/* Cleanup Opportunity */}
          {stats.cleanup.orphanedFiles > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl"
            >
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-medium text-amber-400">
                  Cleanup Opportunity
                </span>
              </div>
              <div className="text-sm text-amber-200">
                {stats.cleanup.orphanedFiles} orphaned files
              </div>
              <div className="text-xs text-amber-300">
                Save {stats.cleanup.potentialSavings} by cleaning up
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
