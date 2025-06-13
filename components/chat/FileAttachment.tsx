"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Paperclip,
  Upload,
  X,
  FileText,
  Image,
  File,
  Check,
  AlertCircle,
  Download,
  Eye,
  AlertTriangle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FilePreview } from "./FilePreview";
import { cn } from "@/lib/utils";

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadProgress?: number;
  status: "uploading" | "uploaded" | "error";
  preview?: string;
  extractedText?: string;
  thumbnailUrl?: string;
  category?: "image" | "document" | "text" | "audio" | "video";
  metadata?: {
    width?: number;
    height?: number;
    pages?: number;
    wordCount?: number;
    hasImages?: boolean;
  };
  error?: string;
}

interface FileAttachmentProps {
  attachments: AttachedFile[];
  onAttachmentsChange: (attachments: AttachedFile[]) => void;
  conversationId: string;
  maxFiles?: number;
  maxSizePerFile?: number; // in MB
  allowedTypes?: string[];
}

const DEFAULT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
];

export function FileAttachment({
  attachments,
  onAttachmentsChange,
  conversationId,
  maxFiles = 5,
  maxSizePerFile = 10,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
}: FileAttachmentProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewFileIndex, setPreviewFileIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return Image;
    if (type === "application/pdf") return FileText;
    return File;
  };

  const getFileTypeColor = (type: string) => {
    if (type.startsWith("image/")) return "emerald";
    if (type === "application/pdf") return "red";
    return "blue";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const categorizeFile = (type: string): "image" | "document" | "text" => {
    if (type.startsWith("image/")) return "image";
    if (type === "application/pdf") return "document";
    return "text";
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    const maxSize = maxSizePerFile * 1024 * 1024;
    if (file.size > maxSize) {
      return `File size must be less than ${maxSizePerFile}MB`;
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported`;
    }

    // Check total file count
    if (attachments.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed`;
    }

    return null;
  };

  const processFiles = async (files: FileList) => {
    const newAttachments: AttachedFile[] = [];

    for (
      let i = 0;
      i < files.length && attachments.length + newAttachments.length < maxFiles;
      i++
    ) {
      const file = files[i];
      const validationError = validateFile(file);

      const attachment: AttachedFile = {
        id: Date.now().toString() + i,
        name: file.name,
        size: file.size,
        type: file.type,
        status: validationError ? "error" : "uploading",
        uploadProgress: 0,
        category: categorizeFile(file.type),
        error: validationError || undefined,
      };

      // Generate preview for images
      if (file.type.startsWith("image/") && !validationError) {
        const reader = new FileReader();
        reader.onload = (e) => {
          attachment.preview = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }

      newAttachments.push(attachment);

      // Start upload if validation passed
      if (!validationError) {
        uploadFile(attachment, file);
      }
    }

    onAttachmentsChange([...attachments, ...newAttachments]);
  };

  const uploadFile = useCallback(
    async (attachment: AttachedFile, file: File) => {
      try {
        // Helper function to update attachments
        const updateAttachment = (
          updater: (a: AttachedFile) => AttachedFile
        ) => {
          const updated = attachments.map((a) =>
            a.id === attachment.id ? updater(a) : a
          );
          onAttachmentsChange(updated);
        };

        // Update progress to 25%
        updateAttachment((a) => ({ ...a, uploadProgress: 25 }));

        const formData = new FormData();
        formData.append(`file-${attachment.id}`, file);
        formData.append("conversationId", conversationId);

        // Update progress to 50%
        updateAttachment((a) => ({ ...a, uploadProgress: 50 }));

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        // Update progress to 75%
        updateAttachment((a) => ({ ...a, uploadProgress: 75 }));

        const result = await response.json();

        if (result.errors && result.errors.length > 0) {
          throw new Error(result.errors[0]);
        }

        const uploadedFile = result.files[0];
        if (uploadedFile) {
          // Update attachment with upload results
          updateAttachment((a) => ({
            ...a,
            status: "uploaded" as const,
            uploadProgress: 100,
            url: uploadedFile.url,
            extractedText: uploadedFile.extractedText,
            thumbnailUrl: uploadedFile.thumbnailUrl,
            category: uploadedFile.category,
            metadata: uploadedFile.metadata,
            preview: uploadedFile.thumbnailUrl || a.preview,
          }));
        }
      } catch (error) {
        console.error("Upload error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";

        // Update attachment with error
        const updated = attachments.map((a) =>
          a.id === attachment.id
            ? {
                ...a,
                status: "error" as const,
                uploadProgress: 0,
                error: errorMessage,
              }
            : a
        );
        onAttachmentsChange(updated);
      }
    },
    [attachments, conversationId, onAttachmentsChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFiles(files);
      }
    },
    [attachments, maxFiles]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      processFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    onAttachmentsChange(attachments.filter((att) => att.id !== id));
  };

  const canAddMore = attachments.length < maxFiles;

  const getFileTypesList = () => {
    const types = [];
    if (allowedTypes.some((t) => t.startsWith("image/"))) types.push("images");
    if (allowedTypes.includes("application/pdf")) types.push("PDFs");
    if (allowedTypes.some((t) => t.startsWith("text/")))
      types.push("text files");
    return types.join(", ");
  };

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      {canAddMore && (
        <Card
          className={cn(
            "relative border-2 border-dashed transition-all duration-300 cursor-pointer group overflow-hidden",
            "backdrop-blur-xl bg-slate-800/20 hover:bg-slate-800/40",
            isDragOver
              ? "border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/20 scale-[1.02]"
              : "border-slate-600/50 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-slate-900/20"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div
            className={cn(
              "absolute inset-0 opacity-0 transition-opacity duration-300",
              isDragOver ? "opacity-100" : "group-hover:opacity-50"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-blue-500/10" />
          </div>

          <CardContent className="relative p-8 text-center">
            <div
              className={cn(
                "transition-all duration-300",
                isDragOver ? "scale-110" : "group-hover:scale-105"
              )}
            >
              <Upload
                className={cn(
                  "h-12 w-12 mx-auto mb-4 transition-all duration-300",
                  isDragOver
                    ? "text-emerald-400 animate-bounce"
                    : "text-slate-400 group-hover:text-emerald-400"
                )}
              />
            </div>

            <div className="space-y-2">
              <p
                className={cn(
                  "text-base font-semibold transition-colors duration-300",
                  isDragOver
                    ? "text-emerald-300"
                    : "text-slate-200 group-hover:text-white"
                )}
              >
                {isDragOver
                  ? "✨ Drop files here"
                  : "📎 Drag files here or click to browse"}
              </p>

              <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                Supports {getFileTypesList()} up to {maxSizePerFile}MB each
              </p>

              <div className="flex items-center justify-center space-x-4 mt-4">
                <div className="flex items-center space-x-2">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors duration-300",
                      attachments.length > 0 ? "bg-emerald-400" : "bg-slate-500"
                    )}
                  />
                  <span className="text-xs text-slate-500">
                    {attachments.length}/{maxFiles} files
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-xs text-slate-500">
                    Up to {maxSizePerFile}MB each
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={allowedTypes.join(",")}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Attachment List */}
      {attachments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-slate-200 flex items-center space-x-2">
              <div className="w-1 h-6 bg-gradient-to-b from-emerald-400 to-blue-500 rounded-full" />
              <span>Attached Files</span>
              <div className="bg-slate-700/50 text-slate-300 text-xs px-2 py-1 rounded-full">
                {attachments.length}
              </div>
            </h4>
          </div>

          <div className="grid gap-3">
            {attachments.map((attachment, index) => {
              const FileIcon = getFileIcon(attachment.type);
              const colorClass = getFileTypeColor(attachment.type);

              return (
                <Card
                  key={attachment.id}
                  className={cn(
                    "group border backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-lg",
                    "animate-in slide-in-from-top-2 fade-in duration-300",
                    attachment.status === "error"
                      ? "bg-red-900/10 border-red-500/30 hover:border-red-400/50 shadow-red-500/10"
                      : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/50"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start space-x-4">
                      {/* File Preview/Icon */}
                      <div className="relative group/icon">
                        <div
                          className={cn(
                            "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300",
                            "backdrop-blur-sm group-hover/icon:scale-105",
                            attachment.status === "error"
                              ? "bg-red-600/20 border border-red-500/40 shadow-red-500/10"
                              : `bg-${colorClass}-600/20 border border-${colorClass}-500/40 shadow-${colorClass}-500/10`
                          )}
                        >
                          {attachment.preview ? (
                            <img
                              src={attachment.preview}
                              alt={attachment.name}
                              className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover/icon:scale-110"
                            />
                          ) : (
                            <FileIcon
                              className={cn(
                                "h-6 w-6 transition-all duration-300 group-hover/icon:scale-110",
                                attachment.status === "error"
                                  ? "text-red-400"
                                  : `text-${colorClass}-400`
                              )}
                            />
                          )}
                        </div>

                        <div
                          className={cn(
                            "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                            "backdrop-blur-sm border transition-all duration-300",
                            attachment.status === "error"
                              ? "bg-red-500 border-red-400 text-white"
                              : `bg-${colorClass}-500 border-${colorClass}-400 text-white`
                          )}
                        >
                          {attachment.type
                            .split("/")[1]
                            ?.charAt(0)
                            ?.toUpperCase() || "F"}
                        </div>
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-base font-semibold text-slate-100 truncate group-hover:text-white transition-colors duration-300">
                              {attachment.name}
                            </p>
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                                {formatFileSize(attachment.size)}
                              </span>
                              <div className="w-1 h-1 bg-slate-500 rounded-full" />
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs border-0 px-2 py-0.5 font-medium",
                                  attachment.status === "error"
                                    ? "bg-red-500/20 text-red-300"
                                    : `bg-${colorClass}-500/20 text-${colorClass}-300`
                                )}
                              >
                                {attachment.category?.toUpperCase() ||
                                  attachment.type
                                    .split("/")[1]
                                    ?.toUpperCase() ||
                                  "FILE"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 ml-4">
                            {attachment.status === "uploaded" && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 hover:bg-blue-500/20 hover:text-blue-400 transition-all duration-200 rounded-lg"
                                      onClick={() => {
                                        const index = attachments.findIndex(
                                          (a) => a.id === attachment.id
                                        );
                                        setPreviewFileIndex(index);
                                        setShowPreview(true);
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>👁️ Preview file</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all duration-200 rounded-lg"
                                      onClick={() => {
                                        if (attachment.url) {
                                          const link =
                                            document.createElement("a");
                                          link.href = attachment.url;
                                          link.download = attachment.name;
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                        }
                                      }}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>💾 Download file</p>
                                  </TooltipContent>
                                </Tooltip>
                              </>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    removeAttachment(attachment.id)
                                  }
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-all duration-200 rounded-lg"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>🗑️ Remove file</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        {/* Status Section */}
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center space-x-2">
                            {attachment.status === "uploading" && (
                              <>
                                <div className="relative">
                                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-ping absolute" />
                                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                                </div>
                                <span className="text-sm text-yellow-400 font-medium">
                                  Uploading...
                                </span>
                              </>
                            )}
                            {attachment.status === "uploaded" && (
                              <>
                                <div className="w-3 h-3 bg-emerald-400 rounded-full flex items-center justify-center">
                                  <Check className="h-2 w-2 text-slate-900" />
                                </div>
                                <span className="text-sm text-emerald-400 font-medium">
                                  ✨ Ready
                                </span>
                              </>
                            )}
                            {attachment.status === "error" && (
                              <>
                                <div className="w-3 h-3 bg-red-400 rounded-full flex items-center justify-center">
                                  <AlertCircle className="h-2 w-2 text-white" />
                                </div>
                                <span className="text-sm text-red-400 font-medium">
                                  ❌ Failed
                                </span>
                              </>
                            )}
                          </div>

                          {attachment.metadata &&
                            attachment.status === "uploaded" && (
                              <div className="text-xs text-slate-500 space-x-2">
                                {attachment.metadata.pages && (
                                  <span>
                                    📄 {attachment.metadata.pages} pages
                                  </span>
                                )}
                                {attachment.metadata.wordCount && (
                                  <span>
                                    📝 {attachment.metadata.wordCount} words
                                  </span>
                                )}
                                {attachment.metadata.width &&
                                  attachment.metadata.height && (
                                    <span>
                                      🖼️ {attachment.metadata.width}×
                                      {attachment.metadata.height}
                                    </span>
                                  )}
                              </div>
                            )}
                        </div>

                        {/* Upload Progress */}
                        {attachment.status === "uploading" &&
                          attachment.uploadProgress !== undefined && (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">
                                  Progress
                                </span>
                                <span className="text-xs text-yellow-400 font-medium">
                                  {Math.round(attachment.uploadProgress)}%
                                </span>
                              </div>
                              <div className="relative">
                                <Progress
                                  value={attachment.uploadProgress}
                                  className="h-2 bg-slate-700/50"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-emerald-400/20 to-blue-400/20 rounded-full animate-pulse" />
                              </div>
                            </div>
                          )}

                        {/* Error Message */}
                        {attachment.error && (
                          <div className="mt-3">
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 flex items-start space-x-2">
                              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">Error</p>
                                <p className="text-xs">{attachment.error}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      <FilePreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        files={attachments
          .filter((a) => a.status === "uploaded")
          .map((a) => ({
            id: a.id,
            name: a.name,
            originalFilename: a.name,
            size: a.size,
            type: a.type,
            url: a.url!,
            extractedText: a.extractedText,
            thumbnailUrl: a.thumbnailUrl,
            category: a.category,
            metadata: a.metadata,
          }))}
        initialFileIndex={previewFileIndex}
      />
    </div>
  );
}
