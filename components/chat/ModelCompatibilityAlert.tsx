"use client";

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  ArrowRight,
  FileText,
  Image,
  File,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Model } from "@/lib/api/client";

interface ModelCompatibilityAlertProps {
  currentModel: Model | null;
  newModel: Model | null;
  compatibility: {
    compatible: boolean;
    lostCapabilities: string[];
    gainedCapabilities: string[];
    warnings: string[];
    impact: "none" | "minor" | "major" | "severe";
  };
  onProceed: () => void;
  onCancel: () => void;
  className?: string;
}

export function ModelCompatibilityAlert({
  currentModel,
  newModel,
  compatibility,
  onProceed,
  onCancel,
  className,
}: ModelCompatibilityAlertProps) {
  const getImpactIcon = () => {
    switch (compatibility.impact) {
      case "severe":
        return XCircle;
      case "major":
        return AlertTriangle;
      case "minor":
        return Info;
      default:
        return CheckCircle;
    }
  };

  const getImpactColor = () => {
    switch (compatibility.impact) {
      case "severe":
        return "border-red-500/50 bg-red-500/10";
      case "major":
        return "border-orange-500/50 bg-orange-500/10";
      case "minor":
        return "border-yellow-500/50 bg-yellow-500/10";
      default:
        return "border-green-500/50 bg-green-500/10";
    }
  };

  const getImpactTextColor = () => {
    switch (compatibility.impact) {
      case "severe":
        return "text-red-400";
      case "major":
        return "text-orange-400";
      case "minor":
        return "text-yellow-400";
      default:
        return "text-green-400";
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) {
      return Image;
    }
    if (["pdf"].includes(ext || "")) {
      return FileText;
    }
    return File;
  };

  const Icon = getImpactIcon();

  if (!currentModel || !newModel || compatibility.impact === "none") {
    return null;
  }

  return (
    <Alert className={cn(getImpactColor(), className)}>
      <Icon className={cn("h-4 w-4", getImpactTextColor())} />
      <AlertDescription>
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {currentModel.name}
                </Badge>
                <ArrowRight className="h-3 w-3 text-slate-400" />
                <Badge variant="outline" className="text-xs">
                  {newModel.name}
                </Badge>
              </div>
            </div>
            <Badge
              className={cn(
                "text-xs",
                compatibility.impact === "severe"
                  ? "bg-red-600/20 text-red-400 border-red-500/30"
                  : compatibility.impact === "major"
                  ? "bg-orange-600/20 text-orange-400 border-orange-500/30"
                  : "bg-yellow-600/20 text-yellow-400 border-yellow-500/30"
              )}
            >
              {compatibility.impact.charAt(0).toUpperCase() +
                compatibility.impact.slice(1)}{" "}
              Impact
            </Badge>
          </div>

          {/* Compatibility Summary */}
          <div>
            <h4 className={cn("font-medium mb-2", getImpactTextColor())}>
              {compatibility.impact === "severe" &&
                "⚠️ File Support Will Be Lost"}
              {compatibility.impact === "major" &&
                "📄 Some Files May Not Be Supported"}
              {compatibility.impact === "minor" &&
                "ℹ️ Processing Method Changes"}
            </h4>

            {compatibility.impact === "severe" && (
              <p className="text-sm text-slate-300 mb-3">
                The new model doesn't support some of your attached files. They
                will be removed if you proceed.
              </p>
            )}
            {compatibility.impact === "major" && (
              <p className="text-sm text-slate-300 mb-3">
                Some attached files won't be properly processed by the new
                model.
              </p>
            )}
            {compatibility.impact === "minor" && (
              <p className="text-sm text-slate-300 mb-3">
                Your files will be processed differently by the new model.
              </p>
            )}
          </div>

          {/* Lost Capabilities */}
          {compatibility.lostCapabilities.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-red-400 flex items-center space-x-2">
                <XCircle className="h-3 w-3" />
                <span>Files That Will Be Removed</span>
              </h5>
              <div className="grid grid-cols-1 gap-2">
                {compatibility.lostCapabilities.map((capability, idx) => {
                  const [fileName, fileType] = capability.split(" (");
                  const cleanType = fileType?.replace(")", "") || "";
                  const FileIcon = getFileIcon(fileName);

                  return (
                    <div
                      key={idx}
                      className="flex items-center space-x-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs"
                    >
                      <FileIcon className="h-3 w-3 text-red-400 flex-shrink-0" />
                      <span className="text-red-200 flex-1 truncate">
                        {fileName}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-red-500/50 text-red-400 text-xs"
                      >
                        {cleanType}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Gained Capabilities */}
          {compatibility.gainedCapabilities.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-green-400 flex items-center space-x-2">
                <CheckCircle className="h-3 w-3" />
                <span>Files That Will Be Supported</span>
              </h5>
              <div className="grid grid-cols-1 gap-2">
                {compatibility.gainedCapabilities.map((capability, idx) => {
                  const [fileName, fileType] = capability.split(" (");
                  const cleanType = fileType?.replace(")", "") || "";
                  const FileIcon = getFileIcon(fileName);

                  return (
                    <div
                      key={idx}
                      className="flex items-center space-x-2 p-2 bg-green-900/20 border border-green-500/30 rounded text-xs"
                    >
                      <FileIcon className="h-3 w-3 text-green-400 flex-shrink-0" />
                      <span className="text-green-200 flex-1 truncate">
                        {fileName}
                      </span>
                      <Badge
                        variant="outline"
                        className="border-green-500/50 text-green-400 text-xs"
                      >
                        {cleanType}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Warnings */}
          {compatibility.warnings.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-yellow-400 flex items-center space-x-2">
                <AlertTriangle className="h-3 w-3" />
                <span>Processing Changes</span>
              </h5>
              <div className="space-y-1">
                {compatibility.warnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-2 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded text-xs"
                  >
                    <Info className="h-3 w-3 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <span className="text-yellow-200">{warning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onCancel}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onProceed}
              className={cn(
                compatibility.impact === "severe"
                  ? "bg-red-600 hover:bg-red-700"
                  : compatibility.impact === "major"
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-yellow-600 hover:bg-yellow-700"
              )}
            >
              {compatibility.impact === "severe" && "Remove Files & Switch"}
              {compatibility.impact === "major" && "Switch Anyway"}
              {compatibility.impact === "minor" && "Switch Model"}
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
