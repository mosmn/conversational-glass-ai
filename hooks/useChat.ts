"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  apiClient,
  type Message,
  type APIError,
  type StreamChunk,
  type MessagesResponse,
} from "@/lib/api/client";
import {
  streamPersistence,
  generateStreamId,
} from "@/lib/streaming/persistence";
import { StreamState, StreamProgress } from "@/lib/streaming/types";

interface UseChatReturn {
  messages: Message[];
  conversation: {
    id: string;
    title: string;
    model: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  loading: boolean;
  error: string | null;
  isStreaming: boolean;
  hasMore: boolean;
  sendMessage: (
    content: string,
    model: string,
    attachments?: any[],
    displayContent?: string
  ) => Promise<void>;
  refetchMessages: () => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  currentStreamContent: string;
  lastSyncTime: string | null;
  syncMessages: () => Promise<void>;

  // Resumable streams functionality
  currentStreamId: string | null;
  streamProgress: StreamProgress | null;
  canPauseStream: boolean;
  pauseStream: () => void;
  resumeStream: (streamId: string) => Promise<boolean>;
}

export function useChat(conversationId: string): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<{
    id: string;
    title: string;
    model: string;
    createdAt: string;
    updatedAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamContent, setCurrentStreamContent] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Resumable streaming state
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [streamProgress, setStreamProgress] = useState<StreamProgress | null>(
    null
  );

  const abortControllerRef = useRef<AbortController | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentConversationIdRef = useRef<string | null>(null);

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
          setNextCursor(response.pagination.nextCursor); // Reset cursor when resetting messages
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
      const response = await apiClient.getConversationMessages(conversationId, {
        cursor: nextCursor,
        limit: 50,
        includeMetadata: true, // Include metadata to get attachment info
      });

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
    async (
      content: string,
      model: string,
      attachments?: any[],
      displayContent?: string
    ) => {
      if (
        (!content.trim() && (!attachments || attachments.length === 0)) ||
        !conversationId
      )
        return;

      try {
        setError(null);
        setIsStreaming(true);
        setCurrentStreamContent("");

        // Create optimistic user message with complete attachment data
        const optimisticUserMessage: Message = {
          id: `temp-user-${Date.now()}`,
          role: "user",
          content: displayContent || content, // Use displayContent if provided, otherwise use content
          timestamp: new Date().toISOString(),
          metadata: {
            streamingComplete: true,
            attachments: attachments?.map((att) => ({
              type:
                att.category ||
                ((att.type.startsWith("image/")
                  ? "image"
                  : att.type === "application/pdf"
                  ? "pdf"
                  : "text") as "image" | "pdf" | "text"),
              url: att.url,
              filename: att.name,
              size: att.size,
              extractedText: att.extractedText,
              thumbnailUrl: att.thumbnailUrl,
              metadata: att.metadata,
            })),
          },
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

        // Generate stream ID for tracking
        const streamId = generateStreamId(
          conversationId,
          optimisticAssistantMessage.id
        );
        setCurrentStreamId(streamId);

        // Initialize stream state for persistence
        const initialStreamState: StreamState = {
          streamId,
          conversationId,
          messageId: optimisticAssistantMessage.id,
          userMessageId: optimisticUserMessage.id,
          content: "",
          chunkIndex: 0,
          totalTokens: 0,
          tokensPerSecond: 0,
          timeToFirstToken: 0,
          elapsedTime: 0,
          bytesReceived: 0,
          isComplete: false,
          isPaused: false,
          lastUpdateTime: Date.now(),
          model,
          provider: "unknown", // Will be updated when we get provider info
          originalPrompt: content,
          startTime: Date.now(),
        };

        // Save initial stream state
        streamPersistence.saveStreamState(initialStreamState);

        // Stream the response
        const stream = apiClient.sendMessageStream(
          {
            conversationId,
            content,
            model,
            attachments,
          },
          abortControllerRef.current.signal
        );

        let chunkIndex = 0;
        const startTime = Date.now();
        let timeToFirstToken = 0;

        try {
          for await (const chunk of stream) {
            if (chunk.type === "content" && chunk.content) {
              assistantContent += chunk.content;
              setCurrentStreamContent(assistantContent);
              chunkIndex++;

              // Track time to first token
              if (timeToFirstToken === 0 && assistantContent.length > 0) {
                timeToFirstToken = Date.now() - startTime;
              }

              // Update stream state for resumability
              const elapsedTime = Date.now() - startTime;
              const tokensPerSecond =
                chunk.totalTokens && elapsedTime > 0
                  ? Math.round((chunk.totalTokens / elapsedTime) * 1000)
                  : 0;

              const updatedStreamState: StreamState = {
                ...initialStreamState,
                content: assistantContent,
                chunkIndex,
                totalTokens: chunk.totalTokens || 0,
                tokensPerSecond,
                timeToFirstToken,
                elapsedTime,
                lastUpdateTime: Date.now(),
                provider: chunk.provider || "unknown",
              };

              // Save updated stream state every few chunks
              if (chunkIndex % 5 === 0 || chunk.finished) {
                streamPersistence.saveStreamState(updatedStreamState);
              }

              // Update stream progress
              setStreamProgress({
                phase: "streaming",
                chunksReceived: chunkIndex,
                tokensPerSecond,
                timeToFirstToken,
                elapsedTime,
                bytesReceived: assistantContent.length * 2, // Approximate bytes
                canPause: true,
                canResume: true,
                lastChunkTime: Date.now(),
              });

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

                // Generate new stream ID with the real message ID
                const realStreamId = generateStreamId(
                  conversationId,
                  chunk.messageId
                );

                // Update stream state with real message ID and new stream ID
                const realStreamState = {
                  ...updatedStreamState,
                  streamId: realStreamId,
                  messageId: chunk.messageId,
                };

                // Save with new stream ID and remove old one
                streamPersistence.saveStreamState(realStreamState);
                streamPersistence.removeStreamState(streamId); // Remove old temp ID stream

                // Update current stream ID
                setCurrentStreamId(realStreamId);
              }
              if (chunk.userMessageId) {
                realUserMessageId = chunk.userMessageId;
              }
            } else if (chunk.type === "error") {
              throw new Error(chunk.error || "Streaming error");
            } else if (
              chunk.type === "completed" ||
              chunk.type === "finished" ||
              chunk.finished
            ) {
              // Mark stream as complete
              streamPersistence.markStreamComplete(streamId);
              setCurrentStreamId(null);
              setStreamProgress({
                phase: "completing",
                chunksReceived: chunkIndex,
                tokensPerSecond:
                  chunk.totalTokens && Date.now() - startTime > 0
                    ? Math.round(
                        (chunk.totalTokens / (Date.now() - startTime)) * 1000
                      )
                    : 0,
                timeToFirstToken,
                elapsedTime: Date.now() - startTime,
                bytesReceived: assistantContent.length * 2,
                percentage: 100,
                canPause: false,
                canResume: false,
              });

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
                      // Preserve complete attachment metadata in final message
                      metadata: {
                        ...optimisticUserMessage.metadata,
                        streamingComplete: true,
                      },
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
              } else {
                // Fallback: update optimistic assistant message in-place
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === optimisticAssistantMessage.id
                      ? {
                          ...msg,
                          content: assistantContent,
                          metadata: {
                            ...msg.metadata,
                            streamingComplete: true,
                          },
                        }
                      : msg
                  )
                );
              }

              // If a title was generated, refresh the conversation data
              if (chunk.titleGenerated) {
                // Refresh conversation data to get the new title
                try {
                  const response = await apiClient.getConversationMessages(
                    conversationId,
                    { limit: 1, includeMetadata: false }
                  );
                  if (response.conversation) {
                    setConversation(response.conversation);
                  }
                } catch (error) {
                  console.error(
                    "Failed to refresh conversation after title generation:",
                    error
                  );
                }
              }
              break;
            }
          }
        } catch (streamError) {
          // Handle AbortError specifically
          if (
            streamError instanceof Error &&
            streamError.name === "AbortError"
          ) {
            console.log("🛑 Stream aborted by user");
            // Save paused stream state for potential resumption
            if (currentStreamId && assistantContent) {
              // Use real message ID if available, otherwise use temp ID
              const messageIdToUse =
                realAssistantMessageId || optimisticAssistantMessage.id;
              const streamIdToUse = realAssistantMessageId
                ? generateStreamId(conversationId, realAssistantMessageId)
                : currentStreamId;

              const pausedStreamState: StreamState = {
                ...initialStreamState,
                streamId: streamIdToUse,
                messageId: messageIdToUse,
                content: assistantContent,
                chunkIndex,
                isPaused: true,
                lastUpdateTime: Date.now(),
                elapsedTime: Date.now() - startTime,
              };
              streamPersistence.saveStreamState(pausedStreamState);

              // Remove old stream if we created a new one
              if (streamIdToUse !== currentStreamId) {
                streamPersistence.removeStreamState(currentStreamId);
              }
            }

            // Update UI to show the stream was paused
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === optimisticAssistantMessage.id
                  ? {
                      ...msg,
                      content: assistantContent || "...", // Keep partial content or show dots if no content
                      metadata: {
                        ...msg.metadata,
                        streamingComplete: false,
                        error: false,
                      },
                    }
                  : msg
              )
            );
            return; // Exit gracefully, don't throw error
          } else if (
            streamError instanceof Error &&
            (streamError.message.includes("Controller is already closed") ||
              streamError.message.includes("Invalid state"))
          ) {
            // Handle controller closed errors gracefully - these happen when stream is aborted
            console.log(
              "🛑 Stream controller closed (normal for aborted streams)"
            );

            // Save paused stream state for potential resumption
            if (currentStreamId && assistantContent) {
              // Use real message ID if available, otherwise use temp ID
              const messageIdToUse =
                realAssistantMessageId || optimisticAssistantMessage.id;
              const streamIdToUse = realAssistantMessageId
                ? generateStreamId(conversationId, realAssistantMessageId)
                : currentStreamId;

              const pausedStreamState: StreamState = {
                ...initialStreamState,
                streamId: streamIdToUse,
                messageId: messageIdToUse,
                content: assistantContent,
                chunkIndex,
                isPaused: true,
                lastUpdateTime: Date.now(),
                elapsedTime: Date.now() - startTime,
              };
              streamPersistence.saveStreamState(pausedStreamState);

              // Remove old stream if we created a new one
              if (streamIdToUse !== currentStreamId) {
                streamPersistence.removeStreamState(currentStreamId);
              }
            }

            // Update UI to show the stream was stopped (keep the partial content)
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === optimisticAssistantMessage.id
                  ? {
                      ...msg,
                      content: assistantContent || "...", // Keep partial content or show dots
                      metadata: {
                        ...msg.metadata,
                        streamingComplete: false,
                        error: false,
                      },
                    }
                  : msg
              )
            );
            return; // Exit gracefully, don't throw error
          } else {
            // Re-throw other errors
            throw streamError;
          }
        }

        // Update last sync time
        setLastSyncTime(new Date().toISOString());
      } catch (err) {
        const apiError = err as APIError;

        // Don't show error for abort-related errors
        if (
          apiError.error?.includes("Controller is already closed") ||
          apiError.error?.includes("Invalid state") ||
          apiError.error?.includes("AbortError")
        ) {
          console.log("🛑 Stream was aborted, not showing error to user");
          return; // Exit gracefully
        }

        setError(apiError.error || "Failed to send message");
        console.error("Send message error:", err);

        // Mark stream as errored if we have a stream ID
        if (currentStreamId) {
          const streamState = streamPersistence.getStreamState(currentStreamId);
          if (streamState) {
            streamPersistence.saveStreamState({
              ...streamState,
              error: apiError.error || "Failed to send message",
              isComplete: true,
            });
          }
        }

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
        setCurrentStreamId(null);
        setStreamProgress(null);
        abortControllerRef.current = null;
      }
    },
    [conversationId]
  );

  const refetchMessages = useCallback(async () => {
    setNextCursor(null);
    await fetchMessages(true);
  }, [fetchMessages]);

  // Resumable streaming functions
  const pauseStream = useCallback(() => {
    if (currentStreamId && abortControllerRef.current) {
      console.log(`🛑 Aborting stream: ${currentStreamId}`);

      // BEFORE aborting, save the current state with current content
      const currentState = streamPersistence.getStreamState(currentStreamId);
      if (currentState && currentStreamContent) {
        const pausedState = {
          ...currentState,
          content: currentStreamContent, // Use the current streamed content
          isPaused: true,
          lastUpdateTime: Date.now(),
        };
        streamPersistence.saveStreamState(pausedState);
        console.log(
          `💾 Saved paused stream state: ${currentStreamId} with ${currentStreamContent.length} chars`
        );
      }

      abortControllerRef.current.abort();

      // Immediately update UI state
      setIsStreaming(false);
      setCurrentStreamContent("");
      setCurrentStreamId(null);
      setStreamProgress(null);

      console.log(`✅ Stream aborted successfully: ${currentStreamId}`);
    } else {
      console.log("⚠️ No active stream to abort", {
        currentStreamId,
        hasAbortController: !!abortControllerRef.current,
      });
    }
  }, [currentStreamId, currentStreamContent]);

  const resumeStream = useCallback(
    async (streamId: string): Promise<boolean> => {
      try {
        console.log(`🔄 Attempting to resume stream: ${streamId}`);

        const streamState = streamPersistence.getStreamState(streamId);
        if (!streamState) {
          console.error("Stream state not found for:", streamId);
          return false;
        }

        // Call the resume API (handled by useStreamRecovery hook)
        // This is a placeholder - the actual resume is handled by the RecoveryBanner component
        return true;
      } catch (error) {
        console.error("Resume stream error:", error);
        return false;
      }
    },
    []
  );

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

  // Reset state and load messages when conversationId changes
  useEffect(() => {
    console.log("useChat: conversationId changed to:", conversationId);

    // Prevent duplicate calls for the same conversation
    if (conversationId === currentConversationIdRef.current) {
      console.log("useChat: Skipping duplicate call for same conversationId");
      return;
    }

    currentConversationIdRef.current = conversationId;

    if (conversationId) {
      // Clear previous state
      setMessages([]);
      setConversation(null);
      setError(null);
      setHasMore(false);
      setNextCursor(null);
      setLastSyncTime(null);
      setCurrentStreamContent("");
      setIsStreaming(false);

      // Load new messages
      const loadMessages = async () => {
        try {
          setLoading(true);
          setError(null);
          console.log(
            "useChat: Loading messages for conversation:",
            conversationId
          );

          const response = await apiClient.getConversationMessages(
            conversationId,
            {
              limit: 50,
              includeMetadata: true,
            }
          );

          console.log("useChat: Received response:", {
            messagesCount: response.messages.length,
            conversation: response.conversation,
            hasMore: response.pagination.hasMore,
          });

          setMessages(response.messages);
          setConversation(response.conversation);
          setHasMore(response.pagination.hasMore);
          setNextCursor(response.pagination.nextCursor);
          setLastSyncTime(response.sync.currentTimestamp);
        } catch (err) {
          const apiError = err as APIError;
          setError(apiError.error || "Failed to fetch messages");
          console.error("useChat: Fetch messages error:", err);
        } finally {
          setLoading(false);
        }
      };

      loadMessages();
    } else {
      // Clear everything if no conversationId
      currentConversationIdRef.current = null;
      setMessages([]);
      setConversation(null);
      setLoading(false);
      setError(null);
      setHasMore(false);
      setNextCursor(null);
      setLastSyncTime(null);
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
    conversation,
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

    // Resumable streams
    currentStreamId,
    streamProgress,
    canPauseStream: isStreaming && currentStreamId !== null,
    pauseStream,
    resumeStream,
  };
}
