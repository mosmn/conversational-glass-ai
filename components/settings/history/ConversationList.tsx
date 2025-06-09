"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Calendar,
  MoreHorizontal,
  Trash2,
  Share2,
  ExternalLink,
  CheckSquare,
  Square,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Bot,
  User,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ConversationFilters } from "./ConversationSearch";

interface ConversationItem {
  id: string;
  title: string;
  description: string | null;
  model: string;
  isShared: boolean;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: {
    content: string;
    createdAt: string;
  };
}

interface ConversationListProps {
  filters: ConversationFilters;
  isLoading: boolean;
  onLoadingChange: (loading: boolean) => void;
}

export function ConversationList({
  filters,
  isLoading,
  onLoadingChange,
}: ConversationListProps) {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversations, setSelectedConversations] = useState<
    Set<string>
  >(new Set());
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  });
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Fetch conversations based on filters
  const fetchConversations = async (resetPagination = false) => {
    if (isLoading) return;

    onLoadingChange(true);
    try {
      const newOffset = resetPagination ? 0 : pagination.offset;

      const response = await fetch("/api/conversations/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...filters,
          dateRange: filters.dateRange
            ? {
                start: filters.dateRange.start.toISOString(),
                end: filters.dateRange.end.toISOString(),
              }
            : undefined,
          limit: pagination.limit,
          offset: newOffset,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      const result = await response.json();

      if (resetPagination) {
        setConversations(result.conversations || []);
        setSelectedConversations(new Set());
      } else {
        setConversations((prev) => [...prev, ...(result.conversations || [])]);
      }

      setPagination(result.pagination || pagination);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      onLoadingChange(false);
    }
  };

  // Effect to fetch conversations when filters change
  useEffect(() => {
    fetchConversations(true);
  }, [filters]);

  // Load more conversations
  const loadMore = () => {
    if (!pagination.hasMore || isLoading) return;
    setPagination((prev) => ({ ...prev, offset: prev.offset + prev.limit }));
    fetchConversations(false);
  };

  // Toggle conversation selection
  const toggleConversation = (conversationId: string) => {
    setSelectedConversations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  };

  // Select all conversations
  const toggleSelectAll = () => {
    if (selectedConversations.size === conversations.length) {
      setSelectedConversations(new Set());
    } else {
      setSelectedConversations(new Set(conversations.map((c) => c.id)));
    }
  };

  // Bulk delete conversations
  const handleBulkDelete = async () => {
    if (selectedConversations.size === 0) return;

    setBulkActionLoading(true);
    try {
      const response = await fetch("/api/conversations/bulk-operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: "delete",
          conversationIds: Array.from(selectedConversations),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete conversations");
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: `Deleted ${result.deletedCount} conversations`,
      });

      // Refresh the list
      await fetchConversations(true);
    } catch (error) {
      console.error("Error deleting conversations:", error);
      toast({
        title: "Error",
        description: "Failed to delete conversations",
        variant: "destructive",
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Individual conversation actions
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete conversation");
      }

      toast({
        title: "Success",
        description: "Conversation deleted",
      });

      // Remove from local state
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      setSelectedConversations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(conversationId);
        return newSet;
      });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  // Truncate text
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  // Get model color and icon
  const getModelInfo = (model: string) => {
    switch (model.toLowerCase()) {
      case "gpt-4":
      case "gpt-4-turbo":
        return {
          color: "bg-green-500/20 text-green-400 border-green-500/30",
          icon: "🧠",
        };
      case "gpt-3.5-turbo":
        return {
          color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
          icon: "⚡",
        };
      case "claude-3-sonnet":
      case "claude-3-haiku":
        return {
          color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
          icon: "🎭",
        };
      case "gemini-pro":
        return {
          color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
          icon: "💎",
        };
      default:
        return {
          color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
          icon: "🤖",
        };
    }
  };

  if (conversations.length === 0 && !isLoading) {
    return (
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-600/20 to-slate-500/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
          <CardContent className="p-12 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-800/50 flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-slate-500" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No conversations found
            </h3>
            <p className="text-slate-400 max-w-md mx-auto">
              {Object.keys(filters).some(
                (key) => filters[key as keyof ConversationFilters]
              )
                ? "Try adjusting your search filters to find conversations."
                : "Start a new conversation to see it appear here."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-slate-600/20 to-slate-500/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
      <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-slate-500/20 rounded-xl">
                <MessageSquare className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white bg-gradient-to-r from-slate-300 to-white bg-clip-text text-transparent">
                  Conversations
                </h3>
                <p className="text-sm text-slate-400">
                  {pagination.total} total conversations
                </p>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedConversations.size > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2"
              >
                <Badge
                  variant="secondary"
                  className="bg-blue-600/20 text-blue-400"
                >
                  {selectedConversations.size} selected
                </Badge>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={bulkActionLoading}
                  className="bg-red-600/20 text-red-400 border-red-500/30 hover:bg-red-600/30"
                >
                  {bulkActionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </motion.div>
            )}
          </div>

          {/* Select All Toggle */}
          {conversations.length > 0 && (
            <div className="flex items-center gap-2 pt-4 border-t border-slate-700/50">
              <Checkbox
                checked={selectedConversations.size === conversations.length}
                onCheckedChange={toggleSelectAll}
                className="border-slate-600"
              />
              <span className="text-sm text-slate-400">
                Select all conversations
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <AnimatePresence>
            {conversations.map((conversation, index) => {
              const modelInfo = getModelInfo(conversation.model);
              const isSelected = selectedConversations.has(conversation.id);

              return (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "relative group/conversation p-4 rounded-xl border transition-all duration-200",
                    isSelected
                      ? "bg-blue-600/10 border-blue-500/30"
                      : "bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-600/50"
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Selection Checkbox */}
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() =>
                        toggleConversation(conversation.id)
                      }
                      className="mt-1 border-slate-600"
                    />

                    {/* Conversation Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-white truncate">
                            {conversation.title || "Untitled Conversation"}
                          </h4>
                          {conversation.description && (
                            <p className="text-sm text-slate-400 mt-1">
                              {truncateText(conversation.description, 100)}
                            </p>
                          )}
                        </div>

                        {/* Actions Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover/conversation:opacity-100 transition-opacity h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-slate-900/95 backdrop-blur-xl border-slate-700">
                            <DropdownMenuItem
                              onClick={() =>
                                window.open(
                                  `/chat/${conversation.id}`,
                                  "_blank"
                                )
                              }
                              className="text-slate-300 hover:text-white"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open Chat
                            </DropdownMenuItem>
                            {conversation.isShared && (
                              <DropdownMenuItem className="text-slate-300 hover:text-white">
                                <Share2 className="h-4 w-4 mr-2" />
                                Share Link
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-slate-300 hover:text-white">
                              <Download className="h-4 w-4 mr-2" />
                              Export
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-700" />
                            <DropdownMenuItem
                              onClick={() =>
                                handleDeleteConversation(conversation.id)
                              }
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Metadata Row */}
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>{conversation.messageCount} messages</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(conversation.updatedAt)}</span>
                        </div>
                        <Badge
                          className={cn("text-xs border", modelInfo.color)}
                        >
                          <span className="mr-1">{modelInfo.icon}</span>
                          {conversation.model}
                        </Badge>
                        {conversation.isShared && (
                          <Badge
                            variant="secondary"
                            className="bg-blue-600/20 text-blue-400 border-blue-500/30"
                          >
                            <Share2 className="h-3 w-3 mr-1" />
                            Shared
                          </Badge>
                        )}
                      </div>

                      {/* Last Message Preview */}
                      {conversation.lastMessage && (
                        <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
                          <p className="text-sm text-slate-300 line-clamp-2">
                            {truncateText(
                              conversation.lastMessage.content,
                              150
                            )}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {formatDate(conversation.lastMessage.createdAt)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Loading State */}
          {isLoading && conversations.length > 0 && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          )}

          {/* Load More Button */}
          {!isLoading && pagination.hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={loadMore}
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Load More Conversations
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Pagination Info */}
          <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-700/50">
            Showing {conversations.length} of {pagination.total} conversations
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
