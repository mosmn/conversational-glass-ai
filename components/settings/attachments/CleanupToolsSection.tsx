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
  fetchCleanupStats,
  cleanupOrphanedFiles,
  cleanupOldFiles,
  cleanupDuplicateFiles,
  cleanupFilesByCategory,
  performComprehensiveCleanup,
  formatBytes as apiFormatBytes,
  type CleanupStats,
} from "@/lib/api/cleanup";
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

export function CleanupToolsSection() {
  const { toast } = useToast();
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [operations, setOperations] = useState<CleanupOperation[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState("90");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const loadCleanupStats = async () => {
    setIsLoading(true);
    try {
      const cleanupStats = await fetchCleanupStats();
      setStats(cleanupStats);
    } catch (error) {
      console.error("Error fetching cleanup stats:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load cleanup statistics",
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
      let result;

      // Call the appropriate cleanup function based on type
      switch (type) {
        case "orphaned":
          result = await cleanupOrphanedFiles();
          break;
        case "old_files":
          const days = params.days || 90;
          result = await cleanupOldFiles(days);
          break;
        case "duplicates":
          result = await cleanupDuplicateFiles();
          break;
        case "by_category":
          if (params.category) {
            result = await cleanupFilesByCategory(params.category);
          } else {
            throw new Error("Category parameter required");
          }
          break;
        case "comprehensive":
          const comprehensiveResults = await performComprehensiveCleanup();
          // Aggregate results from multiple operations
          result = {
            operation: "Comprehensive Cleanup",
            success: true,
            deletedFiles: comprehensiveResults.reduce(
              (sum, r) => sum + r.deletedFiles,
              0
            ),
            freedSpace: comprehensiveResults.reduce(
              (sum, r) => sum + r.freedSpace,
              0
            ),
          };
          break;
        case "custom":
          // Handle custom cleanup with multiple parameters
          const customDays = parseInt(params.days || "90");
          result = await cleanupOldFiles(customDays);
          break;
        default:
          throw new Error(`Unknown cleanup type: ${type}`);
      }

      // Update operation status
      setOperations((prev) =>
        prev.map((op) =>
          op.id === operationId
            ? {
                ...op,
                status: result.success ? "completed" : "error",
                progress: 100,
                deletedCount: result.deletedFiles || 0,
                freedSpace: result.freedSpace || 0,
                endTime: new Date(),
                error: result.success
                  ? undefined
                  : result.errors?.[0] || "Unknown error",
              }
            : op
        )
      );

      if (result.success) {
        toast({
          title: "Cleanup Completed",
          description: `Deleted ${
            result.deletedFiles
          } files, freed ${apiFormatBytes(result.freedSpace)}`,
        });

        // Refresh stats after cleanup
        setTimeout(() => loadCleanupStats(), 1000);
      } else {
        throw new Error(result.errors?.[0] || "Cleanup operation failed");
      }
    } catch (error) {
      console.error("Cleanup error:", error);
      setOperations((prev) =>
        prev.map((op) =>
          op.id === operationId
            ? {
                ...op,
                status: "error",
                progress: 100,
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
    loadCleanupStats();
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
                  {apiFormatBytes(stats.totalCleanupPotential.size)} available
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
                      {apiFormatBytes(stats.orphanedFiles.totalSize)}
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
                      {apiFormatBytes(
                        stats.oldFiles.older_than_90_days.totalSize
                      )}
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
                      {apiFormatBytes(stats.duplicates.totalSize)}
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
                      {apiFormatBytes(stats.large_files.over_50mb.totalSize)}
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
                                {apiFormatBytes(operation.freedSpace)}
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
              onClick={loadCleanupStats}
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
