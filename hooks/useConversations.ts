"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient, type Conversation, type APIError } from "@/lib/api/client";

interface UseConversationsReturn {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  createConversation: (data: {
    title?: string;
    model?: string;
    initialMessage?: {
      content: string;
      attachments?: any[];
    };
  }) => Promise<Conversation | null>;
  updateConversation: (
    conversationId: string,
    updates: Partial<Conversation>
  ) => void;
  deleteConversation: (conversationId: string) => Promise<boolean>;
  refetchConversations: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export function useConversations(): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0,
  });

  // Use ref to prevent stale closures
  const paginationRef = useRef(pagination);
  paginationRef.current = pagination;

  const fetchConversations = useCallback(
    async (reset = false) => {
      try {
        setLoading(true);
        setError(null);

        const currentPagination = paginationRef.current;
        const offset = reset ? 0 : currentPagination.offset;

        const response = await apiClient.getConversations({
          limit: currentPagination.limit,
          offset,
        });

        if (reset) {
          setConversations(response.conversations);
        } else {
          setConversations((prev) => [...prev, ...response.conversations]);
        }

        setPagination((prev) => ({
          ...prev,
          offset: offset + response.conversations.length,
          total: response.pagination.total,
        }));
      } catch (err) {
        const apiError = err as APIError;
        setError(apiError.error || "Failed to fetch conversations");
        console.error("Fetch conversations error:", err);
      } finally {
        setLoading(false);
      }
    },
    [] // No dependencies to prevent recreating function
  );

  const createConversation = useCallback(
    async (data: {
      title?: string;
      model?: string;
      initialMessage?: {
        content: string;
        attachments?: any[];
      };
    }) => {
      try {
        setError(null);
        const response = await apiClient.createConversation(data);

        // Add the new conversation to the beginning of the list
        setConversations((prev) => [response.conversation, ...prev]);

        // Log warnings if any (for model fallbacks)
        if (response.warning) {
          console.warn("⚠️ Conversation creation warning:", response.warning);
        }

        return response.conversation;
      } catch (err) {
        const apiError = err as APIError;
        setError(apiError.error || "Failed to create conversation");
        console.error("Create conversation error:", err);
        return null;
      }
    },
    []
  );

  const updateConversation = useCallback(
    (conversationId: string, updates: Partial<Conversation>) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, ...updates } : conv
        )
      );
    },
    []
  );

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      setError(null);
      const response = await apiClient.deleteConversation(conversationId);
      if (response.success) {
        setConversations((prev) =>
          prev.filter((conv) => conv.id !== conversationId)
        );
        return true;
      }
      return false;
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.error || "Failed to delete conversation");
      console.error("Delete conversation error:", err);
      return false;
    }
  }, []);

  // Stable refetch function that doesn't change
  const refetchConversations = useCallback(async () => {
    setPagination((prev) => ({ ...prev, offset: 0 }));
    await fetchConversations(true);
  }, [fetchConversations]);

  const loadMore = useCallback(async () => {
    const currentPagination = paginationRef.current;
    if (!loading && currentPagination.offset < currentPagination.total) {
      await fetchConversations(false);
    }
  }, [loading, fetchConversations]);

  // Initial load - only run once
  useEffect(() => {
    fetchConversations(true);
  }, [fetchConversations]);

  const hasMore = pagination.offset < pagination.total && pagination.total > 0;

  return {
    conversations,
    loading,
    error,
    createConversation,
    updateConversation,
    deleteConversation,
    refetchConversations,
    hasMore,
    loadMore,
  };
}
