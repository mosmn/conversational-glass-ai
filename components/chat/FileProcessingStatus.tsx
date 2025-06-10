"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  Eye,
  FileText,
  Zap,
  Sparkles,
  Info,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileProcessingStep {
  id: string;
  name: string;
  status: "pending" | "processing" | "complete" | "error" | "skipped";
  description: string;
  duration?: number;
  details?: string;
  progress?: number;
}

export interface FileProcessingStatusData {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  overallStatus:
    | "uploading"
    | "processing"
    | "complete"
    | "error"
    | "optimizing";
  overallProgress: number;
  steps: FileProcessingStep[];
  processingMethod: "vision" | "textExtraction" | "native" | "fallback";
  modelCompatibility: {
    compatible: boolean;
    modelName: string;
    limitations?: string[];
    recommendations?: string[];
  };
  estimatedTime?: number;
  warnings?: string[];
  errors?: string[];
}

interface FileProcessingStatusProps {
  files: FileProcessingStatusData[];
  onRetry?: (fileId: string) => void;
  onOptimize?: (fileId: string) => void;
  className?: string;
}

export function FileProcessingStatus({
  files,
  onRetry,
  onOptimize,
  className,
}: FileProcessingStatusProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const toggleExpanded = (fileId: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(fileId)) {
      newExpanded.delete(fileId);
    } else {
      newExpanded.add(fileId);
    }
    setExpandedFiles(newExpanded);
  };

  const getStatusIcon = (status: FileProcessingStatusData["overallStatus"]) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />;
      case "optimizing":
        return <Zap className="h-4 w-4 text-purple-400 animate-pulse" />;
      case "complete":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-400" />;
    }
  };

  const getStatusColor = (
    status: FileProcessingStatusData["overallStatus"]
  ) => {
    switch (status) {
      case "uploading":
        return "border-blue-500/50 bg-blue-500/10";
      case "processing":
        return "border-yellow-500/50 bg-yellow-500/10";
      case "optimizing":
        return "border-purple-500/50 bg-purple-500/10";
      case "complete":
        return "border-green-500/50 bg-green-500/10";
      case "error":
        return "border-red-500/50 bg-red-500/10";
    }
  };

  const getProcessingMethodIcon = (
    method: FileProcessingStatusData["processingMethod"]
  ) => {
    switch (method) {
      case "vision":
        return <Eye className="h-3 w-3 text-purple-400" />;
      case "textExtraction":
        return <FileText className="h-3 w-3 text-blue-400" />;
      case "native":
        return <Sparkles className="h-3 w-3 text-green-400" />;
      case "fallback":
        return <AlertTriangle className="h-3 w-3 text-yellow-400" />;
    }
  };

  const getStepIcon = (status: FileProcessingStep["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-3 w-3 text-slate-400" />;
      case "processing":
        return <Loader2 className="h-3 w-3 animate-spin text-blue-400" />;
      case "complete":
        return <CheckCircle className="h-3 w-3 text-green-400" />;
      case "error":
        return <AlertCircle className="h-3 w-3 text-red-400" />;
      case "skipped":
        return <ArrowRight className="h-3 w-3 text-slate-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatEstimatedTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  if (files.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      {files.map((file) => (
        <Card
          key={file.fileId}
          className={cn(
            "transition-all duration-200",
            getStatusColor(file.overallStatus)
          )}
        >
          <CardContent className="p-4">
            {/* File Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getStatusIcon(file.overallStatus)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-white truncate">
                      {file.fileName}
                    </p>
                    <Badge
                      variant="outline"
                      className="text-xs border-slate-600"
                    >
                      {formatFileSize(file.fileSize)}
                    </Badge>
                    <div className="flex items-center space-x-1">
                      {getProcessingMethodIcon(file.processingMethod)}
                      <span className="text-xs text-slate-400 capitalize">
                        {file.processingMethod}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {file.fileType} • {file.modelCompatibility.modelName}
                    {file.estimatedTime && (
                      <> • ETA: {formatEstimatedTime(file.estimatedTime)}</>
                    )}
                  </p>
                </div>
              </div>

              <button
                onClick={() => toggleExpanded(file.fileId)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <Info className="h-4 w-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <Progress value={file.overallProgress} className="h-2 mb-3" />

            {/* Status Description */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">
                {file.overallStatus === "uploading" && "Uploading file..."}
                {file.overallStatus === "processing" && "Processing file..."}
                {file.overallStatus === "optimizing" &&
                  "Optimizing for model..."}
                {file.overallStatus === "complete" && "Ready for AI processing"}
                {file.overallStatus === "error" && "Processing failed"}
              </span>
              <span className="text-slate-500">{file.overallProgress}%</span>
            </div>

            {/* Model Compatibility */}
            {!file.modelCompatibility.compatible && (
              <Alert className="mt-3 border-yellow-500/50 bg-yellow-500/10">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-200 text-xs">
                  Limited compatibility with {file.modelCompatibility.modelName}
                  .
                  {file.modelCompatibility.limitations && (
                    <span className="block mt-1">
                      {file.modelCompatibility.limitations.join(", ")}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {file.warnings && file.warnings.length > 0 && (
              <Alert className="mt-3 border-amber-500/50 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-200 text-xs">
                  {file.warnings.join(". ")}
                </AlertDescription>
              </Alert>
            )}

            {/* Errors */}
            {file.errors && file.errors.length > 0 && (
              <Alert className="mt-3 border-red-500/50 bg-red-500/10">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-200 text-xs">
                  {file.errors.join(". ")}
                  {onRetry && (
                    <button
                      onClick={() => onRetry(file.fileId)}
                      className="ml-2 underline hover:no-underline"
                    >
                      Retry
                    </button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Expanded Details */}
            {expandedFiles.has(file.fileId) && (
              <div className="mt-4 pt-3 border-t border-slate-700/50">
                <h4 className="text-sm font-medium text-white mb-3">
                  Processing Steps
                </h4>
                <div className="space-y-2">
                  {file.steps.map((step, index) => (
                    <div key={step.id} className="flex items-center space-x-3">
                      {getStepIcon(step.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-slate-300">
                            {step.name}
                          </p>
                          {step.duration && (
                            <span className="text-xs text-slate-500">
                              {step.duration}ms
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {step.description}
                        </p>
                        {step.details && (
                          <p className="text-xs text-slate-600 mt-0.5">
                            {step.details}
                          </p>
                        )}
                        {step.progress !== undefined &&
                          step.status === "processing" && (
                            <Progress
                              value={step.progress}
                              className="h-1 mt-1"
                            />
                          )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Model Recommendations */}
                {file.modelCompatibility.recommendations &&
                  file.modelCompatibility.recommendations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-700/50">
                      <h4 className="text-sm font-medium text-white mb-2">
                        Recommendations
                      </h4>
                      <ul className="space-y-1">
                        {file.modelCompatibility.recommendations.map(
                          (rec, index) => (
                            <li
                              key={index}
                              className="text-xs text-blue-300 flex items-start space-x-2"
                            >
                              <Sparkles className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{rec}</span>
                            </li>
                          )
                        )}
                      </ul>
                      {onOptimize && (
                        <button
                          onClick={() => onOptimize(file.fileId)}
                          className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                        >
                          Optimize for better compatibility
                        </button>
                      )}
                    </div>
                  )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Hook for managing file processing status
 */
export function useFileProcessingStatus() {
  const [statusData, setStatusData] = useState<FileProcessingStatusData[]>([]);

  const addFile = (
    fileData: Omit<FileProcessingStatusData, "steps" | "overallProgress">
  ) => {
    const defaultSteps: FileProcessingStep[] = [
      {
        id: "upload",
        name: "Upload",
        status: "processing",
        description: "Uploading file to server",
        progress: 0,
      },
      {
        id: "validate",
        name: "Validate",
        status: "pending",
        description: "Validating file type and size",
      },
      {
        id: "process",
        name: "Process",
        status: "pending",
        description: "Extracting content and metadata",
      },
      {
        id: "optimize",
        name: "Optimize",
        status: "pending",
        description: "Optimizing for selected model",
      },
    ];

    setStatusData((prev) => [
      ...prev,
      {
        ...fileData,
        steps: defaultSteps,
        overallProgress: 0,
      },
    ]);
  };

  const updateFileStatus = (
    fileId: string,
    updates: Partial<FileProcessingStatusData>
  ) => {
    setStatusData((prev) =>
      prev.map((file) =>
        file.fileId === fileId ? { ...file, ...updates } : file
      )
    );
  };

  const updateStepStatus = (
    fileId: string,
    stepId: string,
    updates: Partial<FileProcessingStep>
  ) => {
    setStatusData((prev) =>
      prev.map((file) =>
        file.fileId === fileId
          ? {
              ...file,
              steps: file.steps.map((step) =>
                step.id === stepId ? { ...step, ...updates } : step
              ),
            }
          : file
      )
    );
  };

  const removeFile = (fileId: string) => {
    setStatusData((prev) => prev.filter((file) => file.fileId !== fileId));
  };

  const clearAll = () => {
    setStatusData([]);
  };

  return {
    statusData,
    addFile,
    updateFileStatus,
    updateStepStatus,
    removeFile,
    clearAll,
  };
}
