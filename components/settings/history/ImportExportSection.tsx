"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Upload,
  FileText,
  Archive,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

export function ImportExportSection() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [exportOptions, setExportOptions] = useState({
    includeMetadata: true,
    includeTimestamps: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/conversations/bulk-operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "export-all",
          format: "json",
          includeMetadata: exportOptions.includeMetadata,
          includeTimestamps: exportOptions.includeTimestamps,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get("content-disposition");
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] || "conversation-history.json";

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Your conversation history has been exported",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = async (file: File) => {
    setIsImporting(true);
    setImportProgress(0);

    try {
      // Read file content
      const fileContent = await file.text();
      let importData;

      try {
        importData = JSON.parse(fileContent);
      } catch (error) {
        throw new Error("Invalid JSON file format");
      }

      // Start import
      const response = await fetch("/api/conversations/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Import failed");
      }

      // Show results
      const { imported, skipped, errors } = result.results;

      toast({
        title: "Import completed",
        description: `${imported} conversations imported, ${skipped} skipped${
          errors.length > 0 ? `, ${errors.length} errors` : ""
        }`,
      });

      if (errors.length > 0) {
        console.warn("Import errors:", errors);
      }

      // Trigger page refresh or data reload
      window.location.reload();
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "application/json" && !file.name.endsWith(".json")) {
        toast({
          title: "Invalid file type",
          description: "Please select a JSON file",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      handleImportFile(file);
    }
  };

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
      <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:border-purple-500/30 transition-colors">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <Archive className="h-5 w-5 text-purple-400" />
            </div>
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Import & Export
            </span>
          </CardTitle>
          <p className="text-sm text-slate-400">
            Backup your conversations or import from other sources
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Export Section */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                <Download className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Export Conversations
              </span>
            </h3>

            <div className="space-y-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-300">
                  Include metadata
                </label>
                <Switch
                  checked={exportOptions.includeMetadata}
                  onCheckedChange={(checked) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      includeMetadata: checked,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-300">
                  Include timestamps
                </label>
                <Switch
                  checked={exportOptions.includeTimestamps}
                  onCheckedChange={(checked) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      includeTimestamps: checked,
                    }))
                  }
                />
              </div>
            </div>

            <Button
              onClick={handleExportAll}
              disabled={isExporting}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-emerald-500/25 transition-all duration-200"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export All Conversations
                </>
              )}
            </Button>

            <p className="text-xs text-slate-400">
              Exports all conversations as a JSON file that can be imported
              later
            </p>
          </div>

          {/* Import Section */}
          <div className="space-y-4 pt-4 border-t border-slate-700/50">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <div className="p-1.5 bg-blue-500/20 rounded-lg">
                <Upload className="h-4 w-4 text-blue-400" />
              </div>
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Import Conversations
              </span>
            </h3>

            {isImporting && (
              <div className="space-y-2 p-4 bg-blue-600/10 border border-blue-600/20 rounded-xl">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-300 font-medium">
                    Importing conversations...
                  </span>
                  <span className="text-blue-400 font-mono">
                    {Math.round(importProgress)}%
                  </span>
                </div>
                <Progress value={importProgress} className="h-2" />
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="hidden"
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              variant="outline"
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-blue-500/50 hover:text-blue-300 transition-all duration-200"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Select JSON File to Import
                </>
              )}
            </Button>

            <div className="bg-amber-600/10 p-4 rounded-xl border border-amber-600/20">
              <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <div className="p-1 bg-amber-500/20 rounded">
                  <FileText className="h-4 w-4 text-amber-400" />
                </div>
                <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  Import Format
                </span>
              </h4>
              <div className="text-xs text-amber-200/80 space-y-1">
                <p>• JSON file exported from Conversational Glass AI</p>
                <p>• Maximum file size: 10MB</p>
                <p>• Maximum 100 conversations per import</p>
                <p>• Duplicate conversations will be skipped</p>
              </div>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative group/status"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-xl blur-sm opacity-0 group-hover/status:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center gap-2 p-3 bg-emerald-600/10 border border-emerald-600/20 rounded-xl backdrop-blur-sm">
                <div className="p-1 bg-emerald-500/20 rounded">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-emerald-300">
                    Export Ready
                  </div>
                  <div className="text-xs text-emerald-400">
                    All data available
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="relative group/status"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl blur-sm opacity-0 group-hover/status:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center gap-2 p-3 bg-blue-600/10 border border-blue-600/20 rounded-xl backdrop-blur-sm">
                <div className="p-1 bg-blue-500/20 rounded">
                  <Upload className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-blue-300">
                    Import Ready
                  </div>
                  <div className="text-xs text-blue-400">
                    JSON files supported
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
