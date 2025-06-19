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
import { useStreamingFailureHandler } from "./useStreamingFailureHandler";
import {
  chatErrorHandler,
  ErrorCategory,
} from "@/lib/utils/chat-error-handler";

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
    displayContent?: string,
    searchResults?: any[],
    searchQuery?: string,
    searchProvider?: string
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

  // Recovery state
  isRecovering: boolean;
}

// Streaming performance optimization constants
const STREAMING_PERF_CONFIG = {
  // Much simpler and less frequent updates
  UI_UPDATE_THROTTLE_MS: 500, // Even less frequent UI updates

  // FIXED: Multiple persistence triggers to ensure all providers get saved
  PERSISTENCE_FREQUENCY: 20, // REDUCED from 100 to 20 chunks for faster saves
  PERSISTENCE_TIME_INTERVAL: 3000, // NEW: Save every 3 seconds regardless of chunks
  PERSISTENCE_CONTENT_LENGTH: 500, // NEW: Save every 500 characters of content
  PERSISTENCE_MIN_INTERVAL: 1000, // REDUCED from 10000 to 1000ms for more responsive saves

  // Disable most memory management to reduce complexity
  MAX_CONTENT_LENGTH: 500000, // Increase to 500KB (less truncation)
  MEMORY_CLEANUP_INTERVAL: 1000, // Much less frequent cleanup

  // Disable all debug logging and performance monitoring
  PERFORMANCE_LOG_INTERVAL: 10000, // Very infrequent
  ENABLE_DEBUG_LOGS: false,
};

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

  // Recovery state
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempted, setRecoveryAttempted] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentConversationIdRef = useRef<string | null>(null);

  // CRITICAL FIX: Add recovery streaming support
  // This was missing - we need to listen for recovery stream events
  // and update the UI in real-time during recovery
  useEffect(() => {
    const handleRecoveryStreamUpdate = (event: CustomEvent) => {
      const { messageId, content, type, isRecovery } = event.detail;

      if (!isRecovery || !messageId) return;

      console.log("🔄 RECOVERY UI UPDATE:", {
        messageId,
        content: content?.substring(0, 50) + "...",
        type,
        isRecovery,
      });

      if (type === "content") {
        // Update the message content in real-time during recovery
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  content: msg.content + content, // Append new content
                  metadata: {
                    ...msg.metadata,
                    streamingComplete: false,
                    isRecovering: false,
                    isResuming: true, // Show that it's actively resuming
                  },
                }
              : msg
          )
        );

        // Update current stream content for display
        setCurrentStreamContent((prev) => prev + content);
        setIsStreaming(true);

        // CRITICAL FIX: Also trigger auto-scroll during recovery
        // Force scroll to bottom to ensure user sees the streaming content
        setTimeout(() => {
          const viewport = document.querySelector(
            "[data-radix-scroll-area-viewport]"
          );
          if (viewport) {
            viewport.scrollTo({
              top: viewport.scrollHeight,
              behavior: "smooth",
            });
          }
        }, 50);
      } else if (type === "completed") {
        // Mark recovery as complete
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  metadata: {
                    ...msg.metadata,
                    streamingComplete: true,
                    isRecovering: false,
                    isResuming: false,
                    wasResumed: true, // Mark as successfully resumed
                  },
                }
              : msg
          )
        );

        // Clean up streaming state
        setCurrentStreamContent("");
        setIsStreaming(false);
        setCurrentStreamId(null);
        setStreamProgress(null);
      } else if (type === "error") {
        // Handle recovery error
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  content:
                    msg.content +
                    "\n\n[Recovery failed - message may be incomplete]",
                  metadata: {
                    ...msg.metadata,
                    streamingComplete: true,
                    isRecovering: false,
                    isResuming: false,
                    recoveryFailed: true,
                    recoveryError: event.detail.error,
                  },
                }
              : msg
          )
        );

        // Clean up streaming state
        setCurrentStreamContent("");
        setIsStreaming(false);
        setCurrentStreamId(null);
        setStreamProgress(null);
      }
    };

    // Listen for recovery stream updates
    window.addEventListener(
      "recovery-stream-update",
      handleRecoveryStreamUpdate as EventListener
    );

    return () => {
      window.removeEventListener(
        "recovery-stream-update",
        handleRecoveryStreamUpdate as EventListener
      );
    };
  }, []);

  // Streaming failure handler
  const { handleStreamingFailure, handleIncompleteMessage } =
    useStreamingFailureHandler({
      conversationId,
      onRetryMessage: async (
        content,
        model,
        attachments,
        displayContent,
        searchResults
      ) => {
        await sendMessage(
          content,
          model,
          attachments,
          displayContent,
          searchResults
        );
      },
      onRemoveMessage: (messageId) => {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      },
      onRemoveMessages: (messageIds) => {
        setMessages((prev) =>
          prev.filter((msg) => !messageIds.includes(msg.id))
        );
      },
    });

  const fetchMessages = useCallback(
    async (reset = false) => {
      if (!conversationId) return;

      // Don't fetch messages if we're actively streaming to avoid the "Message incomplete" issue
      if (isStreaming && !reset) {
        if (STREAMING_PERF_CONFIG.ENABLE_DEBUG_LOGS) {
          console.log("⏸️ Skipping fetchMessages during active streaming");
        }
        return;
      }

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

        // Sort messages by timestamp and filter out incomplete ones
        const sortedMessages = response.messages
          .filter((msg) => {
            // Filter out temporary optimistic messages that somehow got persisted
            if (msg.id.startsWith("temp-")) {
              console.warn(
                "🚨 Temporary message found in API response, filtering out:",
                msg.id
              );
              return false;
            }

            // Filter out incomplete messages
            if (msg.error === "Message incomplete") {
              handleIncompleteMessage(msg);
              return false;
            }
            return true;
          })
          .sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

        if (reset) {
          setMessages(sortedMessages);
          setNextCursor(response.pagination.nextCursor); // Reset cursor when resetting messages
        } else {
          // Combine existing messages with new ones and sort
          setMessages((prev) => {
            const combined = [...sortedMessages, ...prev];
            return combined.sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime()
            );
          });
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

      // Sort messages by timestamp and combine with existing
      const sortedMessages = response.messages
        .filter((msg) => {
          // Filter out temporary optimistic messages
          if (msg.id.startsWith("temp-")) {
            console.warn(
              "🚨 Temporary message found in loadMore, filtering out:",
              msg.id
            );
            return false;
          }
          return true;
        })
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

      setMessages((prev) => {
        const combined = [...sortedMessages, ...prev];
        return combined.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });

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

          // Add new messages (excluding temporary ones)
          syncResponse.newMessages
            .filter((msg) => !msg.id.startsWith("temp-"))
            .forEach((newMsg) => {
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
      displayContent?: string,
      searchResults?: any[],
      searchQuery?: string,
      searchProvider?: string
    ) => {
      if (!conversationId || isStreaming) return;

      // Declare optimistic messages at function level for error handling
      let optimisticUserMessage: Message;
      let optimisticAssistantMessage: Message;

      try {
        setError(null);
        setIsStreaming(true);
        setCurrentStreamContent("");

        // Only log in debug mode
        if (STREAMING_PERF_CONFIG.ENABLE_DEBUG_LOGS) {
          console.log("📡 API call:", {
            model,
            conversationId,
            hasAttachments: !!attachments?.length,
          });
        }

        // Create optimistic user message
        const timestamp = new Date().toISOString();
        optimisticUserMessage = {
          id: `temp-user-${Date.now()}`,
          role: "user",
          content: displayContent || content,
          timestamp,
          metadata: {
            streamingComplete: true,
            attachments: attachments?.map((att) => ({
              type:
                att.category ||
                (att.type.split("/")[0] as "image" | "pdf" | "text"),
              url: att.url,
              filename: att.name,
              size: att.size,
              extractedText: att.extractedText,
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
          timestamp: new Date(Date.now() + 1000).toISOString(), // Add 1 second to ensure it sorts after the user message
          metadata: { streamingComplete: false },
        };

        // Add optimistic messages to UI and ensure they're sorted
        setMessages((prev) => {
          const updatedMessages = [
            ...prev,
            optimisticUserMessage,
            optimisticAssistantMessage,
          ];
          return updatedMessages.sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });

        // Cancel any existing stream
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        let assistantContent = "";
        let realUserMessageId = "";
        let realAssistantMessageId = "";

        // Generate stream ID for tracking
        let streamId = generateStreamId(
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
            displayContent, // Pass displayContent for search-enhanced messages
            searchResults, // Pass search results to be stored with assistant message
            searchQuery, // Pass search query used
            searchProvider, // Pass search provider used
            attachments,
          },
          abortControllerRef.current.signal
        );

        let chunkIndex = 0;
        const startTime = Date.now();
        let timeToFirstToken = 0;

        // Simplified performance variables
        let lastUIUpdate = 0;

        // FIXED: Multiple persistence tracking for all provider types
        let lastPersistenceTime = Date.now();
        let lastPersistedContentLength = 0;

        // SIMPLIFIED content update function - removed complex deduplication
        const updateStreamContent = (
          newContent: string,
          forceUpdate: boolean = false
        ) => {
          // Simple append - let the server handle deduplication
          assistantContent += newContent;

          // Throttled UI update to prevent excessive re-renders
          const now = Date.now();
          if (
            forceUpdate ||
            now - lastUIUpdate >= STREAMING_PERF_CONFIG.UI_UPDATE_THROTTLE_MS
          ) {
            lastUIUpdate = now;

            // Simple truncation if content gets too large
            const displayContent =
              assistantContent.length > STREAMING_PERF_CONFIG.MAX_CONTENT_LENGTH
                ? assistantContent.substring(
                    0,
                    STREAMING_PERF_CONFIG.MAX_CONTENT_LENGTH
                  ) + "\n\n[Content truncated...]"
                : assistantContent;

            setCurrentStreamContent(displayContent);

            // Update message content
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === optimisticAssistantMessage.id
                  ? { ...msg, content: displayContent }
                  : msg
              )
            );
          }
        };

        try {
          for await (const chunk of stream) {
            // Only log chunks in debug mode to prevent console spam
            if (
              STREAMING_PERF_CONFIG.ENABLE_DEBUG_LOGS &&
              chunk.type === "content" &&
              chunk.content
            ) {
              console.log("📡 Chunk:", {
                length: chunk.content.length,
                index: chunkIndex + 1,
              });
            }

            if (chunk.type === "content" && chunk.content) {
              chunkIndex++;

              // Direct content update - server already handles batching
              updateStreamContent(chunk.content);

              // Track time to first token
              if (timeToFirstToken === 0 && assistantContent.length > 0) {
                timeToFirstToken = Date.now() - startTime;
              }

              // FIXED: Multiple persistence triggers for all provider types
              const now = Date.now();
              const timeSinceLastPersistence = now - lastPersistenceTime;
              const contentLengthDelta =
                assistantContent.length - lastPersistedContentLength;

              const shouldPersist =
                chunkIndex % STREAMING_PERF_CONFIG.PERSISTENCE_FREQUENCY ===
                  0 || // Every 20 chunks
                timeSinceLastPersistence >=
                  STREAMING_PERF_CONFIG.PERSISTENCE_TIME_INTERVAL || // Every 3 seconds
                contentLengthDelta >=
                  STREAMING_PERF_CONFIG.PERSISTENCE_CONTENT_LENGTH || // Every 500 characters
                chunk.finished; // On completion

              if (
                shouldPersist &&
                timeSinceLastPersistence >=
                  STREAMING_PERF_CONFIG.PERSISTENCE_MIN_INTERVAL
              ) {
                // Save stream state with multiple triggers
                try {
                  const updatedStreamState: StreamState = {
                    ...initialStreamState,
                    streamId,
                    messageId:
                      realAssistantMessageId || initialStreamState.messageId,
                    content: assistantContent,
                    chunkIndex,
                    totalTokens: chunk.totalTokens || 0,
                    lastUpdateTime: now,
                    provider: chunk.provider || "unknown",
                  };

                  streamPersistence.saveStreamState(updatedStreamState);

                  // Update tracking variables
                  lastPersistenceTime = now;
                  lastPersistedContentLength = assistantContent.length;

                  if (STREAMING_PERF_CONFIG.ENABLE_DEBUG_LOGS) {
                    console.log(
                      `💾 Stream persisted: chunks=${chunkIndex}, content=${assistantContent.length}chars, time=${timeSinceLastPersistence}ms`
                    );
                  }
                } catch (persistError) {
                  // Silently ignore persistence errors to prevent crashes
                  if (STREAMING_PERF_CONFIG.ENABLE_DEBUG_LOGS) {
                    console.warn("Persistence error:", persistError);
                  }
                }
              }

              // REMOVED complex memory management and performance logging

              // SIMPLIFIED: Just store message IDs without complex migration
              if (chunk.messageId) {
                realAssistantMessageId = chunk.messageId;
              }
              if (chunk.userMessageId) {
                realUserMessageId = chunk.userMessageId;
              }
            } else if (chunk.type === "error") {
              // Force final UI update before error handling
              updateStreamContent("", true);

              // Remove optimistic messages immediately when we get an error
              setMessages((prev) =>
                prev.filter(
                  (msg) =>
                    msg.id !== optimisticUserMessage.id &&
                    msg.id !== optimisticAssistantMessage.id
                )
              );

              // Clear streaming state and cleanup
              setCurrentStreamContent("");
              setCurrentStreamId(null);
              setStreamProgress(null);

              // No batching state to cleanup with simplified approach

              // Use enhanced error handling for streaming errors
              await chatErrorHandler.handleStreamingError(
                new Error(chunk.error || "Streaming error"),
                {
                  conversationId,
                  messageId: optimisticAssistantMessage.id,
                  streamId: currentStreamId || undefined,
                },
                async () => {
                  // Retry callback - resend the message
                  await sendMessage(
                    content,
                    model,
                    attachments,
                    displayContent,
                    searchResults,
                    searchQuery,
                    searchProvider
                  );
                }
              );

              // Don't throw - error is already handled
              return;
            } else if (
              chunk.type === "completed" ||
              chunk.type === "finished" ||
              chunk.finished
            ) {
              // Force final UI update before completion
              updateStreamContent("", true);

              // Mark stream as complete and clear current stream
              streamPersistence.markStreamComplete(streamId);
              setCurrentStreamId(null);

              // SIMPLIFIED: No automatic cleanup on completion to improve performance

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

                  const newMessages = [
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
                        ...(chunk.searchResults
                          ? {
                              searchResults: chunk.searchResults,
                              searchQuery: chunk.searchQuery,
                              searchProvider: chunk.searchProvider,
                            }
                          : {}),
                      },
                    },
                  ];

                  // CRITICAL FIX: Sort messages by timestamp to ensure proper order
                  return newMessages.sort(
                    (a, b) =>
                      new Date(a.timestamp).getTime() -
                      new Date(b.timestamp).getTime()
                  );
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

        // Use enhanced error handling to categorize and show appropriate UI
        const chatError = await chatErrorHandler.handleError(
          err,
          ErrorCategory.AI_PROVIDER,
          {
            context: {
              conversationId,
              model,
              provider: model.includes("/") ? model.split("/")[0] : undefined,
              endpoint: "chat/send",
            },
            showToast: true,
            suggestRecovery: true,
          }
        );

        // Set generic error state for the component (the specific error is handled by the toast)
        setError("Failed to send message");
        console.error("Send message error:", err);

        // Remove any temporary messages on error
        setMessages((prev) =>
          prev.filter(
            (msg) =>
              !msg.id.startsWith("temp-user-") &&
              !msg.id.startsWith("temp-assistant-")
          )
        );

        // Mark stream as errored if we have a stream ID
        if (currentStreamId) {
          const streamState = streamPersistence.getStreamState(currentStreamId);
          if (streamState) {
            streamPersistence.saveStreamState({
              ...streamState,
              error: chatError.userMessage,
              isComplete: true,
            });
          }
        }
      } finally {
        // Final cleanup of streaming state and performance resources
        setIsStreaming(false);
        setCurrentStreamContent("");
        setCurrentStreamId(null);
        setStreamProgress(null);
        abortControllerRef.current = null;

        console.log(`🏁 Streaming cleanup completed`);
      }
    },
    [conversationId] // CRITICAL FIX: Removed handleStreamingFailure to prevent circular dependencies
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

  // New function to check for and resume interrupted streams
  const checkAndResumeInterruptedStreams = useCallback(async () => {
    if (!conversationId || recoveryAttempted) return;

    try {
      // Simple check for recoverable streams without extensive logging
      const recoverableStreams =
        streamPersistence.getRecoverableStreams(conversationId);

      if (recoverableStreams.length === 0) {
        console.log("✅ No recoverable streams found");
        setRecoveryAttempted(true);
        return;
      }

      console.log(`🔄 Found ${recoverableStreams.length} recoverable streams`);

      // Find the most recent recoverable stream
      const latestStream = recoverableStreams.sort(
        (a, b) => b.interruptedAt - a.interruptedAt
      )[0];

      if (!latestStream.canRecover) {
        if (STREAMING_PERF_CONFIG.ENABLE_DEBUG_LOGS) {
          console.log(
            "❌ Latest stream cannot be recovered:",
            latestStream.errorMessage
          );
        }
        setRecoveryAttempted(true);
        return;
      }

      if (STREAMING_PERF_CONFIG.ENABLE_DEBUG_LOGS) {
        console.log("🎯 Attempting to recover stream:", latestStream.streamId);
      }

      setIsRecovering(true);
      setRecoveryAttempted(true);

      // Get the original stream state to extract necessary data
      const originalStreamState = streamPersistence.getStreamState(
        latestStream.streamId
      );
      if (!originalStreamState) {
        console.error("❌ Original stream state not found");
        setIsRecovering(false);
        return;
      }

      // Use a more reliable way to find incomplete messages without depending on current messages
      const messageIdToRecover = originalStreamState.messageId;
      console.log(`🔧 Attempting to recover message: ${messageIdToRecover}`);
      console.log(
        `📝 Existing content length: ${latestStream.lastContent.length} chars`
      );

      // CRITICAL: Double-check that this is not a temporary message
      if (messageIdToRecover?.startsWith("temp-")) {
        console.error(
          "🚨 CRITICAL: Attempted to recover temporary message, aborting:",
          messageIdToRecover
        );
        setIsRecovering(false);
        setRecoveryAttempted(true);
        // Clean up the invalid stream state
        streamPersistence.removeStreamState(latestStream.streamId);
        return;
      }

      // CRITICAL SAFETY CHECK: Prevent recovery of messages that already exist and are complete
      const existingMessage = messages.find(
        (msg) => msg.id === messageIdToRecover
      );
      if (
        existingMessage &&
        existingMessage.metadata?.streamingComplete !== false
      ) {
        console.error(
          "🚨 CRITICAL: Attempted to recover message that already exists and is complete:",
          messageIdToRecover,
          existingMessage
        );
        setIsRecovering(false);
        setRecoveryAttempted(true);
        // Clean up the invalid stream state
        streamPersistence.removeStreamState(latestStream.streamId);
        return;
      }

      // Set streaming state
      setIsStreaming(true);
      setCurrentStreamContent(latestStream.lastContent);
      setCurrentStreamId(latestStream.streamId);

      // Call the resume API
      const response = await fetch("/api/chat/resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          streamId: latestStream.streamId,
          fromChunkIndex: originalStreamState.chunkIndex || 0,
          conversationId,
          messageId: originalStreamState.messageId,
          model: latestStream.model,
          lastKnownContent: latestStream.lastContent,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Resume API failed: ${response.status} ${response.statusText}`
        );
      }

      console.log("✅ Resume API call successful, processing stream...");

      // Process the resumed stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No reader available from resume response");
      }

      const decoder = new TextDecoder();
      let resumedContent = latestStream.lastContent;
      let newStreamId = latestStream.streamId;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              if (dataStr === "[DONE]") continue;

              try {
                const data = JSON.parse(dataStr);

                if (data.type === "resumed") {
                  console.log("🔄 Stream resumed:", data);
                  newStreamId = data.streamId;
                  setCurrentStreamId(newStreamId);

                  // Update message to show it's being resumed - only find the message once
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === messageIdToRecover ||
                      msg.id.startsWith("temp-assistant-")
                        ? {
                            ...msg,
                            content: latestStream.lastContent,
                            metadata: {
                              ...msg.metadata,
                              streamingComplete: false,
                              isRecovering: false,
                              isResuming: true,
                            },
                          }
                        : msg
                    )
                  );
                } else if (data.type === "content" && data.content) {
                  resumedContent += data.content;
                  setCurrentStreamContent(resumedContent);

                  // Update message content
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === messageIdToRecover ||
                      msg.id.startsWith("temp-assistant-")
                        ? { ...msg, content: resumedContent }
                        : msg
                    )
                  );
                } else if (
                  data.type === "completed" ||
                  data.type === "finished"
                ) {
                  console.log("✅ Stream resumption completed:", data);

                  // Mark stream as complete
                  streamPersistence.markStreamComplete(newStreamId);

                  // Simple cleanup - just remove the original stream state
                  if (latestStream.streamId !== newStreamId) {
                    streamPersistence.removeStreamState(latestStream.streamId);
                  }

                  // Update final message
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === messageIdToRecover ||
                      msg.id.startsWith("temp-assistant-")
                        ? {
                            ...msg,
                            content: resumedContent,
                            metadata: {
                              ...msg.metadata,
                              streamingComplete: true,
                              isResuming: false,
                              wasResumed: true,
                              originalStreamId: latestStream.streamId,
                              resumedStreamId: newStreamId,
                            },
                          }
                        : msg
                    )
                  );

                  break;
                } else if (data.type === "error") {
                  console.error("❌ Resume stream error:", data.error);
                  throw new Error(data.error);
                }
              } catch (parseError) {
                console.warn(
                  "Failed to parse resume stream chunk:",
                  parseError
                );
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      console.log("🎉 Stream recovery completed successfully");
    } catch (error) {
      console.error("💥 Stream recovery failed:", error);

      // Update message to show recovery failed - minimize state updates
      setMessages((prev) =>
        prev.map((msg) =>
          msg.metadata?.isRecovering || msg.metadata?.isResuming
            ? {
                ...msg,
                content:
                  msg.content +
                  "\n\n[Recovery failed - message may be incomplete]",
                metadata: {
                  ...msg.metadata,
                  streamingComplete: true,
                  isRecovering: false,
                  isResuming: false,
                  recoveryFailed: true,
                  recoveryError:
                    error instanceof Error ? error.message : "Unknown error",
                },
              }
            : msg
        )
      );

      // Clean up failed stream state
      if (currentStreamId) {
        streamPersistence.removeStreamState(currentStreamId);
      }
    } finally {
      setIsStreaming(false);
      setCurrentStreamContent("");
      setCurrentStreamId(null);
      setStreamProgress(null);
      setIsRecovering(false);
    }
  }, [conversationId, recoveryAttempted, currentStreamId]);

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
      setIsRecovering(false);
      setRecoveryAttempted(false);

      // Load new messages
      const loadMessages = async () => {
        try {
          setLoading(true);
          setError(null);
          console.log(
            "useChat: Loading messages for conversation:",
            conversationId
          );

          // Clean up any temporary message streams before loading
          streamPersistence.cleanupTemporaryMessageStreams();

          // Also clean up any completed streams that shouldn't be recoverable
          streamPersistence.cleanupOldStreams();
          if (STREAMING_PERF_CONFIG.ENABLE_DEBUG_LOGS) {
            console.log(
              "🧹 Cleaned up completed and temporary streams before loading conversation"
            );
          }

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

          // Filter out temporary messages and incomplete ones
          const filteredMessages = response.messages.filter((msg) => {
            // Filter out temporary optimistic messages
            if (msg.id.startsWith("temp-")) {
              console.warn(
                "🚨 Temporary message found in initial load, filtering out:",
                msg.id
              );
              return false;
            }

            // Filter out incomplete messages
            if (msg.error === "Message incomplete") {
              console.warn(
                "⚠️ Incomplete message found in initial load, filtering out:",
                msg.id
              );
              return false;
            }

            return true;
          });

          setMessages(filteredMessages);
          setConversation(response.conversation);
          setHasMore(response.pagination.hasMore);
          setNextCursor(response.pagination.nextCursor);
          setLastSyncTime(response.sync.currentTimestamp);

          // Re-enable stream recovery but keep it simple and lightweight
          setTimeout(() => {
            checkAndResumeInterruptedStreams();
          }, 1000); // Slightly longer delay to ensure messages are loaded first
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
      setIsRecovering(false);
      setRecoveryAttempted(false);
    }
  }, [conversationId]); // CRITICAL FIX: Removed checkAndResumeInterruptedStreams from dependencies to prevent infinite loop

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

    // Recovery state
    isRecovering,
  };
}
