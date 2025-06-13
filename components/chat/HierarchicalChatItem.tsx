"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  GitBranch,
  ChevronRight,
  ChevronDown,
  Pin,
  Star,
  Trash2,
  ArrowUpRight,
  Zap,
  AlertTriangle,
} from "lucide-react";

interface HierarchicalChat {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  isShared: boolean;
  isBranch: boolean;
  parentConversationId?: string | null;
  branchName?: string | null;
  branchOrder?: number | null;
  branchCreatedAt?: string | null;
  metadata: any;
  hasChildren: boolean;
  branches: Array<{
    id: string;
    title: string;
    branchName: string | null;
    branchOrder: number | null;
    branchCreatedAt: string | null;
    createdAt: string;
    updatedAt: string;
    model: string;
    metadata: any;
  }>;
}

interface HierarchicalChatItemProps {
  chat: HierarchicalChat;
  isActive: boolean;
  isPinned: boolean;
  isBookmarked: boolean;
  onPin: () => void;
  onBookmark: () => void;
  onDelete: () => void;
  onNavigateToParent?: (parentId: string) => void;
}

export function HierarchicalChatItem({
  chat,
  isActive,
  isPinned,
  isBookmarked,
  onPin,
  onBookmark,
  onDelete,
  onNavigateToParent,
}: HierarchicalChatItemProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(isActive || chat.hasChildren);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleClick = () => {
    router.push(`/chat/${chat.id}`);
  };

  const handleBranchClick = (branchId: string) => {
    router.push(`/chat/${branchId}`);
  };

  const handleNavigateToParent = () => {
    if (chat.parentConversationId && onNavigateToParent) {
      onNavigateToParent(chat.parentConversationId);
    }
  };

  const handleDeleteConfirm = () => {
    setShowDeleteDialog(false);
    onDelete();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 168) return `${Math.floor(diffHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <TooltipProvider>
      <div className="w-full overflow-visible">
        {/* Main conversation item */}
        <div
          onClick={handleClick}
          className={`relative p-3 rounded-lg cursor-pointer transition-all duration-200 group w-full ${
            isActive
              ? "bg-emerald-600/20 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
              : "hover:bg-slate-700/50"
          } ${chat.isBranch ? "border-l-2 border-l-teal-400/50" : ""}`}
        >
          {/* Branch indicator line for child conversations */}
          {chat.isBranch && (
            <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-teal-400/60 to-teal-600/40 rounded-r" />
          )}

          {/* Main content area with reserved space for action buttons */}
          <div className="pr-16 w-full overflow-hidden">
            {/* Title row with branch info */}
            <div className="flex items-center gap-2 mb-1 w-full overflow-hidden">
              {/* Expand/collapse button for conversations with branches */}
              {chat.hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="h-4 w-4 p-0 hover:bg-emerald-500/20 flex-shrink-0"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-emerald-400" />
                  )}
                </Button>
              )}

              {/* Branch indicator for child conversations */}
              {chat.isBranch && (
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <GitBranch className="h-3 w-3 text-teal-400" />
                </div>
              )}

              {/* Title */}
              <h3 className="font-medium text-sm text-white truncate flex-1 min-w-0 overflow-hidden">
                {chat.isBranch && chat.branchName ? (
                  <span className="block truncate">
                    <span className="text-teal-400">{chat.branchName}</span>
                    <span className="text-slate-400 text-xs ml-1">
                      • {chat.title}
                    </span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2 min-w-0 overflow-hidden">
                    {chat.title === "New Chat" ||
                    chat.title.startsWith("New Chat") ? (
                      <>
                        <span className="text-slate-400 truncate flex-shrink min-w-0">
                          Generating title...
                        </span>
                        <div className="animate-spin rounded-full h-3 w-3 border border-slate-400 border-t-transparent flex-shrink-0" />
                      </>
                    ) : (
                      <span className="truncate min-w-0">{chat.title}</span>
                    )}
                  </span>
                )}
              </h3>

              {/* Status indicators */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {chat.hasChildren && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge
                        variant="outline"
                        className="h-4 px-1 text-xs border-emerald-500/30 text-emerald-400"
                      >
                        {chat.branches.length}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {chat.branches.length} branch
                        {chat.branches.length !== 1 ? "es" : ""}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {isPinned && <Pin className="h-3 w-3 text-emerald-400" />}
                {isBookmarked && <Star className="h-3 w-3 text-amber-400" />}
                {chat.isShared && (
                  <ArrowUpRight className="h-3 w-3 text-blue-400" />
                )}
              </div>
            </div>

            {/* Branch info for child conversations */}
            {chat.isBranch && chat.parentConversationId && (
              <div className="mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigateToParent();
                  }}
                  className="h-5 text-xs text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 px-1 py-0"
                >
                  ↑ Go to parent conversation
                </Button>
              </div>
            )}

            {/* Bottom row */}
            <div className="flex items-center justify-between gap-2 w-full overflow-hidden">
              <span className="text-xs text-slate-400 truncate flex-shrink min-w-0 overflow-hidden">
                {chat.isBranch && chat.branchCreatedAt
                  ? formatDate(chat.branchCreatedAt)
                  : formatDate(chat.createdAt)}
              </span>
            </div>
          </div>

          {/* Action buttons on hover - positioned within bounds */}
          <div className="absolute top-2 right-2 z-30 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
            {/* Pin/Unpin Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-7 w-7 p-0 rounded-md flex items-center justify-center bg-slate-800/90 backdrop-blur-sm border transition-all duration-200 ${
                    isPinned
                      ? "border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-400"
                      : "border-slate-600/50 hover:bg-slate-600/50 text-slate-200"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPin();
                  }}
                >
                  <Pin
                    className={`h-3.5 w-3.5 ${isPinned ? "fill-current" : ""}`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{isPinned ? "Unpin" : "Pin"} Chat</p>
              </TooltipContent>
            </Tooltip>

            {/* Delete Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 rounded-md flex items-center justify-center bg-slate-800/90 backdrop-blur-sm border border-slate-600/50 hover:bg-red-900/20 hover:border-red-500/50 text-slate-200 hover:text-red-400 transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Delete Chat</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Branch conversations */}
        <AnimatePresence>
          {isExpanded && chat.hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="ml-6 mt-1 space-y-1 w-full overflow-hidden"
            >
              {chat.branches
                .sort((a, b) => (a.branchOrder || 0) - (b.branchOrder || 0))
                .map((branch) => (
                  <motion.div
                    key={branch.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                    onClick={() => handleBranchClick(branch.id)}
                    className={`relative p-2 rounded-md cursor-pointer transition-all duration-200 group border-l-2 border-l-teal-400/50 bg-slate-800/30 hover:bg-slate-700/50 w-full overflow-hidden ${
                      branch.id === chat.id
                        ? "bg-emerald-600/10 border-l-emerald-400"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 w-full overflow-hidden">
                      <GitBranch className="h-3 w-3 text-teal-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-1 mb-1 min-w-0 overflow-hidden">
                          <span className="text-xs font-medium text-teal-300 truncate flex-shrink min-w-0">
                            {branch.branchName || "Unnamed Branch"}
                          </span>
                          <Zap className="h-2.5 w-2.5 text-teal-400 flex-shrink-0" />
                        </div>
                        <div className="flex items-center justify-between gap-2 min-w-0 overflow-hidden">
                          <span className="text-xs text-slate-400 truncate flex-shrink min-w-0">
                            {branch.branchCreatedAt
                              ? formatDate(branch.branchCreatedAt)
                              : formatDate(branch.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="bg-slate-800/95 backdrop-blur-md border border-slate-700/50 shadow-2xl shadow-black/40">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                Delete Conversation
              </DialogTitle>
              <DialogDescription className="text-slate-300">
                Are you sure you want to delete "{chat.title}"? This action
                cannot be undone and will permanently remove the conversation
                and all its messages.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
