"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { streamPersistence } from "@/lib/streaming/persistence";
import {
  StreamRecoveryData,
  StreamState,
  StreamRecoveryError,
} from "@/lib/streaming/types";

interface UseStreamRecoveryOptions {
  conversationId?: string;
  autoDetect?: boolean; // Automatically detect recoverable streams
  showNotifications?: boolean; // Show toast notifications
}

interface UseStreamRecoveryReturn {
  recoverableStreams: StreamRecoveryData[];
  isLoading: boolean;
  error: string | null;
  canRecover: boolean;

  // Actions
  detectRecoverableStreams: () => Promise<void>;
  resumeStream: (streamId: string) => Promise<boolean>;
  discardStream: (streamId: string) => void;
  discardAllStreams: () => void;
  getStreamDetails: (streamId: string) => StreamState | null;
  triggerDetection: () => void; // Manual trigger for immediate detection

  // Statistics
  storageStats: {
    totalStreams: number;
    incompleteStreams: number;
    storageUsed: number;
    oldestStream?: number;
  };
}

export function useStreamRecovery({
  conversationId,
  autoDetect = true,
  showNotifications = true,
}: UseStreamRecoveryOptions = {}): UseStreamRecoveryReturn {
  const { toast } = useToast();

  const [recoverableStreams, setRecoverableStreams] = useState<
    StreamRecoveryData[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState({
    totalStreams: 0,
    incompleteStreams: 0,
    storageUsed: 0,
  });

  // Calculate stream progress percentage
  const calculateStreamProgress = (
    chunkIndex: number,
    totalTokens?: number,
    elapsedTime?: number
  ): number => {
    if (totalTokens && totalTokens > 0) {
      // If we have total tokens, use that for accurate progress
      return Math.min(90, (chunkIndex / totalTokens) * 100);
    } else if (elapsedTime && elapsedTime > 0) {
      // Estimate based on elapsed time
      const estimatedProgress = Math.min(80, (elapsedTime / 30000) * 100);
      return estimatedProgress;
    } else {
      // Default to chunk-based estimation
      return Math.min(70, chunkIndex * 5);
    }
  };

  /**
   * Detect recoverable streams for the current conversation
   */
  const detectRecoverableStreams = useCallback(async () => {
    if (!conversationId) {
      console.log("No conversationId provided for stream detection");
      setRecoverableStreams([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log(
        `🔍 Detecting recoverable streams for conversation: ${conversationId}`
      );

      // Get all stored stream states
      const allStreams = streamPersistence.getIncompleteStreams();
      console.log(`📊 Total streams in storage: ${allStreams.length}`);

      // Filter streams for this conversation
      const conversationStreams = allStreams.filter((stream: StreamState) => {
        const matches =
          stream.conversationId === conversationId &&
          !stream.isComplete &&
          stream.content?.length > 0; // Only include streams with actual content

        if (matches) {
          console.log(`✅ Found recoverable stream:`, {
            streamId: stream.streamId,
            messageId: stream.messageId,
            contentLength: stream.content?.length,
            isPaused: stream.isPaused,
            chunkIndex: stream.chunkIndex,
          });
        }

        return matches;
      });

      console.log(
        `🎯 Found ${conversationStreams.length} recoverable streams for this conversation`
      );

      // Convert to recovery data format
      const recoverableData: StreamRecoveryData[] = conversationStreams.map(
        (stream: StreamState) => ({
          streamId: stream.streamId,
          conversationId: stream.conversationId,
          messageId: stream.messageId,
          lastContent: stream.content,
          progress: calculateStreamProgress(
            stream.chunkIndex,
            stream.totalTokens,
            stream.elapsedTime
          ),
          timestamp: stream.lastUpdateTime,
          model: stream.model,
          provider: stream.provider,
          error: null,
          canResume: true,
          canRecover: true,
          interruptedAt: stream.lastUpdateTime,
          estimatedCompletion:
            stream.elapsedTime > 0
              ? Math.max(5000, stream.elapsedTime * 2)
              : 10000, // Estimate based on elapsed time
        })
      );

      setRecoverableStreams(recoverableData);

      console.log(
        `🎉 Detection complete: ${recoverableData.length} streams ready for recovery`
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Detection failed";
      console.error("Stream detection error:", err);
      setError(errorMessage);
      setRecoverableStreams([]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  /**
   * Resume a specific stream
   */
  const resumeStream = useCallback(
    async (streamId: string): Promise<boolean> => {
      try {
        setIsLoading(true);
        setError(null);

        console.log(`🔄 Attempting to resume stream: ${streamId}`);

        // Get the stream state
        const streamState = streamPersistence.getStreamState(streamId);
        if (!streamState) {
          throw new StreamRecoveryError("Stream state not found", streamId);
        }

        // Call the resume API (streaming response)
        const response = await fetch("/api/chat/resume", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            streamId,
            fromChunkIndex: streamState.chunkIndex + 1,
            conversationId: streamState.conversationId,
            messageId: streamState.messageId,
            model: streamState.model,
            lastKnownContent: streamState.content,
          }),
        });

        if (!response.ok) {
          throw new Error(`Resume request failed: ${response.statusText}`);
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body for streaming");
        }

        let resumedFromChunk = 0;
        let resumeSuccessful = false;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  console.log("📡 Resume stream chunk:", data);

                  if (data.type === "resumed") {
                    resumedFromChunk = data.resumedFromChunk;
                    console.log(
                      `🔄 Stream resumed from chunk ${resumedFromChunk}`
                    );
                  } else if (data.type === "content") {
                    // CRITICAL FIX: Handle streaming content updates during recovery
                    // This is what was missing - we need to emit the content chunks
                    // so the UI can update in real-time like normal streaming

                    // The recovery streaming should trigger the same UI updates
                    // as regular streaming. We need to dispatch a custom event
                    // that the main useChat hook can listen to.
                    console.log("📥 RECOVERY CONTENT CHUNK:", {
                      content: data.content,
                      messageId: data.messageId,
                      streamId,
                    });

                    // Dispatch custom event for recovery streaming updates
                    window.dispatchEvent(
                      new CustomEvent("recovery-stream-update", {
                        detail: {
                          streamId,
                          messageId: data.messageId || streamState.messageId,
                          content: data.content,
                          type: "content",
                          isRecovery: true,
                        },
                      })
                    );
                  } else if (data.type === "completed") {
                    resumeSuccessful = true;
                    console.log(`✅ Stream resume completed: ${data.streamId}`);

                    // Dispatch completion event
                    window.dispatchEvent(
                      new CustomEvent("recovery-stream-update", {
                        detail: {
                          streamId,
                          messageId: data.messageId || streamState.messageId,
                          type: "completed",
                          isRecovery: true,
                          totalTokens: data.totalTokens,
                        },
                      })
                    );

                    break;
                  } else if (data.type === "error") {
                    // Dispatch error event
                    window.dispatchEvent(
                      new CustomEvent("recovery-stream-update", {
                        detail: {
                          streamId,
                          messageId: streamState.messageId,
                          type: "error",
                          error: data.error || "Resume streaming error",
                          isRecovery: true,
                        },
                      })
                    );

                    throw new Error(data.error || "Resume streaming error");
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

        if (resumeSuccessful) {
          // Remove from recoverable streams list
          setRecoverableStreams((prev) =>
            prev.filter((stream) => stream.streamId !== streamId)
          );

          if (showNotifications) {
            toast({
              title: "🎉 Stream Resumed",
              description: `Successfully resumed stream from chunk ${resumedFromChunk}`,
            });
          }

          console.log(`✅ Stream resumed successfully: ${streamId}`);

          // UI updates are now handled in real-time through custom events
          // No need to force refresh - the recovery streaming updates the UI live
          return true;
        } else {
          throw new Error("Resume stream did not complete successfully");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to resume stream";
        console.error("Stream resume error:", err);

        setError(errorMessage);

        if (showNotifications) {
          toast({
            title: "Resume Failed",
            description: errorMessage,
            variant: "destructive",
          });
        }

        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [showNotifications, toast]
  );

  /**
   * Discard a specific stream
   */
  const discardStream = useCallback(
    (streamId: string) => {
      try {
        console.log(`🗑️ Discarding stream: ${streamId}`);

        // Remove from persistence
        streamPersistence.removeStreamState(streamId);

        // Remove from UI
        setRecoverableStreams((prev) =>
          prev.filter((stream) => stream.streamId !== streamId)
        );

        // Update storage stats
        const stats = streamPersistence.getStorageStats();
        setStorageStats(stats);

        if (showNotifications) {
          toast({
            title: "Stream Discarded",
            description: "The interrupted stream has been permanently removed.",
          });
        }

        console.log(`✅ Stream discarded: ${streamId}`);
      } catch (err) {
        console.error("Failed to discard stream:", err);

        if (showNotifications) {
          toast({
            title: "Discard Failed",
            description: "Failed to remove the stream.",
            variant: "destructive",
          });
        }
      }
    },
    [showNotifications, toast]
  );

  /**
   * Discard all recoverable streams
   */
  const discardAllStreams = useCallback(() => {
    try {
      console.log(
        `🗑️ Discarding all ${recoverableStreams.length} recoverable streams`
      );

      // Remove all streams from persistence
      recoverableStreams.forEach((stream) => {
        streamPersistence.removeStreamState(stream.streamId);
      });

      // Clear UI
      setRecoverableStreams([]);

      // Update storage stats
      const stats = streamPersistence.getStorageStats();
      setStorageStats(stats);

      if (showNotifications) {
        toast({
          title: "All Streams Discarded",
          description: `Removed ${recoverableStreams.length} interrupted streams.`,
        });
      }

      console.log(`✅ All streams discarded`);
    } catch (err) {
      console.error("Failed to discard all streams:", err);

      if (showNotifications) {
        toast({
          title: "Discard Failed",
          description: "Failed to remove all streams.",
          variant: "destructive",
        });
      }
    }
  }, [recoverableStreams, showNotifications, toast]);

  /**
   * Get detailed stream state
   */
  const getStreamDetails = useCallback(
    (streamId: string): StreamState | null => {
      return streamPersistence.getStreamState(streamId);
    },
    []
  );

  // Auto-detect recoverable streams when conversationId changes
  useEffect(() => {
    if (autoDetect && conversationId) {
      detectRecoverableStreams();
    }
  }, [conversationId, autoDetect, detectRecoverableStreams]);

  // Manual trigger for immediate detection
  const triggerDetection = useCallback(() => {
    if (conversationId) {
      detectRecoverableStreams();
    }
  }, [conversationId, detectRecoverableStreams]);

  return {
    recoverableStreams,
    isLoading,
    error,
    canRecover: recoverableStreams.length > 0,

    // Actions
    detectRecoverableStreams,
    resumeStream,
    discardStream,
    discardAllStreams,
    getStreamDetails,
    triggerDetection,

    // Statistics
    storageStats,
  };
}
