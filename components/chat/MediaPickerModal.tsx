"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  FileImage,
  FileText,
  File,
  Calendar,
  Eye,
  FolderOpen,
  Grid3X3,
  List,
  RefreshCw,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface AttachedFile {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  category: string;
  url: string;
  thumbnailUrl?: string;
  extractedText?: string;
  tags: string[];
  metadata: {
    width?: number;
    height?: number;
    pages?: number;
    wordCount?: number;
    hasImages?: boolean;
    processingStatus?: "pending" | "completed" | "failed";
    error?: string;
    checksum?: string;
  };
  isOrphaned: boolean;
  createdAt: string;
  updatedAt: string;
  accessedAt: string;
  conversationId?: string;
  messageId?: string;
  conversationTitle?: string;
}

interface FileHistoryData {
  files: AttachedFile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters: {
    search?: string;
    category: string;
    sortBy: string;
    sortOrder: string;
    dateFrom?: string;
    dateTo?: string;
    conversationId?: string;
    showOrphaned: boolean;
  };
}

interface FileHistoryResponse {
  success: boolean;
  data: FileHistoryData;
  error?: string;
}

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

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (files: SelectedFile[]) => void;
  maxFiles?: number;
  allowedTypes?: string[];
  currentConversationId?: string;
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

export function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  maxFiles = 5,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  currentConversationId,
}: MediaPickerModalProps) {
  const { toast } = useToast();
  const [data, setData] = useState<FileHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterCurrentChat, setFilterCurrentChat] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchFileHistory = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12",
        category: categoryFilter,
        sortBy,
        sortOrder,
        showOrphaned: "false", // Don't show orphaned files in picker
      });

      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      // Apply conversation filter only if toggle is enabled and conversationId provided
      if (filterCurrentChat && currentConversationId) {
        params.append("conversationId", currentConversationId);
      }

      const response = await fetch(`/api/files/history?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: FileHistoryResponse = await response.json();

      if (result.success && result.data) {
        // Filter by allowed types
        const filteredFiles = result.data.files.filter((file) =>
          allowedTypes.includes(file.mimeType)
        );

        setData({
          ...result.data,
          files: filteredFiles,
        });
      } else {
        throw new Error(result.error || "Failed to fetch file history");
      }
    } catch (error) {
      console.error("Error fetching file history:", error);
      toast({
        title: "Error",
        description: "Failed to load file history. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (category: string) => {
    switch (category) {
      case "image":
        return FileImage;
      case "pdf":
        return FileText;
      default:
        return File;
    }
  };

  const getFileTypeColor = (category: string) => {
    switch (category) {
      case "image":
        return "emerald";
      case "pdf":
        return "red";
      default:
        return "blue";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const toggleFileSelection = (file: AttachedFile) => {
    const newSelected = new Set(selectedFiles);

    if (newSelected.has(file.id)) {
      newSelected.delete(file.id);
    } else if (newSelected.size < maxFiles) {
      newSelected.add(file.id);
    } else {
      toast({
        title: "Selection Limit Reached",
        description: `You can only select up to ${maxFiles} files.`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFiles(newSelected);
  };

  const handleSelect = () => {
    if (!data || selectedFiles.size === 0) return;

    const selected = data.files
      .filter((file) => selectedFiles.has(file.id))
      .map((file) => ({
        id: file.id,
        name: file.originalFilename,
        size: file.size,
        type: file.mimeType,
        url: file.url,
        thumbnailUrl: file.thumbnailUrl,
        extractedText: file.extractedText,
        category: file.category as "image" | "document" | "text",
        metadata: {
          width: file.metadata.width,
          height: file.metadata.height,
          pages: file.metadata.pages,
          wordCount: file.metadata.wordCount,
          hasImages: file.metadata.hasImages,
        },
      }));

    onSelect(selected);
    onClose();
    setSelectedFiles(new Set());
  };

  const handleCancel = () => {
    setSelectedFiles(new Set());
    onClose();
  };

  // Reset selections when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFiles(new Set());
      setCurrentPage(1);
      fetchFileHistory();
    }
  }, [isOpen]);

  // Fetch when filters change
  useEffect(() => {
    if (isOpen) {
      fetchFileHistory();
    }
  }, [
    currentPage,
    searchQuery,
    categoryFilter,
    sortBy,
    sortOrder,
    filterCurrentChat,
  ]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <FolderOpen className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Choose from Media Library
            </span>
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Select previously uploaded files to attach to your message.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4 flex-1 min-h-0">
          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-32 bg-slate-800/50 border-slate-700/50 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="pdf">PDFs</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={`${sortBy}-${sortOrder}`}
                  onValueChange={(value) => {
                    const [newSortBy, newSortOrder] = value.split("-");
                    setSortBy(newSortBy);
                    setSortOrder(newSortOrder);
                  }}
                >
                  <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700/50 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="created-desc">Newest First</SelectItem>
                    <SelectItem value="created-asc">Oldest First</SelectItem>
                    <SelectItem value="name-asc">Name A-Z</SelectItem>
                    <SelectItem value="name-desc">Name Z-A</SelectItem>
                    <SelectItem value="size-desc">Largest First</SelectItem>
                    <SelectItem value="size-asc">Smallest First</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1 border border-slate-700/50 rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={`p-2 ${
                      viewMode === "grid"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "text-slate-400"
                    }`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className={`p-2 ${
                      viewMode === "list"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "text-slate-400"
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                {/* Filter by current chat toggle - only if conversationId is provided */}
                {currentConversationId && (
                  <div className="flex items-center gap-2 pl-2">
                    <Switch
                      checked={filterCurrentChat}
                      onCheckedChange={(v: boolean) => {
                        setFilterCurrentChat(v);
                        setCurrentPage(1);
                      }}
                      id="filter-chat"
                      className="data-[state=checked]:bg-emerald-600"
                    />
                    <label
                      htmlFor="filter-chat"
                      className="text-xs text-slate-400 select-none"
                    >
                      This chat only
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Selection info */}
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>
                {data ? `${data.files.length} files available` : "Loading..."}
              </span>
              <div className="flex items-center gap-4">
                <span>
                  {selectedFiles.size} of {maxFiles} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchFileHistory}
                  className="text-slate-400 hover:text-emerald-400"
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      isLoading ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* File Grid */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-full h-40 bg-slate-700 rounded-xl"
                    ></div>
                  ))}
                </div>
              </div>
            ) : data && data.files.length > 0 ? (
              <div
                className={`grid gap-4 ${
                  viewMode === "grid"
                    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                    : "grid-cols-1"
                }`}
              >
                <AnimatePresence mode="popLayout">
                  {data.files.map((file, index) => {
                    const FileIcon = getFileIcon(file.category);
                    const colorClass = getFileTypeColor(file.category);
                    const isSelected = selectedFiles.has(file.id);

                    return (
                      <motion.div
                        key={file.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="group cursor-pointer"
                        onClick={() => toggleFileSelection(file)}
                      >
                        <div
                          className={`relative bg-slate-800/50 border rounded-xl p-4 transition-all duration-300 hover:shadow-lg overflow-hidden ${
                            isSelected
                              ? "border-emerald-500/70 bg-emerald-500/10 shadow-emerald-500/20"
                              : "border-slate-700/50 hover:border-slate-600/50"
                          }`}
                        >
                          {/* Selection indicator */}
                          <div
                            className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                              isSelected
                                ? "bg-emerald-500 border-emerald-400"
                                : "border-slate-600 bg-slate-800/50"
                            }`}
                          >
                            {isSelected && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>

                          <div
                            className={`flex ${
                              viewMode === "grid"
                                ? "flex-col"
                                : "flex-row items-center"
                            } gap-3`}
                          >
                            {/* File Preview/Icon */}
                            <div
                              className={`${
                                viewMode === "grid"
                                  ? "w-full h-32"
                                  : "w-16 h-16"
                              } bg-gradient-to-br from-${colorClass}-600/20 to-${colorClass}-700/30 rounded-xl flex items-center justify-center flex-shrink-0 border border-${colorClass}-500/30 relative overflow-hidden`}
                            >
                              {file.thumbnailUrl ? (
                                <img
                                  src={file.thumbnailUrl}
                                  alt={file.originalFilename}
                                  className="w-full h-full object-cover rounded-xl"
                                />
                              ) : (
                                <FileIcon
                                  className={`h-8 w-8 text-${colorClass}-400`}
                                />
                              )}
                            </div>

                            {/* File Info */}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div>
                                <h4 className="text-sm font-medium text-white truncate group-hover:text-slate-100 transition-colors">
                                  {file.originalFilename}
                                </h4>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs text-slate-400">
                                    {formatFileSize(file.size)}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs border-${colorClass}-500 text-${colorClass}-400`}
                                  >
                                    {file.category.toUpperCase()}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(file.createdAt)}</span>
                                {file.conversationTitle && (
                                  <>
                                    <span>•</span>
                                    <FolderOpen className="h-3 w-3" />
                                    <span className="truncate">
                                      {file.conversationTitle}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">
                  {searchQuery
                    ? "No matching files found"
                    : "No files available"}
                </h3>
                <p className="text-sm">
                  {searchQuery
                    ? "Try adjusting your search or filters"
                    : "Upload files in your conversations to see them here"}
                </p>
              </div>
            )}
          </ScrollArea>

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
              <div className="text-sm text-slate-400">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={!data.pagination.hasPrevPage}
                  className="border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="text-sm text-slate-400 px-2">
                  {currentPage}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  disabled={!data.pagination.hasNextPage}
                  className="border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
          <div className="text-sm text-slate-400">
            {selectedFiles.size > 0 && (
              <span>
                {selectedFiles.size} file{selectedFiles.size !== 1 ? "s" : ""}{" "}
                selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSelect}
              disabled={selectedFiles.size === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
            >
              Add {selectedFiles.size > 0 && `${selectedFiles.size} `}File
              {selectedFiles.size !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
