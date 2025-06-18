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
  depth?: number;
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
    depth?: number;
    branches?: any[];
    hasChildren?: boolean;
  }>;
}

interface UseHierarchicalConversationsReturn {
  conversations: HierarchicalConversation[];
  loading: boolean;
  error: string | null;
  updateConversation: (
    conversationId: string,
    updates: Partial<HierarchicalConversation>
  ) => void;
  refetchConversations: () => Promise<void>;
  navigateToConversation: (conversationId: string) => void;
  deleteBranch: (
    branchId: string
  ) => Promise<{ success: boolean; error?: string }>;
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
        nested: true, // Always use nested view for flattening in ChatList
      });

      // Type the response properly
      const apiResponse = response as {
        conversations: HierarchicalConversation[];
      };

      // Sort conversations to show parent conversations first, then their branches
      const sortedConversations = apiResponse.conversations.sort(
        (a: HierarchicalConversation, b: HierarchicalConversation) => {
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
        }
      );

      setConversations(sortedConversations);
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.error || "Failed to fetch conversations");
      console.error("Fetch hierarchical conversations error:", err);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed since we always use nested: true

  const updateConversation = useCallback(
    (conversationId: string, updates: Partial<HierarchicalConversation>) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, ...updates } : conv
        )
      );
    },
    []
  );

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

  const deleteBranch = useCallback(async (branchId: string) => {
    try {
      setLoading(true);
      setError(null);

      await apiClient.deleteBranchConversation(branchId);

      // Remove the branch from local state
      await refetchConversations(); // Refresh the entire list to ensure consistency

      return { success: true };
    } catch (err) {
      const apiError = err as APIError;
      const errorMessage = apiError.error || "Failed to delete branch";
      setError(errorMessage);
      console.error("Delete branch error:", err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    conversations,
    loading,
    error,
    updateConversation,
    refetchConversations,
    navigateToConversation,
    deleteBranch,
  };
}
