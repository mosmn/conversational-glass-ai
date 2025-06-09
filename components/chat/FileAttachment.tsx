"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FilePreview } from "./FilePreview";

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
  category?: string;
  metadata?: {
    width?: number;
    height?: number;
    pages?: number;
    wordCount?: number;
    hasImages?: boolean;
  };
}

interface FileAttachmentProps {
  attachments: AttachedFile[];
  onAttachmentsChange: (attachments: AttachedFile[]) => void;
  conversationId: string;
  maxFiles?: number;
  maxSizePerFile?: number; // in MB
  acceptedTypes?: string[];
}

export function FileAttachment({
  attachments,
  onAttachmentsChange,
  conversationId,
  maxFiles = 5,
  maxSizePerFile = 10,
  acceptedTypes = ["image/*", "application/pdf", ".txt", ".md"],
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

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSizePerFile * 1024 * 1024) {
      return `File size must be less than ${maxSizePerFile}MB`;
    }

    // Check file type
    const isAccepted = acceptedTypes.some((type) => {
      if (type.startsWith(".")) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      if (type.includes("*")) {
        return file.type.startsWith(type.replace("*", ""));
      }
      return file.type === type;
    });

    if (!isAccepted) {
      return "File type not supported";
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

      if (validationError) {
        // Show error for this file
        const errorAttachment: AttachedFile = {
          id: Date.now().toString() + i,
          name: file.name,
          size: file.size,
          type: file.type,
          status: "error",
        };
        newAttachments.push(errorAttachment);
        continue;
      }

      const attachment: AttachedFile = {
        id: Date.now().toString() + i,
        name: file.name,
        size: file.size,
        type: file.type,
        status: "uploading",
        uploadProgress: 0,
      };

      // Generate preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          attachment.preview = e.target?.result as string;
          onAttachmentsChange([...attachments, ...newAttachments]);
        };
        reader.readAsDataURL(file);
      }

      newAttachments.push(attachment);

      // Start real file upload
      uploadFile(attachment, file);
    }

    onAttachmentsChange([...attachments, ...newAttachments]);
  };

  const uploadFile = async (attachment: AttachedFile, file: File) => {
    try {
      const formData = new FormData();
      formData.append(`file-${attachment.id}`, file);
      formData.append("conversationId", conversationId);
      formData.append("maxFiles", maxFiles.toString());
      formData.append("maxSizePerFile", maxSizePerFile.toString());

      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0]);
      }

      const uploadedFile = result.files[0];
      if (uploadedFile) {
        // Update attachment with upload results
        attachment.status = "uploaded";
        attachment.uploadProgress = 100;
        attachment.url = uploadedFile.url;
        attachment.extractedText = uploadedFile.extractedText;
        attachment.thumbnailUrl = uploadedFile.thumbnailUrl;
        attachment.category = uploadedFile.category;
        attachment.metadata = uploadedFile.metadata;

        // Use thumbnail URL as preview if available
        if (uploadedFile.thumbnailUrl && !attachment.preview) {
          attachment.preview = uploadedFile.thumbnailUrl;
        }

        onAttachmentsChange([...attachments]);
      }
    } catch (error) {
      console.error("Upload error:", error);
      attachment.status = "error";
      attachment.uploadProgress = 0;
      onAttachmentsChange([...attachments]);
    }
  };

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

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      {canAddMore && (
        <Card
          className={`border-dashed transition-all duration-200 cursor-pointer ${
            isDragOver
              ? "border-emerald-500 bg-emerald-600/10"
              : "border-slate-600 hover:border-slate-500 bg-slate-800/30"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="p-6 text-center">
            <Upload
              className={`h-8 w-8 mx-auto mb-3 ${
                isDragOver ? "text-emerald-400" : "text-slate-400"
              }`}
            />
            <p className="text-sm font-medium mb-1">
              {isDragOver
                ? "Drop files here"
                : "Drag files here or click to browse"}
            </p>
            <p className="text-xs text-slate-500">
              Supports images, PDFs, and text files up to {maxSizePerFile}MB
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {attachments.length}/{maxFiles} files attached
            </p>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(",")}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Attachment List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300">Attached Files</h4>
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.type);
            const colorClass = getFileTypeColor(attachment.type);

            return (
              <Card
                key={attachment.id}
                className="bg-slate-800/50 border-slate-700"
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    {/* File Preview/Icon */}
                    <div
                      className={`w-12 h-12 bg-${colorClass}-600/20 rounded-lg flex items-center justify-center flex-shrink-0`}
                    >
                      {attachment.preview ? (
                        <img
                          src={attachment.preview}
                          alt={attachment.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <FileIcon
                          className={`h-5 w-5 text-${colorClass}-400`}
                        />
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">
                          {attachment.name}
                        </p>
                        <div className="flex items-center space-x-2">
                          {attachment.status === "uploaded" && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => {
                                      const index = attachments.findIndex(
                                        (a) => a.id === attachment.id
                                      );
                                      setPreviewFileIndex(index);
                                      setShowPreview(true);
                                    }}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Preview file</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => {
                                      const link = document.createElement("a");
                                      link.href = attachment.url!;
                                      link.download = attachment.name;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Download file</p>
                                </TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeAttachment(attachment.id)}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-500">
                            {formatFileSize(attachment.size)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs border-${colorClass}-500 text-${colorClass}-400`}
                          >
                            {attachment.type.split("/")[1]?.toUpperCase() ||
                              "FILE"}
                          </Badge>
                        </div>

                        {/* Status Indicator */}
                        <div className="flex items-center space-x-1">
                          {attachment.status === "uploading" && (
                            <>
                              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                              <span className="text-xs text-yellow-400">
                                Uploading...
                              </span>
                            </>
                          )}
                          {attachment.status === "uploaded" && (
                            <>
                              <Check className="h-3 w-3 text-green-400" />
                              <span className="text-xs text-green-400">
                                Ready
                              </span>
                            </>
                          )}
                          {attachment.status === "error" && (
                            <>
                              <AlertCircle className="h-3 w-3 text-red-400" />
                              <span className="text-xs text-red-400">
                                Failed
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Upload Progress */}
                      {attachment.status === "uploading" &&
                        attachment.uploadProgress !== undefined && (
                          <Progress
                            value={attachment.uploadProgress}
                            className="h-1 mt-2"
                          />
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
