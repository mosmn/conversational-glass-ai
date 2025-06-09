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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Trash2,
  AlertTriangle,
  Clock,
  FileX,
  Layers,
  Zap,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Calendar,
  HardDrive,
  Loader2,
  Target,
  Sparkles,
  BarChart3,
} from "lucide-react";

interface CleanupStats {
  orphanedFiles: {
    count: number;
    totalSize: number;
    potential_savings: number;
  };
  oldFiles: {
    older_than_30_days: { count: number; totalSize: number };
    older_than_90_days: { count: number; totalSize: number };
    older_than_180_days: { count: number; totalSize: number };
  };
  duplicates: {
    count: number;
    totalSize: number;
    sets: number;
  };
  large_files: {
    over_10mb: { count: number; totalSize: number };
    over_50mb: { count: number; totalSize: number };
  };
  totalCleanupPotential: {
    files: number;
    size: number;
    percentage: number;
  };
}

interface CleanupOperation {
  id: string;
  type:
    | "orphaned"
    | "old_files"
    | "duplicates"
    | "large_files"
    | "by_category"
    | "custom";
  status: "idle" | "running" | "completed" | "error";
  progress: number;
  deletedCount: number;
  freedSpace: number;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

// Mock data for demonstration
const generateMockCleanupStats = (): CleanupStats => ({
  orphanedFiles: {
    count: 3,
    totalSize: 15728640, // ~15MB
    potential_savings: 15728640,
  },
  oldFiles: {
    older_than_30_days: { count: 8, totalSize: 52428800 }, // ~50MB
    older_than_90_days: { count: 5, totalSize: 31457280 }, // ~30MB
    older_than_180_days: { count: 2, totalSize: 10485760 }, // ~10MB
  },
  duplicates: {
    count: 6,
    totalSize: 20971520, // ~20MB
    sets: 3,
  },
  large_files: {
    over_10mb: { count: 4, totalSize: 167772160 }, // ~160MB
    over_50mb: { count: 1, totalSize: 83886080 }, // ~80MB
  },
  totalCleanupPotential: {
    files: 17,
    size: 88604160, // ~84MB
    percentage: 8.2,
  },
});

export function CleanupToolsSection() {
  const { toast } = useToast();
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [operations, setOperations] = useState<CleanupOperation[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState("90");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const fetchCleanupStats = async () => {
    setIsLoading(true);
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const mockStats = generateMockCleanupStats();
      setStats(mockStats);
    } catch (error) {
      console.error("Error fetching cleanup stats:", error);
      toast({
        title: "Error",
        description: "Failed to load cleanup statistics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const performCleanup = async (type: string, params: any = {}) => {
    const operationId = `${type}-${Date.now()}`;
    const newOperation: CleanupOperation = {
      id: operationId,
      type: type as any,
      status: "running",
      progress: 0,
      deletedCount: 0,
      freedSpace: 0,
      startTime: new Date(),
    };

    setOperations((prev) => [...prev, newOperation]);

    try {
      // Simulate progressive cleanup with realistic delays
      const simulateProgress = async () => {
        const steps = [10, 25, 45, 70, 85, 100];
        for (const step of steps) {
          await new Promise((resolve) =>
            setTimeout(resolve, 400 + Math.random() * 600)
          );
          setOperations((prev) =>
            prev.map((op) =>
              op.id === operationId ? { ...op, progress: step } : op
            )
          );
        }
      };

      await simulateProgress();

      // Mock successful results based on operation type
      let deletedCount = 0;
      let freedSpace = 0;

      switch (type) {
        case "orphaned":
          deletedCount = stats?.orphanedFiles.count || 0;
          freedSpace = stats?.orphanedFiles.totalSize || 0;
          break;
        case "old_files":
          const timeframe = params.days || 90;
          if (timeframe === 30) {
            deletedCount = stats?.oldFiles.older_than_30_days.count || 0;
            freedSpace = stats?.oldFiles.older_than_30_days.totalSize || 0;
          } else if (timeframe === 90) {
            deletedCount = stats?.oldFiles.older_than_90_days.count || 0;
            freedSpace = stats?.oldFiles.older_than_90_days.totalSize || 0;
          } else {
            deletedCount = stats?.oldFiles.older_than_180_days.count || 0;
            freedSpace = stats?.oldFiles.older_than_180_days.totalSize || 0;
          }
          break;
        case "duplicates":
          deletedCount = stats?.duplicates.count || 0;
          freedSpace = stats?.duplicates.totalSize || 0;
          break;
        case "large_files":
          deletedCount = Math.floor(Math.random() * 3) + 1;
          freedSpace = (params.minSize || 50 * 1024 * 1024) * deletedCount;
          break;
        default:
          deletedCount = Math.floor(Math.random() * 10) + 1;
          freedSpace = Math.floor(Math.random() * 50 * 1024 * 1024);
      }

      setOperations((prev) =>
        prev.map((op) =>
          op.id === operationId
            ? {
                ...op,
                status: "completed",
                progress: 100,
                deletedCount,
                freedSpace,
                endTime: new Date(),
              }
            : op
        )
      );

      toast({
        title: "Cleanup Completed",
        description: `Deleted ${deletedCount} files, freed ${formatBytes(
          freedSpace
        )}`,
      });

      // Refresh stats after cleanup
      setTimeout(() => fetchCleanupStats(), 1000);
    } catch (error) {
      console.error("Cleanup error:", error);
      setOperations((prev) =>
        prev.map((op) =>
          op.id === operationId
            ? {
                ...op,
                status: "error",
                error: error instanceof Error ? error.message : "Unknown error",
                endTime: new Date(),
              }
            : op
        )
      );

      toast({
        title: "Cleanup Failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDuration = (startTime: Date, endTime: Date) => {
    const duration = endTime.getTime() - startTime.getTime();
    return `${(duration / 1000).toFixed(1)}s`;
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case "orphaned":
        return FileX;
      case "old_files":
        return Clock;
      case "duplicates":
        return Layers;
      case "large_files":
        return HardDrive;
      case "custom":
        return Target;
      default:
        return Trash2;
    }
  };

  const getOperationColor = (status: string) => {
    switch (status) {
      case "running":
        return "blue";
      case "completed":
        return "green";
      case "error":
        return "red";
      default:
        return "gray";
    }
  };

  const getOperationName = (type: string) => {
    switch (type) {
      case "orphaned":
        return "Orphaned Files";
      case "old_files":
        return "Old Files";
      case "duplicates":
        return "Duplicate Files";
      case "large_files":
        return "Large Files";
      case "custom":
        return "Custom Cleanup";
      default:
        return "File Cleanup";
    }
  };

  useEffect(() => {
    fetchCleanupStats();
  }, []);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-red-500/20 rounded-xl">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Cleanup Tools
              </span>
            </CardTitle>
            <CardDescription className="text-slate-400 leading-relaxed">
              Free up space by removing unnecessary files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 animate-pulse">
              <div className="w-full h-20 bg-slate-700 rounded-xl"></div>
              <div className="w-full h-20 bg-slate-700 rounded-xl"></div>
              <div className="w-full h-20 bg-slate-700 rounded-xl"></div>
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
      transition={{ duration: 0.5, delay: 0.3 }}
      className="relative group"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />

      <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-red-500/10 transition-all duration-500 hover:border-red-500/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-white">
            <motion.div
              className="p-2 bg-red-500/20 rounded-xl"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Trash2 className="h-5 w-5 text-red-400" />
            </motion.div>
            <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              Cleanup Tools
            </span>
          </CardTitle>
          <CardDescription className="text-slate-400 leading-relaxed">
            Free up space by removing unnecessary files
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Cleanup Overview */}
          {stats && stats.totalCleanupPotential.files > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-orange-400" />
                  <div>
                    <h4 className="text-sm font-medium text-white">
                      Cleanup Opportunity
                    </h4>
                    <p className="text-xs text-slate-400">
                      Potential space savings available
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-orange-500 text-orange-400 text-xs"
                >
                  {formatBytes(stats.totalCleanupPotential.size)} available
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">
                  {stats.totalCleanupPotential.files} files •{" "}
                  {stats.totalCleanupPotential.percentage}% of total storage
                </span>
                <Button
                  size="sm"
                  onClick={() => performCleanup("comprehensive")}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Quick Clean
                </Button>
              </div>
            </motion.div>
          )}

          {/* Cleanup Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Orphaned Files */}
            {stats?.orphanedFiles && stats.orphanedFiles.count > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl group/card hover:bg-amber-500/15 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <FileX className="h-5 w-5 text-amber-400" />
                    <div>
                      <h4 className="text-sm font-medium text-white">
                        Orphaned Files
                      </h4>
                      <p className="text-xs text-slate-400">
                        Files not linked to conversations
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-amber-500 text-amber-400 text-xs"
                  >
                    {stats.orphanedFiles.count} files
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">Potential savings</span>
                    <span className="text-amber-400 font-medium">
                      {formatBytes(stats.orphanedFiles.totalSize)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => performCleanup("orphaned")}
                    className="w-full border-amber-500 text-amber-400 hover:bg-amber-500/20 group-hover/card:bg-amber-500/30"
                  >
                    <FileX className="h-4 w-4 mr-2" />
                    Clean Orphaned
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Old Files */}
            {stats?.oldFiles && stats.oldFiles.older_than_90_days.count > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl group/card hover:bg-blue-500/15 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-blue-400" />
                    <div>
                      <h4 className="text-sm font-medium text-white">
                        Old Files (90+ days)
                      </h4>
                      <p className="text-xs text-slate-400">
                        Files older than 90 days
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-blue-500 text-blue-400 text-xs"
                  >
                    {stats.oldFiles.older_than_90_days.count} files
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">Potential savings</span>
                    <span className="text-blue-400 font-medium">
                      {formatBytes(stats.oldFiles.older_than_90_days.totalSize)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => performCleanup("old_files", { days: 90 })}
                    className="w-full border-blue-500 text-blue-400 hover:bg-blue-500/20 group-hover/card:bg-blue-500/30"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Clean Old Files
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Duplicates */}
            {stats?.duplicates && stats.duplicates.count > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl group/card hover:bg-purple-500/15 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Layers className="h-5 w-5 text-purple-400" />
                    <div>
                      <h4 className="text-sm font-medium text-white">
                        Duplicate Files
                      </h4>
                      <p className="text-xs text-slate-400">
                        {stats.duplicates.sets} sets of duplicates
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-purple-500 text-purple-400 text-xs"
                  >
                    {stats.duplicates.count} files
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">Potential savings</span>
                    <span className="text-purple-400 font-medium">
                      {formatBytes(stats.duplicates.totalSize)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => performCleanup("duplicates")}
                    className="w-full border-purple-500 text-purple-400 hover:bg-purple-500/20 group-hover/card:bg-purple-500/30"
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    Remove Duplicates
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Large Files */}
            {stats?.large_files && stats.large_files.over_50mb.count > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl group/card hover:bg-green-500/15 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <HardDrive className="h-5 w-5 text-green-400" />
                    <div>
                      <h4 className="text-sm font-medium text-white">
                        Large Files (50MB+)
                      </h4>
                      <p className="text-xs text-slate-400">
                        Files larger than 50MB
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-green-500 text-green-400 text-xs"
                  >
                    {stats.large_files.over_50mb.count} files
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">Total size</span>
                    <span className="text-green-400 font-medium">
                      {formatBytes(stats.large_files.over_50mb.totalSize)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      performCleanup("large_files", {
                        minSize: 50 * 1024 * 1024,
                      })
                    }
                    className="w-full border-green-500 text-green-400 hover:bg-green-500/20 group-hover/card:bg-green-500/30"
                  >
                    <HardDrive className="h-4 w-4 mr-2" />
                    Review Large Files
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Advanced Options */}
          <div className="border-t border-slate-700/50 pt-6">
            <h4 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-yellow-400" />
              Advanced Cleanup
            </h4>

            <div className="space-y-4">
              {/* Custom Date Range */}
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm text-slate-400 mb-2 block">
                    Delete files older than:
                  </label>
                  <Select
                    value={selectedTimeframe}
                    onValueChange={setSelectedTimeframe}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <label className="text-sm text-slate-400 mb-2 block">
                    File category:
                  </label>
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="all">All categories</SelectItem>
                      <SelectItem value="image">Images only</SelectItem>
                      <SelectItem value="pdf">PDFs only</SelectItem>
                      <SelectItem value="text">Text files only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  onClick={() =>
                    performCleanup("custom", {
                      days: parseInt(selectedTimeframe),
                      category: selectedCategory,
                    })
                  }
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Custom Clean
                </Button>
              </div>

              {/* Statistics */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-800/30 rounded-xl">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">
                      {stats.oldFiles.older_than_30_days.count}
                    </div>
                    <div className="text-xs text-slate-400">30+ days old</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">
                      {stats.oldFiles.older_than_90_days.count}
                    </div>
                    <div className="text-xs text-slate-400">90+ days old</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">
                      {stats.duplicates.sets}
                    </div>
                    <div className="text-xs text-slate-400">Duplicate sets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">
                      {stats.large_files.over_10mb.count}
                    </div>
                    <div className="text-xs text-slate-400">Large files</div>
                  </div>
                </div>
              )}

              {/* Danger Zone */}
              <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <h5 className="text-sm font-medium text-red-400">
                    Danger Zone
                  </h5>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  These actions are irreversible. Make sure you have backups if
                  needed.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (
                        confirm(
                          "Are you sure you want to delete ALL attachment files? This cannot be undone."
                        )
                      ) {
                        performCleanup("all_files");
                      }
                    }}
                    className="border-red-500 text-red-400 hover:bg-red-500/20"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Delete All Files
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Operation Status */}
          {operations.length > 0 && (
            <div className="border-t border-slate-700/50 pt-6">
              <h4 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-slate-400" />
                Recent Operations
              </h4>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {operations
                    .slice(-5)
                    .reverse()
                    .map((operation) => {
                      const OperationIcon = getOperationIcon(operation.type);
                      const colorClass = getOperationColor(operation.status);

                      return (
                        <motion.div
                          key={operation.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50"
                        >
                          <div
                            className={`p-2 rounded-lg bg-${colorClass}-500/20`}
                          >
                            <OperationIcon
                              className={`h-4 w-4 text-${colorClass}-400`}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-white font-medium">
                                {getOperationName(operation.type)}
                              </span>
                              <div className="flex items-center gap-2">
                                {operation.status === "completed" &&
                                  operation.startTime &&
                                  operation.endTime && (
                                    <span className="text-xs text-slate-400">
                                      {formatDuration(
                                        operation.startTime,
                                        operation.endTime
                                      )}
                                    </span>
                                  )}
                                <Badge
                                  variant="outline"
                                  className={`text-xs border-${colorClass}-500 text-${colorClass}-400`}
                                >
                                  {operation.status}
                                </Badge>
                              </div>
                            </div>

                            {operation.status === "running" && (
                              <div className="mt-2">
                                <Progress
                                  value={operation.progress}
                                  className="h-1"
                                />
                                <p className="text-xs text-slate-400 mt-1">
                                  {operation.progress}% complete
                                </p>
                              </div>
                            )}

                            {operation.status === "completed" && (
                              <p className="text-xs text-slate-400 mt-1">
                                Deleted {operation.deletedCount} files • Freed{" "}
                                {formatBytes(operation.freedSpace)}
                              </p>
                            )}

                            {operation.status === "error" &&
                              operation.error && (
                                <p className="text-xs text-red-400 mt-1">
                                  {operation.error}
                                </p>
                              )}
                          </div>

                          <div className="flex items-center">
                            {operation.status === "completed" && (
                              <CheckCircle2 className="h-4 w-4 text-green-400" />
                            )}
                            {operation.status === "error" && (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                            {operation.status === "running" && (
                              <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Refresh Button */}
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={fetchCleanupStats}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Statistics
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
