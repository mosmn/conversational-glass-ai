"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  apiClient,
  type Message,
  type APIError,
  type StreamChunk,
  type MessagesResponse,
} from "@/lib/api/client";

interface UseChatReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  isStreaming: boolean;
  hasMore: boolean;
  sendMessage: (content: string, model: string) => Promise<void>;
  refetchMessages: () => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  currentStreamContent: string;
  lastSyncTime: string | null;
  syncMessages: () => Promise<void>;
}

export function useChat(conversationId: string): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamContent, setCurrentStreamContent] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMessages = useCallback(
    async (reset = false) => {
      if (!conversationId) return;

      try {
        setLoading(true);
        setError(null);

        const cursor = reset ? undefined : nextCursor;
        const response = await apiClient.getConversationMessages(
          conversationId,
          {
            cursor: cursor || undefined,
            limit: 50,
            includeMetadata: true,
          }
        );

        if (reset) {
          setMessages(response.messages);
        } else {
          setMessages((prev) => [...response.messages, ...prev]);
        }

        setHasMore(response.pagination.hasMore);
        setNextCursor(response.pagination.nextCursor);
        setLastSyncTime(response.sync.currentTimestamp);
      } catch (err) {
        const apiError = err as APIError;
        setError(apiError.error || "Failed to fetch messages");
        console.error("Fetch messages error:", err);
      } finally {
        setLoading(false);
      }
    },
    [conversationId, nextCursor]
  );

  const loadMoreMessages = useCallback(async () => {
    if (loading || !hasMore || !nextCursor) return;

    try {
      setError(null);
      const response = await apiClient.loadMoreMessages(
        conversationId,
        nextCursor,
        50
      );

      setMessages((prev) => [...response.messages, ...prev]);
      setHasMore(response.pagination.hasMore);
      setNextCursor(response.pagination.nextCursor);
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.error || "Failed to load more messages");
      console.error("Load more messages error:", err);
    }
  }, [conversationId, nextCursor, hasMore, loading]);

  const syncMessages = useCallback(async () => {
    if (!conversationId || !lastSyncTime) return;

    try {
      const syncResponse = await apiClient.syncMessages(
        conversationId,
        lastSyncTime
      );

      if (
        syncResponse.newMessages.length > 0 ||
        syncResponse.updatedMessages.length > 0
      ) {
        setMessages((prev) => {
          const messageMap = new Map(prev.map((msg) => [msg.id, msg]));

          // Update existing messages
          syncResponse.updatedMessages.forEach((updatedMsg) => {
            messageMap.set(updatedMsg.id, updatedMsg);
          });

          // Add new messages
          syncResponse.newMessages.forEach((newMsg) => {
            messageMap.set(newMsg.id, newMsg);
          });

          // Convert back to array and sort by timestamp
          return Array.from(messageMap.values()).sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });

        setLastSyncTime(syncResponse.lastSyncTimestamp);
      }
    } catch (err) {
      console.error("Sync messages error:", err);
      // Don't set error for sync failures to avoid disrupting UX
    }
  }, [conversationId, lastSyncTime]);

  const sendMessage = useCallback(
    async (content: string, model: string) => {
      if (!content.trim() || !conversationId) return;

      try {
        setError(null);
        setIsStreaming(true);
        setCurrentStreamContent("");

        // Create optimistic user message
        const optimisticUserMessage: Message = {
          id: `temp-user-${Date.now()}`,
          role: "user",
          content,
          timestamp: new Date().toISOString(),
          metadata: { streamingComplete: true },
        };

        // Create optimistic assistant message
        const optimisticAssistantMessage: Message = {
          id: `temp-assistant-${Date.now()}`,
          role: "assistant",
          content: "",
          model,
          timestamp: new Date().toISOString(),
          metadata: { streamingComplete: false },
        };

        // Add optimistic messages to UI
        setMessages((prev) => [
          ...prev,
          optimisticUserMessage,
          optimisticAssistantMessage,
        ]);

        // Cancel any existing stream
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        let assistantContent = "";
        let realUserMessageId = "";
        let realAssistantMessageId = "";

        // Stream the response
        const stream = apiClient.sendMessageStream({
          conversationId,
          content,
          model,
        });

        for await (const chunk of stream) {
          if (chunk.type === "content" && chunk.content) {
            assistantContent += chunk.content;
            setCurrentStreamContent(assistantContent);

            // Update the optimistic assistant message
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === optimisticAssistantMessage.id
                  ? { ...msg, content: assistantContent }
                  : msg
              )
            );

            // Store real message IDs when we get them
            if (chunk.messageId) {
              realAssistantMessageId = chunk.messageId;
            }
            if (chunk.userMessageId) {
              realUserMessageId = chunk.userMessageId;
            }
          } else if (chunk.type === "error") {
            throw new Error(chunk.error || "Streaming error");
          } else if (chunk.type === "completed") {
            // Replace optimistic messages with real ones from the server
            if (realUserMessageId && realAssistantMessageId) {
              setMessages((prev) => {
                const filtered = prev.filter(
                  (msg) =>
                    msg.id !== optimisticUserMessage.id &&
                    msg.id !== optimisticAssistantMessage.id
                );

                return [
                  ...filtered,
                  {
                    ...optimisticUserMessage,
                    id: realUserMessageId,
                  },
                  {
                    ...optimisticAssistantMessage,
                    id: realAssistantMessageId,
                    content: assistantContent,
                    metadata: {
                      streamingComplete: true,
                      processingTime: chunk.processingTime,
                    },
                  },
                ];
              });
            }
            break;
          }
        }

        // Update last sync time
        setLastSyncTime(new Date().toISOString());
      } catch (err) {
        const apiError = err as APIError;
        setError(apiError.error || "Failed to send message");
        console.error("Send message error:", err);

        // Remove optimistic messages on error
        setMessages((prev) =>
          prev.filter(
            (msg) =>
              msg.id !== `temp-user-${Date.now()}` &&
              msg.id !== `temp-assistant-${Date.now()}`
          )
        );
      } finally {
        setIsStreaming(false);
        setCurrentStreamContent("");
        abortControllerRef.current = null;
      }
    },
    [conversationId]
  );

  const refetchMessages = useCallback(async () => {
    setNextCursor(null);
    await fetchMessages(true);
  }, [fetchMessages]);

  // Setup real-time sync interval
  useEffect(() => {
    if (conversationId && lastSyncTime && !isStreaming) {
      syncIntervalRef.current = setInterval(() => {
        syncMessages();
      }, 5000); // Sync every 5 seconds

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      };
    }
  }, [conversationId, lastSyncTime, isStreaming, syncMessages]);

  // Initial load
  useEffect(() => {
    if (conversationId) {
      fetchMessages(true);
    }
  }, [conversationId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  return {
    messages,
    loading,
    error,
    isStreaming,
    hasMore,
    sendMessage,
    refetchMessages,
    loadMoreMessages,
    currentStreamContent,
    lastSyncTime,
    syncMessages,
  };
}
