"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  History,
  Search,
  Filter,
  FileImage,
  FileText,
  File,
  Calendar,
  Download,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  RefreshCw,
  Upload,
  FolderOpen,
} from "lucide-react";

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
  metadata: any;
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

// Mock data for demonstration
const generateMockFiles = (): AttachedFile[] => [
  {
    id: "1",
    filename: "document-analysis.pdf",
    originalFilename: "AI Research Paper - Transformer Models.pdf",
    mimeType: "application/pdf",
    size: 2457600, // ~2.4MB
    category: "pdf",
    url: "/mock/files/doc1.pdf",
    thumbnailUrl: "https://via.placeholder.com/150x200/6366f1/ffffff?text=PDF",
    extractedText:
      "Abstract: This paper explores the evolution of transformer models...",
    tags: ["research", "ai", "transformers"],
    metadata: { pages: 24, author: "Dr. Smith" },
    isOrphaned: false,
    createdAt: "2024-06-08T10:30:00Z",
    updatedAt: "2024-06-08T10:30:00Z",
    accessedAt: "2024-06-09T14:22:00Z",
    conversationId: "conv-1",
    messageId: "msg-1",
    conversationTitle: "Research Discussion",
  },
  {
    id: "2",
    filename: "app-mockup.png",
    originalFilename: "Mobile App UI Mockup v3.png",
    mimeType: "image/png",
    size: 1024000, // ~1MB
    category: "image",
    url: "/mock/files/img1.png",
    thumbnailUrl: "https://via.placeholder.com/150x150/10b981/ffffff?text=IMG",
    extractedText: "",
    tags: ["design", "ui", "mobile"],
    metadata: { width: 1080, height: 1920, format: "PNG" },
    isOrphaned: false,
    createdAt: "2024-06-07T15:45:00Z",
    updatedAt: "2024-06-07T15:45:00Z",
    accessedAt: "2024-06-09T12:15:00Z",
    conversationId: "conv-2",
    messageId: "msg-2",
    conversationTitle: "Design Review",
  },
  {
    id: "3",
    filename: "meeting-notes.txt",
    originalFilename: "Team Meeting Notes - June 5.txt",
    mimeType: "text/plain",
    size: 5120, // ~5KB
    category: "text",
    url: "/mock/files/text1.txt",
    extractedText: "Meeting attendees: John, Sarah, Mike...",
    tags: ["meeting", "notes", "team"],
    metadata: { lines: 45, words: 234 },
    isOrphaned: false,
    createdAt: "2024-06-05T14:30:00Z",
    updatedAt: "2024-06-05T14:30:00Z",
    accessedAt: "2024-06-06T09:00:00Z",
    conversationId: "conv-3",
    messageId: "msg-3",
    conversationTitle: "Meeting Follow-up",
  },
  {
    id: "4",
    filename: "orphaned-image.jpg",
    originalFilename: "Untitled Screenshot.jpg",
    mimeType: "image/jpeg",
    size: 856320, // ~856KB
    category: "image",
    url: "/mock/files/img2.jpg",
    thumbnailUrl: "https://via.placeholder.com/150x150/f59e0b/ffffff?text=JPG",
    extractedText: "",
    tags: ["screenshot"],
    metadata: { width: 1920, height: 1080, format: "JPEG" },
    isOrphaned: true,
    createdAt: "2024-06-03T11:20:00Z",
    updatedAt: "2024-06-03T11:20:00Z",
    accessedAt: "2024-06-03T11:20:00Z",
    conversationId: undefined,
    messageId: undefined,
    conversationTitle: undefined,
  },
  {
    id: "5",
    filename: "large-dataset.pdf",
    originalFilename: "Complete Data Analysis Report 2024.pdf",
    mimeType: "application/pdf",
    size: 15728640, // ~15MB
    category: "pdf",
    url: "/mock/files/doc2.pdf",
    thumbnailUrl: "https://via.placeholder.com/150x200/ef4444/ffffff?text=PDF",
    extractedText: "Executive Summary: Our comprehensive analysis reveals...",
    tags: ["data", "analysis", "report", "2024"],
    metadata: { pages: 156, author: "Analytics Team" },
    isOrphaned: false,
    createdAt: "2024-06-01T09:15:00Z",
    updatedAt: "2024-06-01T09:15:00Z",
    accessedAt: "2024-06-08T16:30:00Z",
    conversationId: "conv-4",
    messageId: "msg-4",
    conversationTitle: "Data Review Session",
  },
];

export function AttachmentHistorySection() {
  const { toast } = useToast();
  const [data, setData] = useState<FileHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showOrphaned, setShowOrphaned] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchFileHistory = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Generate mock data with applied filters
      let mockFiles = generateMockFiles();

      // Apply search filter
      if (searchQuery.trim()) {
        mockFiles = mockFiles.filter(
          (file) =>
            file.originalFilename
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            file.tags.some((tag) =>
              tag.toLowerCase().includes(searchQuery.toLowerCase())
            )
        );
      }

      // Apply category filter
      if (categoryFilter !== "all") {
        mockFiles = mockFiles.filter(
          (file) => file.category === categoryFilter
        );
      }

      // Apply orphaned filter
      if (!showOrphaned) {
        mockFiles = mockFiles.filter((file) => !file.isOrphaned);
      }

      // Apply sorting
      mockFiles.sort((a, b) => {
        let aValue, bValue;
        switch (sortBy) {
          case "name":
            aValue = a.originalFilename.toLowerCase();
            bValue = b.originalFilename.toLowerCase();
            break;
          case "size":
            aValue = a.size;
            bValue = b.size;
            break;
          case "accessed":
            aValue = new Date(a.accessedAt).getTime();
            bValue = new Date(b.accessedAt).getTime();
            break;
          default: // created
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
        }

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortOrder === "desc"
            ? bValue.localeCompare(aValue)
            : aValue.localeCompare(bValue);
        } else {
          return sortOrder === "desc"
            ? (bValue as number) - (aValue as number)
            : (aValue as number) - (bValue as number);
        }
      });

      // Apply pagination
      const limit = 12;
      const total = mockFiles.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (currentPage - 1) * limit;
      const paginatedFiles = mockFiles.slice(offset, offset + limit);

      setData({
        files: paginatedFiles,
        pagination: {
          page: currentPage,
          limit,
          total,
          totalPages,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
        },
        filters: {
          search: searchQuery,
          category: categoryFilter,
          sortBy,
          sortOrder,
          showOrphaned,
        },
      });
    } catch (error) {
      console.error("Error fetching file history:", error);
      // For development: show empty state if API fails
      setData({
        files: [],
        pagination: {
          page: 1,
          limit: 12,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
        filters: {
          search: searchQuery,
          category: categoryFilter,
          sortBy,
          sortOrder,
          showOrphaned,
        },
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      toast({
        title: "File Deleted",
        description: "File has been successfully deleted",
      });
      fetchFileHistory(true);
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const downloadFile = async (file: AttachedFile) => {
    try {
      // Simulate download
      toast({
        title: "Download Started",
        description: `Downloading ${file.originalFilename}`,
      });
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
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

  useEffect(() => {
    fetchFileHistory();
  }, [
    currentPage,
    searchQuery,
    categoryFilter,
    sortBy,
    sortOrder,
    showOrphaned,
  ]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (isLoading && !data) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 to-cyan-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-teal-500/20 rounded-xl">
                <History className="h-5 w-5 text-teal-400" />
              </div>
              <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Attachment History
              </span>
            </CardTitle>
            <CardDescription className="text-slate-400 leading-relaxed">
              Browse and manage your uploaded files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-full h-10 bg-slate-700 rounded-xl"></div>
                <div className="w-32 h-10 bg-slate-700 rounded-xl"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-full h-40 bg-slate-700 rounded-xl"
                  ></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative group"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 to-cyan-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />

      <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-teal-500/10 transition-all duration-500 hover:border-teal-500/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-white">
            <motion.div
              className="p-2 bg-teal-500/20 rounded-xl"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <History className="h-5 w-5 text-teal-400" />
            </motion.div>
            <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              Attachment History
            </span>
            {isRefreshing && (
              <RefreshCw className="h-4 w-4 text-teal-400 animate-spin" />
            )}
          </CardTitle>
          <CardDescription className="text-slate-400 leading-relaxed">
            Browse and manage your uploaded files
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
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

                <Button
                  variant={showOrphaned ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOrphaned(!showOrphaned)}
                  className={
                    showOrphaned
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/50 hover:bg-amber-500/30"
                      : "border-slate-600 text-slate-300 hover:bg-slate-800"
                  }
                >
                  {showOrphaned ? "Hide" : "Show"} Orphaned
                </Button>

                <div className="flex items-center gap-1 border border-slate-700/50 rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={`p-2 ${
                      viewMode === "grid"
                        ? "bg-teal-500/20 text-teal-400"
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
                        ? "bg-teal-500/20 text-teal-400"
                        : "text-slate-400"
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Results Info */}
            {data && (
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>
                  Showing {data.files.length} of {data.pagination.total} files
                  {searchQuery && ` for "${searchQuery}"`}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchFileHistory(true)}
                  className="text-slate-400 hover:text-teal-400"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            )}
          </div>

          {/* File Grid */}
          {data && data.files.length > 0 ? (
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

                  return (
                    <motion.div
                      key={file.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="group"
                    >
                      <Card className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 group-hover:shadow-lg overflow-hidden">
                        <CardContent className="p-4">
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
                                <div className="relative w-full h-full">
                                  <img
                                    src={file.thumbnailUrl}
                                    alt={file.originalFilename}
                                    className="w-full h-full object-cover rounded-xl"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded-xl flex items-center justify-center">
                                    <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
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
                                  {file.isOrphaned && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs border-amber-500 text-amber-400"
                                    >
                                      Orphaned
                                    </Badge>
                                  )}
                                  {file.tags.slice(0, 2).map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className="text-xs border-slate-600 text-slate-400"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
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

                              {/* Action Buttons */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadFile(file)}
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-teal-400"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteFile(file.id)}
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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
                  : "No files uploaded yet"}
              </h3>
              <p className="text-sm">
                {searchQuery
                  ? "Try adjusting your search or filters"
                  : "Upload files in your conversations to see them here"}
              </p>
            </div>
          )}

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-slate-700/50">
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
        </CardContent>
      </Card>
    </motion.div>
  );
}
