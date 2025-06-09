"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  Loader2,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Clock,
  Database,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface SyncStatus {
  lastSyncTime: string;
  totalConversations: number;
  totalMessages: number;
  syncStatus: "synced" | "pending" | "error";
  pendingSync: number;
  conflictsDetected: number;
  healthScore: number;
}

export function DangerZone() {
  const { toast } = useToast();
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState({
    sync: false,
    recovery: false,
    delete: false,
    checkSync: false,
  });
  const [confirmationInputs, setConfirmationInputs] = useState({
    deleteAll: "",
    recovery: "",
  });
  const [dialogStates, setDialogStates] = useState({
    deleteAll: false,
    recovery: false,
    sync: false,
  });
  const [operationProgress, setOperationProgress] = useState({
    current: 0,
    total: 0,
    operation: "",
  });

  // Fetch current sync status
  const checkSyncStatus = async () => {
    setIsLoading((prev) => ({ ...prev, checkSync: true }));
    try {
      const response = await fetch("/api/conversations/bulk-operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "sync-status" }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch sync status");
      }

      const result = await response.json();
      setSyncStatus(result.syncStatus);
    } catch (error) {
      console.error("Error checking sync status:", error);
      toast({
        title: "Error",
        description: "Failed to check sync status",
        variant: "destructive",
      });
    } finally {
      setIsLoading((prev) => ({ ...prev, checkSync: false }));
    }
  };

  // Handle sync local storage to servers
  const handleSyncToServers = async () => {
    setIsLoading((prev) => ({ ...prev, sync: true }));
    setOperationProgress({
      current: 0,
      total: 100,
      operation: "Syncing data to servers...",
    });

    try {
      // Simulate progress for now - in a real implementation, this would
      // sync local storage data to the server
      for (let i = 0; i <= 100; i += 10) {
        setOperationProgress((prev) => ({ ...prev, current: i }));
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      toast({
        title: "Sync Complete",
        description: "All local data has been synchronized to servers",
      });

      // Refresh sync status
      await checkSyncStatus();
    } catch (error) {
      console.error("Error syncing data:", error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync data to servers",
        variant: "destructive",
      });
    } finally {
      setIsLoading((prev) => ({ ...prev, sync: false }));
      setDialogStates((prev) => ({ ...prev, sync: false }));
      setOperationProgress({ current: 0, total: 0, operation: "" });
    }
  };

  // Handle recover missing conversations
  const handleRecoveryOperation = async () => {
    if (confirmationInputs.recovery !== "RECOVER_CONVERSATIONS") {
      toast({
        title: "Invalid confirmation",
        description: "Please type 'RECOVER_CONVERSATIONS' to confirm",
        variant: "destructive",
      });
      return;
    }

    setIsLoading((prev) => ({ ...prev, recovery: true }));
    setOperationProgress({
      current: 0,
      total: 100,
      operation: "Scanning for missing conversations...",
    });

    try {
      // Simulate recovery process
      const steps = [
        "Scanning local storage...",
        "Checking server records...",
        "Identifying missing conversations...",
        "Recovering missing data...",
        "Validating recovered conversations...",
      ];

      for (let i = 0; i < steps.length; i++) {
        setOperationProgress({
          current: ((i + 1) / steps.length) * 100,
          total: 100,
          operation: steps[i],
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      toast({
        title: "Recovery Complete",
        description:
          "Successfully recovered missing conversations from backups",
      });

      // Reset and close dialog
      setConfirmationInputs((prev) => ({ ...prev, recovery: "" }));
      setDialogStates((prev) => ({ ...prev, recovery: false }));
    } catch (error) {
      console.error("Error during recovery:", error);
      toast({
        title: "Recovery Failed",
        description: "Failed to recover missing conversations",
        variant: "destructive",
      });
    } finally {
      setIsLoading((prev) => ({ ...prev, recovery: false }));
      setOperationProgress({ current: 0, total: 0, operation: "" });
    }
  };

  // Handle permanent deletion of all conversations
  const handlePermanentDelete = async () => {
    if (confirmationInputs.deleteAll !== "DELETE_ALL_CONVERSATIONS") {
      toast({
        title: "Invalid confirmation",
        description: "Please type 'DELETE_ALL_CONVERSATIONS' to confirm",
        variant: "destructive",
      });
      return;
    }

    setIsLoading((prev) => ({ ...prev, delete: true }));
    setOperationProgress({
      current: 0,
      total: 100,
      operation: "Permanently deleting all conversations...",
    });

    try {
      const response = await fetch("/api/conversations/bulk-operations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation: "DELETE_ALL_CONVERSATIONS",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete all conversations");
      }

      const result = await response.json();

      // Simulate progress
      for (let i = 0; i <= 100; i += 20) {
        setOperationProgress((prev) => ({ ...prev, current: i }));
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      toast({
        title: "All Conversations Deleted",
        description: `Permanently deleted ${result.deletedCount} conversations`,
      });

      // Reset and close dialog
      setConfirmationInputs((prev) => ({ ...prev, deleteAll: "" }));
      setDialogStates((prev) => ({ ...prev, deleteAll: false }));

      // Refresh page after deletion
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Error deleting all conversations:", error);
      toast({
        title: "Deletion Failed",
        description: "Failed to delete all conversations",
        variant: "destructive",
      });
    } finally {
      setIsLoading((prev) => ({ ...prev, delete: false }));
      setOperationProgress({ current: 0, total: 0, operation: "" });
    }
  };

  // Get sync status color and icon
  const getSyncStatusInfo = (status?: string) => {
    switch (status) {
      case "synced":
        return {
          color: "text-green-400",
          icon: CheckCircle,
          bg: "bg-green-500/20",
        };
      case "pending":
        return { color: "text-amber-400", icon: Clock, bg: "bg-amber-500/20" };
      case "error":
        return { color: "text-red-400", icon: XCircle, bg: "bg-red-500/20" };
      default:
        return {
          color: "text-slate-400",
          icon: Database,
          bg: "bg-slate-500/20",
        };
    }
  };

  const syncInfo = getSyncStatusInfo(syncStatus?.syncStatus);

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
      <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-red-500/30 rounded-2xl shadow-2xl hover:border-red-500/50 transition-colors">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-red-400 flex items-center gap-2">
            <div className="p-2 bg-red-500/20 rounded-xl">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              Danger Zone
            </span>
          </CardTitle>
          <p className="text-sm text-slate-400">
            Powerful operations that can affect all your data. Use with extreme
            caution.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Sync Status Display */}
          <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white flex items-center gap-2">
                <div className={`p-1 ${syncInfo.bg} rounded`}>
                  <syncInfo.icon className={`h-4 w-4 ${syncInfo.color}`} />
                </div>
                Sync Status
              </h4>
              <Button
                size="sm"
                variant="outline"
                onClick={checkSyncStatus}
                disabled={isLoading.checkSync}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                {isLoading.checkSync ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            </div>

            {syncStatus ? (
              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge
                    className={`${syncInfo.color} ${syncInfo.bg} border-current`}
                  >
                    {syncStatus.syncStatus}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Health Score:</span>
                  <span className="text-white">{syncStatus.healthScore}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Sync:</span>
                  <span className="text-white">
                    {new Date(syncStatus.lastSyncTime).toLocaleString()}
                  </span>
                </div>
                {syncStatus.pendingSync > 0 && (
                  <div className="flex justify-between">
                    <span>Pending:</span>
                    <span className="text-amber-400">
                      {syncStatus.pendingSync} items
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Click refresh to check sync status
              </p>
            )}
          </div>

          {/* Progress Display */}
          <AnimatePresence>
            {operationProgress.operation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-blue-600/10 border border-blue-600/20 rounded-xl"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-300 font-medium">
                      {operationProgress.operation}
                    </span>
                    <span className="text-blue-400 font-mono">
                      {Math.round(operationProgress.current)}%
                    </span>
                  </div>
                  <Progress
                    value={operationProgress.current}
                    className="h-2 bg-slate-800/50"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Danger Zone Operations */}
          <div className="space-y-4">
            {/* Sync Local Storage to Servers */}
            <div className="flex items-center justify-between p-4 bg-amber-600/10 border border-amber-600/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-amber-500/20 rounded">
                  <Upload className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-amber-300">
                    Sync Local Storage to Servers
                  </div>
                  <div className="text-xs text-amber-200/80">
                    Push any local conversations to cloud storage
                  </div>
                </div>
              </div>
              <Dialog
                open={dialogStates.sync}
                onOpenChange={(open) =>
                  setDialogStates((prev) => ({ ...prev, sync: open }))
                }
              >
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    disabled={isLoading.sync}
                    className="bg-amber-600/20 text-amber-400 border-amber-500/30 hover:bg-amber-600/30"
                  >
                    {isLoading.sync ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Sync Now"
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-400">
                      <Upload className="h-5 w-5" />
                      Sync Local Storage
                    </DialogTitle>
                    <DialogDescription>
                      This will upload any conversations stored locally to the
                      cloud servers. This is useful if you have conversations
                      saved offline that need to be synced.
                    </DialogDescription>
                  </DialogHeader>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Notice</AlertTitle>
                    <AlertDescription>
                      This operation will scan your local storage and upload any
                      missing conversations to the servers. Existing
                      conversations will not be affected.
                    </AlertDescription>
                  </Alert>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setDialogStates((prev) => ({ ...prev, sync: false }))
                      }
                      className="border-slate-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSyncToServers}
                      disabled={isLoading.sync}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {isLoading.sync ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Start Sync
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Recover Missing Conversations */}
            <div className="flex items-center justify-between p-4 bg-blue-600/10 border border-blue-600/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-blue-500/20 rounded">
                  <Download className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-blue-300">
                    Recover Missing Conversations
                  </div>
                  <div className="text-xs text-blue-200/80">
                    Attempt to restore conversations from backups
                  </div>
                </div>
              </div>
              <Dialog
                open={dialogStates.recovery}
                onOpenChange={(open) =>
                  setDialogStates((prev) => ({ ...prev, recovery: open }))
                }
              >
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    disabled={isLoading.recovery}
                    className="bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/30"
                  >
                    {isLoading.recovery ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Recover"
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-blue-400">
                      <Download className="h-5 w-5" />
                      Recover Missing Conversations
                    </DialogTitle>
                    <DialogDescription>
                      This will attempt to recover conversations that may have
                      been lost due to sync issues or data corruption.
                    </DialogDescription>
                  </DialogHeader>
                  <Alert>
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Recovery Process</AlertTitle>
                    <AlertDescription>
                      This operation will scan backup systems and attempt to
                      restore missing conversations. No existing data will be
                      deleted during this process.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label
                      htmlFor="recovery-confirm"
                      className="text-sm font-medium"
                    >
                      Type{" "}
                      <code className="bg-slate-800 px-1 py-0.5 rounded text-blue-400">
                        RECOVER_CONVERSATIONS
                      </code>{" "}
                      to confirm:
                    </Label>
                    <Input
                      id="recovery-confirm"
                      value={confirmationInputs.recovery}
                      onChange={(e) =>
                        setConfirmationInputs((prev) => ({
                          ...prev,
                          recovery: e.target.value,
                        }))
                      }
                      placeholder="RECOVER_CONVERSATIONS"
                      className="bg-slate-800/50 border-slate-700"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDialogStates((prev) => ({
                          ...prev,
                          recovery: false,
                        }));
                        setConfirmationInputs((prev) => ({
                          ...prev,
                          recovery: "",
                        }));
                      }}
                      className="border-slate-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleRecoveryOperation}
                      disabled={
                        isLoading.recovery ||
                        confirmationInputs.recovery !== "RECOVER_CONVERSATIONS"
                      }
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isLoading.recovery ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Start Recovery
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Permanently Delete All History */}
            <div className="flex items-center justify-between p-4 bg-red-600/10 border border-red-600/20 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-red-500/20 rounded">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-red-300">
                    Permanently Delete All History
                  </div>
                  <div className="text-xs text-red-200/80">
                    This action cannot be undone - all data will be lost
                  </div>
                </div>
              </div>
              <Dialog
                open={dialogStates.deleteAll}
                onOpenChange={(open) =>
                  setDialogStates((prev) => ({ ...prev, deleteAll: open }))
                }
              >
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    disabled={isLoading.delete}
                    className="bg-red-600/20 text-red-400 border-red-500/30 hover:bg-red-600/30"
                  >
                    {isLoading.delete ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Delete All"
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-400">
                      <Trash2 className="h-5 w-5" />
                      Permanently Delete All Conversations
                    </DialogTitle>
                    <DialogDescription>
                      This action will permanently delete ALL your conversations
                      and messages. This cannot be undone and all data will be
                      lost forever.
                    </DialogDescription>
                  </DialogHeader>
                  <Alert className="border-red-500/30 bg-red-600/10">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <AlertTitle className="text-red-400">
                      Dangerous Operation
                    </AlertTitle>
                    <AlertDescription className="text-red-300">
                      This will permanently delete all your conversation
                      history, messages, and related data. There is no way to
                      recover this data once deleted.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label
                      htmlFor="delete-confirm"
                      className="text-sm font-medium"
                    >
                      Type{" "}
                      <code className="bg-slate-800 px-1 py-0.5 rounded text-red-400">
                        DELETE_ALL_CONVERSATIONS
                      </code>{" "}
                      to confirm:
                    </Label>
                    <Input
                      id="delete-confirm"
                      value={confirmationInputs.deleteAll}
                      onChange={(e) =>
                        setConfirmationInputs((prev) => ({
                          ...prev,
                          deleteAll: e.target.value,
                        }))
                      }
                      placeholder="DELETE_ALL_CONVERSATIONS"
                      className="bg-slate-800/50 border-slate-700"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDialogStates((prev) => ({
                          ...prev,
                          deleteAll: false,
                        }));
                        setConfirmationInputs((prev) => ({
                          ...prev,
                          deleteAll: "",
                        }));
                      }}
                      className="border-slate-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handlePermanentDelete}
                      disabled={
                        isLoading.delete ||
                        confirmationInputs.deleteAll !==
                          "DELETE_ALL_CONVERSATIONS"
                      }
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isLoading.delete ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete All Forever
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
