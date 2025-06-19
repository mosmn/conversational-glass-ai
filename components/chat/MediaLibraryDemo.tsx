"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";
import { MediaPickerModal } from "./MediaPickerModal";

interface SelectedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  thumbnailUrl?: string;
  extractedText?: string;
  category?: "image" | "document" | "text" | "audio" | "video";
  metadata?: {
    width?: number;
    height?: number;
    pages?: number;
    wordCount?: number;
    hasImages?: boolean;
  };
}

export function MediaLibraryDemo() {
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);

  const handleSelect = (files: SelectedFile[]) => {
    setSelectedFiles(files);
    console.log("Selected files:", files);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">
            Media Library Integration Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => setShowMediaPicker(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Open Media Library
          </Button>

          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-white font-medium">Selected Files:</h3>
              {selectedFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-slate-400 text-sm">
                        {formatFileSize(file.size)} •{" "}
                        {file.category?.toUpperCase()}
                      </p>
                    </div>
                    {file.thumbnailUrl && (
                      <img
                        src={file.thumbnailUrl}
                        alt={file.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <MediaPickerModal
        isOpen={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleSelect}
        maxFiles={5}
        allowedTypes={[
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "application/pdf",
          "text/plain",
          "text/markdown",
          "text/csv",
        ]}
        currentConversationId="demo-conversation"
      />
    </div>
  );
}
