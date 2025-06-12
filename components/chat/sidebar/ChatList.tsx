"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pin, Clock } from "lucide-react";
import { HierarchicalChatItem } from "@/components/chat/HierarchicalChatItem";
import type { ChatPreferences } from "@/hooks/useChatPreferences";

// Use the actual type from HierarchicalChatItem
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

interface ChatListProps {
  hierarchicalConversations: HierarchicalChat[];
  preferences: ChatPreferences;
  currentChatId: string;
  searchQuery: string;
  selectedCategory: string;
  hierarchicalLoading: boolean;
  onPin: (chatId: string) => void;
  onBookmark: (chatId: string) => void;
  onDelete: (chatId: string) => void;
  onNavigateToParent: (parentId: string) => void;
}

export function ChatList({
  hierarchicalConversations,
  preferences,
  currentChatId,
  searchQuery,
  selectedCategory,
  hierarchicalLoading,
  onPin,
  onBookmark,
  onDelete,
  onNavigateToParent,
}: ChatListProps) {
  // Filter conversations
  const filteredHierarchicalChats = hierarchicalConversations.filter((conv) => {
    // Search filter
    const matchesSearch =
      !searchQuery ||
      conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.branchName &&
        conv.branchName.toLowerCase().includes(searchQuery.toLowerCase()));

    // Category filter
    const category = preferences.chatCategories[conv.id] || "General";
    const matchesCategory =
      selectedCategory === "All" || category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Separate pinned and recent chats
  const pinnedHierarchicalChats = filteredHierarchicalChats.filter((conv) =>
    preferences.pinnedChats.includes(conv.id)
  );
  const recentHierarchicalChats = filteredHierarchicalChats.filter(
    (conv) => !preferences.pinnedChats.includes(conv.id)
  );

  return (
    <div className="flex-1 min-h-0">
      <ScrollArea className="h-full px-4">
        <div className="space-y-2 max-w-full">
          {/* Pinned Chats */}
          {pinnedHierarchicalChats.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center text-sm text-slate-400 mb-2 px-2">
                <Pin className="h-3 w-3 mr-1" />
                Pinned
              </div>
              <div className="space-y-1">
                {pinnedHierarchicalChats.map((chat) => (
                  <HierarchicalChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === currentChatId}
                    isPinned={preferences.pinnedChats.includes(chat.id)}
                    isBookmarked={preferences.bookmarkedChats.includes(chat.id)}
                    onPin={() => onPin(chat.id)}
                    onBookmark={() => onBookmark(chat.id)}
                    onDelete={() => onDelete(chat.id)}
                    onNavigateToParent={onNavigateToParent}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent Chats */}
          <div>
            <div className="flex items-center text-sm text-slate-400 mb-2 px-2">
              <Clock className="h-3 w-3 mr-1" />
              Recent
            </div>
            {hierarchicalLoading ? (
              <div className="space-y-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="p-3 mx-2 rounded-lg bg-slate-700/30 animate-pulse"
                  >
                    <div className="h-4 bg-slate-600 rounded mb-2"></div>
                    <div className="h-3 bg-slate-600 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : recentHierarchicalChats.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="text-slate-400 mb-2">No conversations yet</div>
                <div className="text-xs text-slate-500">
                  Create a new chat to get started
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {recentHierarchicalChats.map((chat) => (
                  <HierarchicalChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === currentChatId}
                    isPinned={preferences.pinnedChats.includes(chat.id)}
                    isBookmarked={preferences.bookmarkedChats.includes(chat.id)}
                    onPin={() => onPin(chat.id)}
                    onBookmark={() => onBookmark(chat.id)}
                    onDelete={() => onDelete(chat.id)}
                    onNavigateToParent={onNavigateToParent}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
