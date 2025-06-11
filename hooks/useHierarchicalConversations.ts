"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, type APIError } from "@/lib/api/client";

export interface HierarchicalConversation {
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

interface UseHierarchicalConversationsReturn {
  conversations: HierarchicalConversation[];
  loading: boolean;
  error: string | null;
  refetchConversations: () => Promise<void>;
  navigateToConversation: (conversationId: string) => void;
}

export function useHierarchicalConversations(): UseHierarchicalConversationsReturn {
  const [conversations, setConversations] = useState<
    HierarchicalConversation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.getConversationsWithBranching({
        limit: 50, // Get more conversations since we're showing hierarchy
        includeOrphaned: true, // Include conversations that might be orphaned branches
      });

      // Sort conversations to show parent conversations first, then their branches
      const sortedConversations = response.conversations.sort((a, b) => {
        // Parent conversations first (not branches)
        if (!a.isBranch && b.isBranch) return -1;
        if (a.isBranch && !b.isBranch) return 1;

        // Within the same type, sort by most recent
        const aDate = new Date(
          a.isBranch ? a.branchCreatedAt || a.createdAt : a.updatedAt
        );
        const bDate = new Date(
          b.isBranch ? b.branchCreatedAt || b.createdAt : b.updatedAt
        );

        return bDate.getTime() - aDate.getTime();
      });

      setConversations(sortedConversations);
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.error || "Failed to fetch conversations");
      console.error("Fetch hierarchical conversations error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetchConversations = useCallback(async () => {
    await fetchConversations();
  }, [fetchConversations]);

  const navigateToConversation = useCallback((conversationId: string) => {
    // This can be used to auto-expand parent conversations when navigating to a branch
    setConversations((prev) =>
      prev.map((conv) => {
        if (
          conv.id === conversationId ||
          conv.branches.some((b) => b.id === conversationId)
        ) {
          // If this conversation or any of its branches is being navigated to,
          // we could add some state to auto-expand it
          return conv;
        }
        return conv;
      })
    );
  }, []);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    error,
    refetchConversations,
    navigateToConversation,
  };
}
