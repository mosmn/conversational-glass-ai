"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, type Conversation, type APIError } from "@/lib/api/client";

interface UseConversationsReturn {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  createConversation: (data: {
    title?: string;
    model?: string;
  }) => Promise<Conversation | null>;
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

  const fetchConversations = useCallback(
    async (reset = false) => {
      try {
        setLoading(true);
        setError(null);

        const offset = reset ? 0 : pagination.offset;
        const response = await apiClient.getConversations({
          limit: pagination.limit,
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
    [pagination.limit, pagination.offset]
  );

  const createConversation = useCallback(
    async (data: { title?: string; model?: string }) => {
      try {
        setError(null);
        const response = await apiClient.createConversation(data);

        // Add the new conversation to the beginning of the list
        setConversations((prev) => [response.conversation, ...prev]);

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

  const refetchConversations = useCallback(async () => {
    setPagination((prev) => ({ ...prev, offset: 0 }));
    await fetchConversations(true);
  }, [fetchConversations]);

  const loadMore = useCallback(async () => {
    if (!loading && pagination.offset < pagination.total) {
      await fetchConversations(false);
    }
  }, [loading, pagination.offset, pagination.total, fetchConversations]);

  // Initial load
  useEffect(() => {
    fetchConversations(true);
  }, []);

  const hasMore = pagination.offset < pagination.total && pagination.total > 0;

  return {
    conversations,
    loading,
    error,
    createConversation,
    refetchConversations,
    hasMore,
    loadMore,
  };
}
