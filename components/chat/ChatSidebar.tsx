"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConversations } from "@/hooks/useConversations";
import { useHierarchicalConversations } from "@/hooks/useHierarchicalConversations";
import { useToast } from "@/hooks/use-toast";
import { useChatPreferences } from "@/hooks/useChatPreferences";
import { SidebarHeader } from "@/components/chat/sidebar/SidebarHeader";
import { NewChatButton } from "@/components/chat/sidebar/NewChatButton";
import { SearchAndFilter } from "@/components/chat/sidebar/SearchAndFilter";
import { ChatList } from "@/components/chat/sidebar/ChatList";
import { UsageMeter } from "@/components/chat/sidebar/UsageMeter";
import { UserProfile } from "@/components/chat/sidebar/UserProfile";

interface ChatSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentChatId: string;
  selectedModel: string;
  onCreateNewChat: () => void;
}

export function ChatSidebar({
  isCollapsed,
  onToggleCollapse,
  currentChatId,
  selectedModel,
  onCreateNewChat,
}: ChatSidebarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [usage, setUsage] = useState(65);
  const { toast } = useToast();

  // Use the extracted preferences hook
  const { preferences, togglePin, toggleBookmark, removeFromPreferences } =
    useChatPreferences();

  // API hooks
  const {
    conversations,
    loading: conversationsLoading,
    createConversation,
    refetchConversations,
  } = useConversations();

  // Hierarchical conversations for enhanced sidebar display
  const {
    conversations: hierarchicalConversations,
    loading: hierarchicalLoading,
    refetchConversations: refetchHierarchical,
    navigateToConversation,
  } = useHierarchicalConversations();

  // Calculate actual usage and update when conversations change
  useEffect(() => {
    const calculateUsage = () => {
      const baseUsage = Math.min(hierarchicalConversations.length * 2, 80);
      return baseUsage + Math.floor(Math.random() * 20);
    };

    const newUsage = calculateUsage();
    setUsage(newUsage);
  }, [hierarchicalConversations.length]);

  // Enhanced handlers with toast notifications
  const handlePin = (chatId: string) => {
    const wasPinned = togglePin(chatId);
    toast({
      title: wasPinned ? "Pinned" : "Unpinned",
      description: `Chat ${
        wasPinned ? "added to" : "removed from"
      } pinned conversations`,
    });
  };

  const handleBookmark = (chatId: string) => {
    const wasBookmarked = toggleBookmark(chatId);
    toast({
      title: wasBookmarked ? "Bookmarked" : "Unbookmarked",
      description: `Chat ${
        wasBookmarked ? "added to" : "removed from"
      } bookmarks`,
    });
  };

  const handleDelete = async (chatId: string) => {
    try {
      toast({
        title: "Chat Deleted",
        description: "The conversation has been deleted",
      });

      // Remove from preferences
      removeFromPreferences(chatId);

      // Refresh conversations
      refetchConversations();
      refetchHierarchical();

      // Navigate away if current chat is deleted
      if (chatId === currentChatId) {
        router.push("/");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete conversation",
      });
    }
  };

  // Handler for navigating to parent conversations
  const handleNavigateToParent = (parentId: string) => {
    navigateToConversation(parentId);
    router.push(`/chat/${parentId}`);
  };

  return (
    <div
      className={`${
        isCollapsed ? "w-16" : "w-80"
      } flex-shrink-0 relative transition-all duration-500 ease-in-out`}
    >
      {/* Glassmorphic Background */}
      <div className="absolute inset-0 bg-slate-800/30 backdrop-blur-2xl border-r border-slate-700/30" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-700/20 via-transparent to-slate-900/20" />

      {/* Animated Border */}
      <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Sidebar Header */}
        <SidebarHeader
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />

        {!isCollapsed && (
          <>
            {/* New Chat Button */}
            <NewChatButton onCreateNewChat={onCreateNewChat} />

            {/* Search and Filter */}
            <SearchAndFilter
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
            />

            {/* Chat History */}
            <ChatList
              hierarchicalConversations={hierarchicalConversations}
              preferences={preferences}
              currentChatId={currentChatId}
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              hierarchicalLoading={hierarchicalLoading}
              onPin={handlePin}
              onBookmark={handleBookmark}
              onDelete={handleDelete}
              onNavigateToParent={handleNavigateToParent}
            />

            {/* Usage Meter */}
            <UsageMeter usage={usage} />

            {/* User Profile */}
            <UserProfile />
          </>
        )}
      </div>
    </div>
  );
}
