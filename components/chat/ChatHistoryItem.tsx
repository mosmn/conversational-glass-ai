"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pin,
  Star,
  MoreHorizontal,
  Edit3,
  Archive,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Chat {
  id: string;
  title: string;
  preview?: string;
  timestamp: Date;
  model: string;
  isPinned?: boolean;
  isBookmarked?: boolean;
  category?: string;
}

interface ChatHistoryItemProps {
  chat: Chat;
  isActive: boolean;
  onPin: () => void;
  onBookmark: () => void;
  onDelete: () => void;
}

export function ChatHistoryItem({
  chat,
  isActive,
  onPin,
  onBookmark,
  onDelete,
}: ChatHistoryItemProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/chat/${chat.id}`);
  };

  return (
    <div className="mx-2 mb-1">
      <div
        onClick={handleClick}
        className={`relative p-3 rounded-lg cursor-pointer transition-all duration-200 group overflow-hidden max-w-full ${
          isActive
            ? "bg-emerald-600/20 border border-emerald-500/30"
            : "hover:bg-slate-700/50"
        }`}
      >
        {/* Main content area with reserved space for menu */}
        <div className="pr-8">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-1 min-w-0">
            <h3 className="font-medium text-sm text-white truncate flex-1 min-w-0">
              {chat.title}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              {chat.isPinned && <Pin className="h-3 w-3 text-emerald-400" />}
              {chat.isBookmarked && <Star className="h-3 w-3 text-amber-400" />}
            </div>
          </div>

          {/* Preview text */}
          {chat.preview && (
            <p className="text-xs text-slate-300 truncate mb-2 min-w-0">
              {chat.preview}
            </p>
          )}

          {/* Bottom row */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs text-slate-400 truncate flex-shrink min-w-0">
              {chat.timestamp.toLocaleDateString()}
            </span>
            <Badge
              variant="outline"
              className="text-xs border-slate-600 text-slate-300 flex-shrink-0"
            >
              {chat.model}
            </Badge>
          </div>
        </div>

        {/* Three-dot menu - positioned within bounds */}
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
                {chat.isPinned ? "Unpin" : "Pin"} Chat
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onBookmark();
                }}
                className="hover:bg-slate-700 cursor-pointer"
              >
                <Star className="mr-2 h-4 w-4" />
                {chat.isBookmarked ? "Remove Bookmark" : "Bookmark"}
              </DropdownMenuItem>
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
    </div>
  );
}
