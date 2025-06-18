"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useConversations } from "@/hooks/useConversations";
import { useHierarchicalConversations } from "@/hooks/useHierarchicalConversations";
import { useToast } from "@/hooks/use-toast";
import { useChatPreferences } from "@/hooks/useChatPreferences";
import { SidebarHeader } from "@/components/chat/sidebar/SidebarHeader";
import { NewChatButton } from "@/components/chat/sidebar/NewChatButton";
import { SearchAndFilter } from "@/components/chat/sidebar/SearchAndFilter";
import { ChatList } from "@/components/chat/sidebar/ChatList";
import { UserProfile } from "@/components/chat/sidebar/UserProfile";

interface ChatSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentChatId: string;
  selectedModel: string;
  onCreateNewChat: () => void;
}

function ChatSidebarComponent({
  isCollapsed,
  onToggleCollapse,
  currentChatId,
  selectedModel,
  onCreateNewChat,
}: ChatSidebarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const { toast } = useToast();

  // Use the extracted preferences hook
  const { preferences, togglePin, toggleBookmark, removeFromPreferences } =
    useChatPreferences();

  // API hooks
  const {
    conversations,
    loading: conversationsLoading,
    createConversation,
    deleteConversation,
    refetchConversations,
  } = useConversations();

  // Hierarchical conversations for enhanced sidebar display
  const {
    conversations: hierarchicalConversations,
    loading: hierarchicalLoading,
    refetchConversations: refetchHierarchical,
    navigateToConversation,
    deleteBranch, // NEW: Add deleteBranch method
    useNestedView,
    setUseNestedView,
  } = useHierarchicalConversations();

  // Memoize usage calculation to prevent recalculation on every render
  const usage = useMemo(() => {
    const baseUsage = Math.min(hierarchicalConversations.length * 2, 80);
    return baseUsage + Math.floor(Math.random() * 20);
  }, [hierarchicalConversations.length]);

  // Memoized handlers to prevent recreation on every render
  const handlePin = useCallback(
    (chatId: string) => {
      const wasPinned = togglePin(chatId);
      toast({
        title: wasPinned ? "Pinned" : "Unpinned",
        description: `Chat ${
          wasPinned ? "added to" : "removed from"
        } pinned conversations`,
      });
    },
    [togglePin, toast]
  );

  const handleBookmark = useCallback(
    (chatId: string) => {
      const wasBookmarked = toggleBookmark(chatId);
      toast({
        title: wasBookmarked ? "Bookmarked" : "Unbookmarked",
        description: `Chat ${
          wasBookmarked ? "added to" : "removed from"
        } bookmarks`,
      });
    },
    [toggleBookmark, toast]
  );

  const handleDelete = useCallback(
    async (chatId: string) => {
      try {
        // Use the hook's delete method
        const success = await deleteConversation(chatId);

        if (success) {
          toast({
            title: "Chat Deleted",
            description: "The conversation has been deleted",
          });

          // Remove from preferences
          removeFromPreferences(chatId);

          // Refresh hierarchical conversations
          refetchHierarchical();

          // Navigate away if current chat is deleted
          if (chatId === currentChatId) {
            router.push("/chat");
          }
        } else {
          throw new Error("Delete operation failed");
        }
      } catch (error) {
        console.error("Delete conversation error:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to delete conversation",
        });
      }
    },
    [
      deleteConversation,
      toast,
      removeFromPreferences,
      refetchHierarchical,
      currentChatId,
      router,
    ]
  );

  // Handler for navigating to parent conversations
  const handleNavigateToParent = useCallback(
    (parentId: string) => {
      navigateToConversation(parentId);
      router.push(`/chat/${parentId}`);
    },
    [navigateToConversation, router]
  );

  // NEW: Handler for branch deletion
  const handleDeleteBranch = useCallback(
    async (branchId: string) => {
      try {
        const result = await deleteBranch(branchId);

        if (result.success) {
          toast({
            title: "Branch Deleted",
            description: "The branch conversation has been deleted",
          });

          // Navigate away if current chat is the deleted branch
          if (branchId === currentChatId) {
            router.push("/chat");
          }
        } else {
          throw new Error(result.error || "Failed to delete branch");
        }
      } catch (error) {
        console.error("Delete branch error:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error instanceof Error ? error.message : "Failed to delete branch",
        });
      }

      return { success: false };
    },
    [deleteBranch, toast, currentChatId, router]
  );

  return (
    <div
      className={`${
        isCollapsed ? "w-16" : "w-80 lg:w-130"
      } flex-shrink-0 relative transition-all duration-500 ease-in-out h-full`}
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
          onNewChat={onCreateNewChat}
          onToggleSearch={() => {}} // Placeholder - already handled by SearchAndFilter
          onOpenSettings={() => router.push("/settings")}
          isSearching={false}
          totalChats={hierarchicalConversations.length}
          useNestedView={useNestedView}
          onToggleNestedView={setUseNestedView}
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
              onDeleteBranch={handleDeleteBranch}
            />

            {/* User Profile */}
            <UserProfile />
          </>
        )}
      </div>
    </div>
  );
}
export const ChatSidebar = React.memo(ChatSidebarComponent);

ChatSidebar.displayName = "ChatSidebar";
