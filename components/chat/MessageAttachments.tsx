"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Image,
  File,
  Download,
  Eye,
  ExternalLink,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FilePreview } from "./FilePreview";

interface MessageAttachment {
  type: "image" | "pdf" | "text";
  url: string;
  filename: string;
  size: number;
  extractedText?: string;
  thumbnailUrl?: string;
  metadata?: {
    width?: number;
    height?: number;
    pages?: number;
    wordCount?: number;
  };
}

interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
  isUser?: boolean;
  className?: string;
}

export function MessageAttachments({
  attachments,
  isUser = false,
  className = "",
}: MessageAttachmentsProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewFileIndex, setPreviewFileIndex] = useState(0);

  if (!attachments || attachments.length === 0) {
    return null;
  }

  const getFileIcon = (type: string) => {
    if (type === "image") return Image;
    if (type === "pdf") return FileText;
    return File;
  };

  const getFileTypeColor = (type: string) => {
    if (type === "image") return "emerald";
    if (type === "pdf") return "red";
    return "blue";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const previewFiles = attachments.map((att, index) => ({
    id: `msg-att-${index}`,
    name: att.filename,
    originalFilename: att.filename,
    size: att.size,
    type: att.type === "pdf" ? "application/pdf" : `${att.type}/*`,
    url: att.url,
    extractedText: att.extractedText,
    thumbnailUrl: att.thumbnailUrl,
    category: att.type,
    metadata: att.metadata,
  }));

  return (
    <>
      <div className={`mt-3 space-y-2 ${className}`}>
        {attachments.map((attachment, index) => {
          const FileIcon = getFileIcon(attachment.type);
          const colorClass = getFileTypeColor(attachment.type);

          return (
            <Card
              key={index}
              className={`${
                isUser
                  ? "bg-emerald-700/30 border-emerald-500/30 hover:bg-emerald-700/40"
                  : "bg-slate-700/50 border-slate-600/50 hover:bg-slate-700/70"
              } backdrop-blur-sm transition-all duration-200 cursor-pointer group`}
              onClick={() => {
                setPreviewFileIndex(index);
                setShowPreview(true);
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-center space-x-3">
                  {/* Enhanced File Preview/Icon */}
                  <div
                    className={`w-12 h-12 bg-${colorClass}-600/20 rounded-lg flex items-center justify-center flex-shrink-0 border border-${colorClass}-500/30 group-hover:border-${colorClass}-400/50 transition-colors`}
                  >
                    {attachment.thumbnailUrl ? (
                      <div className="relative w-full h-full">
                        <img
                          src={attachment.thumbnailUrl}
                          alt={attachment.filename}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded-lg flex items-center justify-center">
                          <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <FileIcon
                          className={`h-5 w-5 text-${colorClass}-400 group-hover:text-${colorClass}-300 transition-colors`}
                        />
                        <Eye className="h-3 w-3 text-white absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>

                  {/* Enhanced File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-white group-hover:text-slate-100 transition-colors">
                          {attachment.filename}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-slate-400">
                            {formatFileSize(attachment.size)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs border-${colorClass}-500 text-${colorClass}-400 group-hover:border-${colorClass}-400 group-hover:text-${colorClass}-300 transition-colors`}
                          >
                            {attachment.type.toUpperCase()}
                          </Badge>
                          {/* Metadata inline */}
                          {attachment.metadata && (
                            <>
                              {attachment.metadata.pages && (
                                <span className="text-xs text-slate-500">
                                  • {attachment.metadata.pages} pages
                                </span>
                              )}
                              {attachment.metadata.width &&
                                attachment.metadata.height && (
                                  <span className="text-xs text-slate-500">
                                    • {attachment.metadata.width}×
                                    {attachment.metadata.height}
                                  </span>
                                )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action buttons - only show on hover */}
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-white/10"
                              onClick={(e) => {
                                e.stopPropagation();
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
                              className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-white/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(attachment.url, "_blank");
                              }}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Open in new tab</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Click hint */}
                <div className="mt-2 text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to preview •{" "}
                  {attachment.type === "image"
                    ? "Image"
                    : attachment.type === "pdf"
                    ? "PDF Document"
                    : "Text File"}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* File Preview Modal */}
      <FilePreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        files={previewFiles}
        initialFileIndex={previewFileIndex}
      />
    </>
  );
}
