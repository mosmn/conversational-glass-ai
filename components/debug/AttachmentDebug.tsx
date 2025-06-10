"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, AlertCircle, CheckCircle, FileText } from "lucide-react";

interface AttachmentDebugProps {
  message?: {
    id: string;
    role: string;
    content: string;
    metadata?: {
      attachments?: Array<{
        type: string;
        url: string;
        filename: string;
        size: number;
      }>;
    };
  };
  attachments?: Array<{
    id: string;
    name: string;
    size: number;
    type: string;
    status: string;
    url?: string;
    category?: string;
  }>;
  selectedModel?: string;
}

export function AttachmentDebug({
  message,
  attachments,
  selectedModel,
}: AttachmentDebugProps) {
  if (!message && !attachments) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 mt-4">
      <CardHeader>
        <CardTitle className="text-yellow-800 dark:text-yellow-200 flex items-center text-sm">
          <AlertCircle className="h-4 w-4 mr-2" />
          Attachment Debug Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Model Info */}
        <div>
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Current Model
          </h4>
          <Badge
            variant="outline"
            className="border-yellow-600 text-yellow-700 dark:text-yellow-300"
          >
            {selectedModel || "No model selected"}
          </Badge>
        </div>

        {/* Current Attachments (File Upload) */}
        {attachments && attachments.length > 0 && (
          <div>
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              Current Upload Attachments ({attachments.length})
            </h4>
            <div className="space-y-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded border"
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-mono text-xs">{att.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {att.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                    <span>{formatBytes(att.size)}</span>
                    <span>{att.type}</span>
                    {att.status === "uploaded" && att.url && (
                      <Button size="sm" variant="ghost" className="h-6 p-1">
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Attachments */}
        {message &&
          message.metadata?.attachments &&
          message.metadata.attachments.length > 0 && (
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                Message Attachments ({message.metadata.attachments.length})
              </h4>
              <div className="space-y-2">
                {message.metadata.attachments.map((att, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded border"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-mono text-xs">{att.filename}</span>
                      <Badge variant="secondary" className="text-xs">
                        {att.type}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                      <span>{formatBytes(att.size)}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 p-1"
                        onClick={() => window.open(att.url, "_blank")}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Message Metadata */}
        {message && (
          <div>
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              Message Metadata
            </h4>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-32">
              {JSON.stringify(message.metadata, null, 2)}
            </pre>
          </div>
        )}

        {/* Raw Data */}
        <details className="cursor-pointer">
          <summary className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Raw Debug Data
          </summary>
          <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-48 mt-2">
            {JSON.stringify({ message, attachments, selectedModel }, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
}
