"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MoreHorizontal,
  Pin,
  Star,
  Edit3,
  Archive,
  Trash2,
  ArrowUpRight,
  Zap,
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
      <div className="mx-2 mb-1">
        {/* Main conversation item */}
        <div
          onClick={handleClick}
          className={`relative p-3 rounded-lg cursor-pointer transition-all duration-200 group overflow-hidden max-w-full ${
            isActive
              ? "bg-emerald-600/20 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
              : "hover:bg-slate-700/50"
          } ${chat.isBranch ? "border-l-2 border-l-teal-400/50" : ""}`}
        >
          {/* Branch indicator line for child conversations */}
          {chat.isBranch && (
            <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-teal-400/60 to-teal-600/40 rounded-r" />
          )}

          {/* Main content area with reserved space for menu */}
          <div className="pr-8">
            {/* Title row with branch info */}
            <div className="flex items-center gap-2 mb-1 min-w-0">
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
              <h3 className="font-medium text-sm text-white truncate flex-1 min-w-0">
                {chat.isBranch && chat.branchName ? (
                  <span>
                    <span className="text-teal-400">{chat.branchName}</span>
                    <span className="text-slate-400 text-xs ml-1">
                      • {chat.title}
                    </span>
                  </span>
                ) : (
                  chat.title
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
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-xs text-slate-400 truncate flex-shrink min-w-0">
                {chat.isBranch && chat.branchCreatedAt
                  ? formatDate(chat.branchCreatedAt)
                  : formatDate(chat.createdAt)}
              </span>
              <Badge
                variant="outline"
                className="text-xs border-slate-600 text-slate-300 flex-shrink-0"
              >
                {chat.model}
              </Badge>
            </div>
          </div>

          {/* Three-dot menu */}
          <div className="absolute top-2 right-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 hover:bg-slate-600/50 rounded-md"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="right"
                alignOffset={-10}
                sideOffset={5}
                className="w-48 bg-slate-800 border-slate-700 shadow-xl z-50"
              >
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onPin();
                  }}
                  className="hover:bg-slate-700 cursor-pointer"
                >
                  <Pin className="mr-2 h-4 w-4" />
                  {isPinned ? "Unpin" : "Pin"} Chat
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onBookmark();
                  }}
                  className="hover:bg-slate-700 cursor-pointer"
                >
                  <Star className="mr-2 h-4 w-4" />
                  {isBookmarked ? "Remove Bookmark" : "Bookmark"}
                </DropdownMenuItem>
                {chat.isBranch && chat.parentConversationId && (
                  <>
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNavigateToParent();
                      }}
                      className="hover:bg-slate-700 cursor-pointer"
                    >
                      <ArrowUpRight className="mr-2 h-4 w-4" />
                      Go to Parent
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Add rename functionality
                  }}
                  className="hover:bg-slate-700 cursor-pointer"
                >
                  <Edit3 className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Add archive functionality
                  }}
                  className="hover:bg-slate-700 cursor-pointer"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Are you sure you want to delete this chat?")) {
                      onDelete();
                    }
                  }}
                  className="text-red-400 focus:text-red-300 hover:bg-red-900/20 cursor-pointer"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              className="ml-4 mt-1 space-y-1"
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
                    className={`relative p-2 rounded-md cursor-pointer transition-all duration-200 group border-l-2 border-l-teal-400/50 bg-slate-800/30 hover:bg-slate-700/50 ${
                      branch.id === chat.id
                        ? "bg-emerald-600/10 border-l-emerald-400"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GitBranch className="h-3 w-3 text-teal-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs font-medium text-teal-300 truncate">
                            {branch.branchName || "Unnamed Branch"}
                          </span>
                          <Zap className="h-2.5 w-2.5 text-teal-400" />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-400 truncate">
                            {branch.branchCreatedAt
                              ? formatDate(branch.branchCreatedAt)
                              : formatDate(branch.createdAt)}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs h-4 px-1 border-slate-600 text-slate-400"
                          >
                            {branch.model}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
