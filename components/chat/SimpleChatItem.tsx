"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
  Pin,
  Trash2,
  ArrowUpRight,
  MessageSquare,
} from "lucide-react";

interface SimpleChatItemProps {
  chat: {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    isShared: boolean;
    isBranch: boolean;
    parentConversationId?: string | null;
    branchName?: string | null;
    branchOrder?: number | null;
    metadata: any;
    hasChildren: boolean;
  };
  isActive: boolean;
  isPinned: boolean;
  onPin: () => void;
  onDelete: () => void;
  onNavigateToParent?: (parentId: string) => void;
}

export function SimpleChatItem({
  chat,
  isActive,
  isPinned,
  onPin,
  onDelete,
  onNavigateToParent,
}: SimpleChatItemProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleClick = () => {
    router.push(`/chat/${chat.id}`);
  };

  const handleNavigateToParent = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (chat.parentConversationId && onNavigateToParent) {
      onNavigateToParent(chat.parentConversationId);
    }
  };

  const handleDeleteConfirm = () => {
    onDelete();
    setShowDeleteDialog(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays - 1}d ago`;
    if (diffDays <= 30) return `${Math.floor((diffDays - 1) / 7)}w ago`;
    if (diffDays <= 365) return `${Math.floor((diffDays - 1) / 30)}mo ago`;
    return `${Math.floor((diffDays - 1) / 365)}y ago`;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={`w-full group relative rounded-lg transition-all duration-200 cursor-pointer overflow-hidden ${
          isActive
            ? "bg-emerald-500/20 border border-emerald-500/30 shadow-md"
            : "hover:bg-slate-700/50 border border-transparent"
        }`}
        onClick={handleClick}
      >
        {/* Main chat item content */}
        <div className="p-3 pr-14 space-y-2">
          {/* Header with branch indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Branch indicator for branch chats */}
              {chat.isBranch && chat.parentConversationId && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleNavigateToParent}
                        className="h-6 w-6 p-0 text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 flex-shrink-0"
                      >
                        <GitBranch className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Go to parent conversation</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Regular chat icon for non-branch chats */}
              {!chat.isBranch && (
                <MessageSquare className="h-4 w-4 text-slate-400 flex-shrink-0" />
              )}

              {/* Title with branch name if applicable */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-slate-200 truncate">
                  {chat.isBranch && chat.branchName ? (
                    <span>
                      <span className="text-teal-300">{chat.branchName}</span>
                      <span className="text-slate-400 text-xs ml-1">
                        • {chat.title}
                      </span>
                    </span>
                  ) : (
                    chat.title
                  )}
                </h3>
              </div>
            </div>
          </div>

          {/* Metadata and timestamp */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              {chat.isShared && (
                <Badge
                  variant="secondary"
                  className="h-4 px-1 text-xs bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30"
                >
                  Shared
                </Badge>
              )}
              {chat.hasChildren && (
                <Badge
                  variant="secondary"
                  className="h-4 px-1 text-xs bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30"
                >
                  Has branches
                </Badge>
              )}
            </div>
            <span className="truncate ml-2">{formatDate(chat.updatedAt)}</span>
          </div>
        </div>

        {/* Action buttons - positioned to stay within sidebar bounds */}
        <div className="absolute top-2 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-0.5">
          <TooltipProvider>
            {/* Pin button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPin();
                  }}
                  className={`h-6 w-6 p-0 ${
                    isPinned
                      ? "text-emerald-400 hover:text-emerald-300 bg-emerald-500/10"
                      : "text-slate-400 hover:text-slate-300"
                  } hover:bg-slate-600/50 rounded`}
                >
                  <Pin className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isPinned ? "Unpin" : "Pin"} conversation
              </TooltipContent>
            </Tooltip>

            {/* Delete button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                  className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete conversation</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </motion.div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              Delete Conversation
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              Are you sure you want to delete &quot;{chat.title}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
