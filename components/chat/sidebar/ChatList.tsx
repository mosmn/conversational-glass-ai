"use client";

import React, { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Pin,
  Clock,
  Search,
  AlertCircle,
  Calendar,
  CalendarDays,
  History,
} from "lucide-react";
import { SimpleChatItem } from "@/components/chat/SimpleChatItem";
import type { ChatPreferences } from "@/hooks/useChatPreferences";
import { motion, AnimatePresence } from "framer-motion";

// Simple chat type for flat list display
interface SimpleChat {
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
}

// Input hierarchical chat type (what we receive from the API)
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
  branches?: Array<{
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
  onDeleteBranch?: (
    branchId: string
  ) => Promise<{ success: boolean; error?: string }>;
}

// Date grouping helper functions
function getDateGroup(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (date >= today) {
    return "Today";
  } else if (date >= yesterday) {
    return "Yesterday";
  } else if (date >= weekAgo) {
    return "This Week";
  } else if (date >= monthAgo) {
    return "This Month";
  } else {
    return "Older";
  }
}

function getDateGroupIcon(group: string) {
  switch (group) {
    case "Today":
      return Calendar;
    case "Yesterday":
      return CalendarDays;
    case "This Week":
      return Clock;
    case "This Month":
      return History;
    case "Older":
      return History;
    default:
      return Clock;
  }
}

function getDateGroupColor(group: string) {
  switch (group) {
    case "Today":
      return "text-emerald-400";
    case "Yesterday":
      return "text-blue-400";
    case "This Week":
      return "text-purple-400";
    case "This Month":
      return "text-orange-400";
    case "Older":
      return "text-slate-400";
    default:
      return "text-slate-400";
  }
}

function ChatListComponent({
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
  onDeleteBranch,
}: ChatListProps) {
  // Memoize filtered and grouped conversations (flattened from hierarchical)
  const { filteredChats, pinnedChats, groupedRecentChats } = useMemo(() => {
    // Flatten hierarchical conversations to include all branches as individual items
    const flattenedConversations: SimpleChat[] = [];

    hierarchicalConversations.forEach((conv) => {
      // Add the main conversation
      flattenedConversations.push({
        id: conv.id,
        title: conv.title,
        model: conv.model,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        isShared: conv.isShared,
        isBranch: conv.isBranch,
        parentConversationId: conv.parentConversationId,
        branchName: conv.branchName,
        branchOrder: conv.branchOrder,
        branchCreatedAt: conv.branchCreatedAt,
        metadata: conv.metadata,
        hasChildren: conv.hasChildren,
      });

      // Add all branches as separate items (if branches exist)
      if (conv.branches && conv.branches.length > 0) {
        conv.branches.forEach((branch) => {
          flattenedConversations.push({
            id: branch.id,
            title: branch.title,
            model: branch.model,
            createdAt: branch.createdAt,
            updatedAt: branch.updatedAt,
            isShared: false, // branches are typically not shared directly
            isBranch: true,
            parentConversationId: conv.id, // parent is the main conversation
            branchName: branch.branchName,
            branchOrder: branch.branchOrder,
            branchCreatedAt: branch.branchCreatedAt,
            metadata: branch.metadata,
            hasChildren: false, // simplified: no nested branches for now
          });
        });
      }
    });

    // Filter conversations
    const filtered = flattenedConversations.filter((conv) => {
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
    const pinned = filtered.filter((conv) =>
      preferences.pinnedChats.includes(conv.id)
    );
    const recent = filtered.filter(
      (conv) => !preferences.pinnedChats.includes(conv.id)
    );

    // Group recent chats by date
    const grouped = recent.reduce((groups, chat) => {
      const group = getDateGroup(chat.updatedAt);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(chat);
      return groups;
    }, {} as Record<string, SimpleChat[]>);

    // Sort each group by updatedAt (most recent first)
    Object.keys(grouped).forEach((group) => {
      grouped[group].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });

    return {
      filteredChats: filtered,
      pinnedChats: pinned,
      groupedRecentChats: grouped,
    };
  }, [hierarchicalConversations, preferences, searchQuery, selectedCategory]);

  // Define the order of date groups
  const dateGroupOrder = [
    "Today",
    "Yesterday",
    "This Week",
    "This Month",
    "Older",
  ];

  return (
    <div className="flex-1 min-h-0">
      <ScrollArea className="h-full w-full">
        <motion.div
          className="space-y-4 w-full overflow-hidden px-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Search Results Info */}
          {searchQuery && (
            <div className="flex items-center justify-between text-sm text-slate-400 px-2 py-1 bg-slate-800/30 rounded-lg">
              <div className="flex items-center">
                <Search className="h-3 w-3 mr-2" />
                Results for "{searchQuery}"
              </div>
              <span className="text-xs">{filteredChats.length} found</span>
            </div>
          )}

          {/* Pinned Chats */}
          <AnimatePresence>
            {pinnedChats.length > 0 && (
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="mb-6"
              >
                <div className="flex items-center text-sm font-medium text-slate-300 mb-3 px-2">
                  <Pin className="h-3.5 w-3.5 mr-2 text-emerald-400" />
                  Pinned Conversations
                </div>
                <div className="space-y-2">
                  {pinnedChats.map((chat) => (
                    <SimpleChatItem
                      key={chat.id}
                      chat={chat}
                      isActive={chat.id === currentChatId}
                      isPinned={preferences.pinnedChats.includes(chat.id)}
                      isBookmarked={preferences.bookmarkedChats.includes(
                        chat.id
                      )}
                      onPin={() => onPin(chat.id)}
                      onBookmark={() => onBookmark(chat.id)}
                      onDelete={() => onDelete(chat.id)}
                      onNavigateToParent={onNavigateToParent}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Date-Grouped Recent Chats */}
          <div>
            {hierarchicalLoading ? (
              <div className="space-y-4">
                <div className="flex items-center text-sm font-medium text-slate-300 mb-3 px-2">
                  <Clock className="h-3.5 w-3.5 mr-2 text-blue-400" />
                  Loading...
                </div>
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-3 mx-2 rounded-lg bg-slate-700/30 animate-pulse backdrop-blur-sm"
                    >
                      <div className="h-4 bg-slate-600/50 rounded mb-2"></div>
                      <div className="h-3 bg-slate-600/50 rounded w-3/4"></div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : Object.keys(groupedRecentChats).length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8 px-4 rounded-lg bg-slate-800/30 backdrop-blur-sm"
              >
                <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                <div className="text-slate-300 font-medium mb-2">
                  No conversations yet
                </div>
                <div className="text-sm text-slate-400">
                  Start a new chat to begin your conversation journey
                </div>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {dateGroupOrder.map((group, groupIndex) => {
                  const chatsInGroup = groupedRecentChats[group];
                  if (!chatsInGroup || chatsInGroup.length === 0) return null;

                  const Icon = getDateGroupIcon(group);
                  const colorClass = getDateGroupColor(group);

                  return (
                    <motion.div
                      key={group}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: groupIndex * 0.1 }}
                      className="space-y-2"
                    >
                      <div
                        className={`flex items-center text-sm font-medium text-slate-300 mb-3 px-2`}
                      >
                        <Icon className={`h-3.5 w-3.5 mr-2 ${colorClass}`} />
                        <span>{group}</span>
                        <span className="ml-2 text-xs text-slate-500">
                          ({chatsInGroup.length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {chatsInGroup.map((chat, index) => (
                          <motion.div
                            key={chat.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              delay: groupIndex * 0.1 + index * 0.02,
                            }}
                          >
                            <SimpleChatItem
                              chat={chat}
                              isActive={chat.id === currentChatId}
                              isPinned={preferences.pinnedChats.includes(
                                chat.id
                              )}
                              isBookmarked={preferences.bookmarkedChats.includes(
                                chat.id
                              )}
                              onPin={() => onPin(chat.id)}
                              onBookmark={() => onBookmark(chat.id)}
                              onDelete={() => onDelete(chat.id)}
                              onNavigateToParent={onNavigateToParent}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </ScrollArea>
    </div>
  );
}

export const ChatList = React.memo(ChatListComponent);

ChatList.displayName = "ChatList";
