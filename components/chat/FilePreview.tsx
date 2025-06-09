"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Image as ImageIcon,
  File,
  ChevronLeft,
  ChevronRight,
  Search,
  Copy,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatFileSize } from "@/lib/file-processing";

interface FilePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  files: Array<{
    id: string;
    name: string;
    originalFilename: string;
    size: number;
    type: string;
    url: string;
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
  }>;
  initialFileIndex: number;
}

export function FilePreview({
  isOpen,
  onClose,
  files,
  initialFileIndex,
}: FilePreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(initialFileIndex);
  const [imageZoom, setImageZoom] = useState(100);
  const [imageRotation, setImageRotation] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  const currentFile = files[currentIndex];

  if (!currentFile) {
    return null;
  }

  const isImage = currentFile.type.startsWith("image/");
  const isPDF = currentFile.type === "application/pdf";
  const isText =
    currentFile.type.startsWith("text/") || currentFile.extractedText;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : files.length - 1));
    resetImageState();
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < files.length - 1 ? prev + 1 : 0));
    resetImageState();
  };

  const resetImageState = () => {
    setImageZoom(100);
    setImageRotation(0);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = currentFile.url;
    link.download = currentFile.originalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyText = () => {
    if (currentFile.extractedText) {
      navigator.clipboard.writeText(currentFile.extractedText);
    }
  };

  const getFileIcon = () => {
    if (isImage) return ImageIcon;
    if (isPDF) return FileText;
    return File;
  };

  const FileIcon = getFileIcon();

  const highlightSearchTerm = (text: string, term: string) => {
    if (!term) return text;

    const regex = new RegExp(`(${term})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-400/30 text-yellow-300">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] bg-slate-900/95 backdrop-blur-xl border-slate-700/50 text-white">
        <DialogHeader className="border-b border-slate-700/50 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileIcon className="h-5 w-5 text-emerald-400" />
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {currentFile.originalFilename}
                </DialogTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge
                    variant="outline"
                    className="border-emerald-500 text-emerald-400"
                  >
                    {currentFile.category ||
                      currentFile.type.split("/")[1]?.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-slate-400">
                    {formatFileSize(currentFile.size)}
                  </span>
                  {currentFile.metadata?.width &&
                    currentFile.metadata?.height && (
                      <span className="text-sm text-slate-400">
                        {currentFile.metadata.width} ×{" "}
                        {currentFile.metadata.height}
                      </span>
                    )}
                  {currentFile.metadata?.pages && (
                    <span className="text-sm text-slate-400">
                      {currentFile.metadata.pages} pages
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* File Navigation */}
              {files.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevious}
                    className="text-slate-400 hover:text-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-slate-400">
                    {currentIndex + 1} / {files.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNext}
                    className="text-slate-400 hover:text-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}

              {/* Actions */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                className="text-slate-400 hover:text-white"
              >
                <Download className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Image Preview */}
          {isImage && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageZoom(Math.max(25, imageZoom - 25))}
                    className="text-slate-400 hover:text-white"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-slate-400 min-w-[60px]">
                    {imageZoom}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageZoom(Math.min(400, imageZoom + 25))}
                    className="text-slate-400 hover:text-white"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setImageRotation((prev) => (prev + 90) % 360)
                    }
                    className="text-slate-400 hover:text-white"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetImageState}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Reset
                </Button>
              </div>
              <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                <img
                  src={currentFile.url}
                  alt={currentFile.originalFilename}
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{
                    transform: `scale(${
                      imageZoom / 100
                    }) rotate(${imageRotation}deg)`,
                  }}
                />
              </div>
            </div>
          )}

          {/* PDF Preview */}
          {isPDF && (
            <div className="h-full">
              <iframe
                src={currentFile.url}
                className="w-full h-full border-0"
                title={currentFile.originalFilename}
              />
            </div>
          )}

          {/* Text Content */}
          {isText && currentFile.extractedText && (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search in text..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  {currentFile.metadata?.wordCount && (
                    <span className="text-sm text-slate-400">
                      {currentFile.metadata.wordCount} words
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyText}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Text
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-6">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200 font-mono">
                    {highlightSearchTerm(currentFile.extractedText, searchTerm)}
                  </pre>
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Fallback for other file types */}
          {!isImage && !isPDF && !isText && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <FileIcon className="h-24 w-24 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Preview not available
                </h3>
                <p className="text-slate-400 mb-4">
                  This file type cannot be previewed in the browser.
                </p>
                <Button
                  onClick={handleDownload}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
