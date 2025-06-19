// Stream Persistence Layer for Resumable Streaming

import {
  StreamState,
  StreamStorageConfig,
  StreamPersistenceError,
  StreamRecoveryData,
} from "./types";

// Default configuration
const DEFAULT_CONFIG: StreamStorageConfig = {
  maxStorageSize: 8 * 1024 * 1024, // 8MB (higher limit to avoid emergency cleanup)
  maxStreamAge: 6 * 60 * 60 * 1000, // 6 hours (longer to reduce cleanup frequency)
  cleanupInterval: 60 * 60 * 1000, // 1 hour (much less frequent cleanup)
  compressionEnabled: false,
  encryptionEnabled: false,
};

// Performance and logging configuration
const PERF_CONFIG = {
  ENABLE_DEBUG_LOGS: false, // DISABLED - issue identified and fixed
  ENABLE_VERBOSE_CLEANUP_LOGS: false,
  CLEANUP_BATCH_SIZE: 100, // Larger batches for less frequent cleanup
  EMERGENCY_CLEANUP_DISABLED: true, // DISABLE emergency cleanup entirely
  STORAGE_CHECK_DISABLED: true, // DISABLE storage quota checks
};

// Storage keys
const STORAGE_KEYS = {
  STREAM_STATE: "conversational-glass-ai:stream-state:",
  STREAM_INDEX: "conversational-glass-ai:stream-index",
  CONFIG: "conversational-glass-ai:stream-config",
  LAST_CLEANUP: "conversational-glass-ai:last-cleanup",
} as const;

// Emergency cleanup tracking
let lastEmergencyCleanup = 0;
let emergencyCleanupAttempts = 0;

class StreamPersistence {
  private config: StreamStorageConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<StreamStorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Perform gentle cleanup on initialization - not emergency cleanup
    setTimeout(() => {
      // Only do regular cleanup, not emergency
      this.cleanupOldStreams();

      // Check storage usage, but don't be aggressive about it
      const stats = this.getStorageStats();
      if (stats.storageUsed > 6 * 1024 * 1024) {
        // Only warn at 6MB
        console.warn(
          `⚠️ Storage usage on init: ${Math.round(
            stats.storageUsed / 1024 / 1024
          )}MB - will cleanup gradually`
        );

        // Don't trigger emergency cleanup - just schedule gentle cleanup
        setTimeout(() => {
          this.cleanupOldStreams();
        }, 10000); // 10 seconds later
      }
    }, 2000); // Wait 2 seconds before any cleanup

    this.initializeCleanupTimer();
  }

  /**
   * Save stream state to localStorage
   */
  saveStreamState(state: StreamState): void {
    try {
      if (typeof window === "undefined") return;

      const key = `${STORAGE_KEYS.STREAM_STATE}${state.streamId}`;
      const data = {
        ...state,
        savedAt: Date.now(),
      };

      const dataString = JSON.stringify(data);

      // Check storage quota before saving
      this.checkStorageQuota(dataString);

      // Store the state
      localStorage.setItem(key, dataString);

      // Update the stream index
      this.updateStreamIndex(state.streamId, state.conversationId);

      // Only log in debug mode to prevent console spam
      if (PERF_CONFIG.ENABLE_DEBUG_LOGS) {
        console.log(`💾 Stream state saved: ${state.streamId}`);
      }
    } catch (error) {
      console.error("Failed to save stream state:", error);

      // Handle quota exceeded errors
      if (error instanceof Error && error.name === "QuotaExceededError") {
        console.warn(
          "⚠️ Storage quota exceeded while saving - scheduling cleanup"
        );

        // Schedule gentle cleanup instead of emergency
        setTimeout(() => {
          this.cleanupOldStreams();
        }, 5000);

        // Try saving with reduced data
        try {
          const key = `${STORAGE_KEYS.STREAM_STATE}${state.streamId}`;
          const minimalData = {
            streamId: state.streamId,
            conversationId: state.conversationId,
            messageId: state.messageId,
            content: state.content?.slice(-1000) || "", // Keep only last 1000 chars
            isComplete: state.isComplete,
            lastUpdateTime: Date.now(),
            savedAt: Date.now(),
          };

          const dataString = JSON.stringify(minimalData);
          localStorage.setItem(key, dataString);

          // Update the stream index
          this.updateStreamIndex(state.streamId, state.conversationId);

          if (PERF_CONFIG.ENABLE_DEBUG_LOGS) {
            console.log(
              `💾 Minimal stream state saved after quota error: ${state.streamId}`
            );
          }
        } catch (retryError) {
          console.error("Failed to save minimal stream state:", retryError);
          // Don't throw - just continue
        }
      } else {
        console.error("Failed to save stream state:", error);
      }
    }
  }

  /**
   * Load stream state from localStorage
   */
  getStreamState(streamId: string): StreamState | null {
    try {
      if (typeof window === "undefined") return null;

      const key = `${STORAGE_KEYS.STREAM_STATE}${streamId}`;
      const stored = localStorage.getItem(key);

      if (!stored) return null;

      const data = JSON.parse(stored);

      // Check if stream is expired
      const age = Date.now() - data.savedAt;
      if (age > this.config.maxStreamAge) {
        this.removeStreamState(streamId);
        return null;
      }

      // Only log in debug mode to prevent console spam
      if (PERF_CONFIG.ENABLE_DEBUG_LOGS) {
        console.log(`📖 Stream state loaded: ${streamId}`);
      }
      return data as StreamState;
    } catch (error) {
      console.error("Failed to load stream state:", error);
      throw new StreamPersistenceError(
        "Failed to load stream state",
        "load",
        error
      );
    }
  }

  /**
   * Get all incomplete streams
   */
  getIncompleteStreams(): StreamState[] {
    try {
      if (typeof window === "undefined") return [];

      const index = this.getStreamIndex();
      const incompleteStreams: StreamState[] = [];

      for (const streamId of index.streamIds) {
        const state = this.getStreamState(streamId);
        if (state && !state.isComplete && !state.error) {
          incompleteStreams.push(state);
        }
      }

      return incompleteStreams.sort(
        (a, b) => b.lastUpdateTime - a.lastUpdateTime
      );
    } catch (error) {
      console.error("Failed to get incomplete streams:", error);
      return [];
    }
  }

  /**
   * Get recoverable streams for a specific conversation
   */
  getRecoverableStreams(conversationId: string): StreamRecoveryData[] {
    try {
      const incompleteStreams = this.getIncompleteStreams();

      return incompleteStreams
        .filter(
          (stream) =>
            stream.conversationId === conversationId &&
            stream.content && // Must have actual content
            stream.content.length > 0 && // Content cannot be empty
            // FIXED: Allow recovery of temporary messages if they have substantial content (50+ chars)
            // This handles cases where streams get interrupted before real message ID is received
            (!stream.messageId?.startsWith("temp-") ||
              stream.content.length >= 50)
        )
        .map((stream) => ({
          streamId: stream.streamId,
          lastContent: stream.content,
          progress: stream.estimatedCompletion || 0,
          interruptedAt: stream.lastUpdateTime,
          model: stream.model,
          provider: stream.provider,
          canRecover:
            !stream.error && !stream.isComplete && stream.content.length > 0,
          errorMessage: stream.error,
        }));
    } catch (error) {
      console.error("Failed to get recoverable streams:", error);
      return [];
    }
  }

  /**
   * Remove stream state
   */
  removeStreamState(streamId: string): void {
    try {
      if (typeof window === "undefined") return;

      const key = `${STORAGE_KEYS.STREAM_STATE}${streamId}`;

      // Only log removal in debug mode to prevent console spam
      if (PERF_CONFIG.ENABLE_DEBUG_LOGS) {
        const existsBefore = localStorage.getItem(key) !== null;
        console.log(
          `🗑️ Removing stream state: ${streamId} (exists: ${existsBefore})`
        );
      }

      localStorage.removeItem(key);

      // Update index
      this.removeFromStreamIndex(streamId);

      if (PERF_CONFIG.ENABLE_DEBUG_LOGS) {
        console.log(`✅ Stream state removed: ${streamId}`);
      }
    } catch (error) {
      console.error("Failed to remove stream state:", error);
    }
  }

  /**
   * Mark stream as complete and remove it (completed streams should never be recoverable)
   */
  markStreamComplete(streamId: string): void {
    try {
      if (PERF_CONFIG.ENABLE_DEBUG_LOGS) {
        console.log(`🎯 markStreamComplete called for: ${streamId}`);
      }

      const state = this.getStreamState(streamId);
      if (state) {
        if (PERF_CONFIG.ENABLE_DEBUG_LOGS) {
          console.log(
            `✅ Stream completed, removing from storage: ${streamId}`
          );
        }

        // Remove completed stream immediately - no need to keep it
        this.removeStreamState(streamId);

        if (PERF_CONFIG.ENABLE_DEBUG_LOGS) {
          console.log(`🧹 Stream state removal completed for: ${streamId}`);
        }
      } else {
        if (PERF_CONFIG.ENABLE_DEBUG_LOGS) {
          console.warn(`⚠️ No stream state found for completion: ${streamId}`);
        }
      }
    } catch (error) {
      console.error("Failed to mark stream complete:", error);
    }
  }

  /**
   * Clean up old streams
   */
  cleanupOldStreams(maxAge?: number): number {
    try {
      if (typeof window === "undefined") return 0;

      const cutoffAge = maxAge || this.config.maxStreamAge;
      const cutoffTime = Date.now() - cutoffAge;
      const index = this.getStreamIndex();
      let cleanedCount = 0;

      for (const streamId of index.streamIds) {
        const key = `${STORAGE_KEYS.STREAM_STATE}${streamId}`;
        const stored = localStorage.getItem(key);

        if (stored) {
          try {
            const data = JSON.parse(stored);
            // Clean up old streams, completed streams, AND temporary message streams
            if (
              data.savedAt < cutoffTime ||
              data.isComplete ||
              // FIXED: Only clean up temporary messages with minimal content (< 50 chars)
              // Keep temporary messages with substantial content for recovery
              (data.messageId?.startsWith("temp-") &&
                (data.content?.length || 0) < 50)
            ) {
              localStorage.removeItem(key);
              this.removeFromStreamIndex(streamId);
              cleanedCount++;

              if (data.messageId?.startsWith("temp-")) {
                console.log(
                  `🧹 Cleaned up temporary message stream: ${streamId} (messageId: ${data.messageId})`
                );
              }
            }
          } catch (error) {
            // Invalid data, remove it
            localStorage.removeItem(key);
            this.removeFromStreamIndex(streamId);
            cleanedCount++;
          }
        }
      }

      localStorage.setItem(STORAGE_KEYS.LAST_CLEANUP, Date.now().toString());

      // Only log cleanup results in debug mode
      if (PERF_CONFIG.ENABLE_VERBOSE_CLEANUP_LOGS && cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} old streams`);
      }

      return cleanedCount;
    } catch (error) {
      console.error("Failed to cleanup old streams:", error);
      throw new StreamPersistenceError(
        "Failed to cleanup old streams",
        "cleanup",
        error
      );
    }
  }

  /**
   * Clean up temporary message streams that shouldn't persist
   */
  cleanupTemporaryMessageStreams(): number {
    try {
      if (typeof window === "undefined") return 0;

      const index = this.getStreamIndex();
      let cleanedCount = 0;

      for (const streamId of index.streamIds) {
        const key = `${STORAGE_KEYS.STREAM_STATE}${streamId}`;
        const stored = localStorage.getItem(key);

        if (stored) {
          try {
            const data = JSON.parse(stored);
            // Remove streams for temporary messages that haven't been persisted
            if (
              data.messageId?.startsWith("temp-") &&
              (data.content?.length || 0) < 50
            ) {
              localStorage.removeItem(key);
              this.removeFromStreamIndex(streamId);
              cleanedCount++;
              if (PERF_CONFIG.ENABLE_VERBOSE_CLEANUP_LOGS) {
                console.log(
                  `🧹 Cleaned up temporary message stream: ${streamId} (messageId: ${data.messageId})`
                );
              }
            }
          } catch (error) {
            // Invalid data, remove it
            localStorage.removeItem(key);
            this.removeFromStreamIndex(streamId);
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0 && PERF_CONFIG.ENABLE_VERBOSE_CLEANUP_LOGS) {
        console.log(`🧹 Cleaned up ${cleanedCount} temporary message streams`);
      }

      return cleanedCount;
    } catch (error) {
      console.error("Failed to cleanup temporary message streams:", error);
      return 0;
    }
  }

  /**
   * Get storage usage statistics
   */
  getStorageStats(): {
    totalStreams: number;
    incompleteStreams: number;
    storageUsed: number;
    oldestStream?: number;
  } {
    try {
      if (typeof window === "undefined") {
        return { totalStreams: 0, incompleteStreams: 0, storageUsed: 0 };
      }

      const index = this.getStreamIndex();
      let storageUsed = 0;
      let incompleteCount = 0;
      let oldestTimestamp = Date.now();

      for (const streamId of index.streamIds) {
        const key = `${STORAGE_KEYS.STREAM_STATE}${streamId}`;
        const stored = localStorage.getItem(key);

        if (stored) {
          storageUsed += stored.length * 2; // Approximate bytes (UTF-16)

          try {
            const data = JSON.parse(stored);
            if (!data.isComplete && !data.error) {
              incompleteCount++;
            }
            if (data.savedAt < oldestTimestamp) {
              oldestTimestamp = data.savedAt;
            }
          } catch (error) {
            // Invalid data
          }
        }
      }

      return {
        totalStreams: index.streamIds.length,
        incompleteStreams: incompleteCount,
        storageUsed,
        oldestStream: oldestTimestamp,
      };
    } catch (error) {
      console.error("Failed to get storage stats:", error);
      return { totalStreams: 0, incompleteStreams: 0, storageUsed: 0 };
    }
  }

  /**
   * Clear all stream data (dangerous!)
   */
  clearAllStreams(): void {
    try {
      if (typeof window === "undefined") return;

      const index = this.getStreamIndex();

      for (const streamId of index.streamIds) {
        const key = `${STORAGE_KEYS.STREAM_STATE}${streamId}`;
        localStorage.removeItem(key);
      }

      localStorage.removeItem(STORAGE_KEYS.STREAM_INDEX);
      console.log("🗑️ All stream data cleared");
    } catch (error) {
      console.error("Failed to clear all streams:", error);
    }
  }

  // Private methods

  private updateStreamIndex(streamId: string, conversationId: string): void {
    try {
      const index = this.getStreamIndex();

      if (!index.streamIds.includes(streamId)) {
        index.streamIds.push(streamId);
      }

      index.conversationMap[streamId] = conversationId;
      index.lastUpdated = Date.now();

      const indexData = JSON.stringify(index);

      // Check if we're approaching storage limits
      this.checkStorageQuota(indexData);

      localStorage.setItem(STORAGE_KEYS.STREAM_INDEX, indexData);
    } catch (error) {
      console.error("Failed to update stream index:", error);

      // If quota exceeded, just do gentle cleanup instead of emergency
      if (error instanceof Error && error.name === "QuotaExceededError") {
        console.warn(
          "⚠️ Storage quota exceeded while updating index - scheduling cleanup"
        );

        // Schedule gentle cleanup instead of emergency
        setTimeout(() => {
          this.cleanupOldStreams();

          // Try again after cleanup
          try {
            const index = this.getStreamIndex();
            if (!index.streamIds.includes(streamId)) {
              index.streamIds.push(streamId);
            }
            index.conversationMap[streamId] = conversationId;
            index.lastUpdated = Date.now();
            localStorage.setItem(
              STORAGE_KEYS.STREAM_INDEX,
              JSON.stringify(index)
            );
          } catch (retryError) {
            console.error("Failed to save after cleanup:", retryError);
            // Don't throw - just continue
          }
        }, 5000);
      } else {
        throw error;
      }
    }
  }

  private removeFromStreamIndex(streamId: string): void {
    const index = this.getStreamIndex();

    index.streamIds = index.streamIds.filter((id) => id !== streamId);
    delete index.conversationMap[streamId];
    index.lastUpdated = Date.now();

    localStorage.setItem(STORAGE_KEYS.STREAM_INDEX, JSON.stringify(index));
  }

  private getStreamIndex(): {
    streamIds: string[];
    conversationMap: Record<string, string>;
    lastUpdated: number;
  } {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.STREAM_INDEX);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to parse stream index:", error);
    }

    // Return default index
    return {
      streamIds: [],
      conversationMap: {},
      lastUpdated: Date.now(),
    };
  }

  private initializeCleanupTimer(): void {
    if (typeof window === "undefined") return;

    // Check if cleanup is needed
    const lastCleanup = localStorage.getItem(STORAGE_KEYS.LAST_CLEANUP);
    const lastCleanupTime = lastCleanup ? parseInt(lastCleanup) : 0;
    const timeSinceCleanup = Date.now() - lastCleanupTime;

    // Run cleanup if needed
    if (timeSinceCleanup > this.config.cleanupInterval) {
      setTimeout(() => this.cleanupOldStreams(), 1000);
    }

    // Set up periodic cleanup
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldStreams();
    }, this.config.cleanupInterval);
  }

  /**
   * Check storage quota and warn if approaching limits
   */
  private checkStorageQuota(newData: string): void {
    // DISABLED for performance - let browser handle storage management
    if (PERF_CONFIG.STORAGE_CHECK_DISABLED) {
      return;
    }

    try {
      if (typeof window === "undefined") return;

      // Simplified storage check - only log warning, no cleanup
      let totalUsage = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("conversational-glass-ai:")) {
          const value = localStorage.getItem(key);
          if (value) {
            totalUsage += value.length * 2;
          }
        }
      }

      totalUsage += newData.length * 2;

      // Very high threshold - only warn, no cleanup
      if (totalUsage > 15 * 1024 * 1024) {
        // 15MB
        console.warn(
          `⚠️ Storage usage: ${Math.round(totalUsage / 1024 / 1024)}MB`
        );
      }
    } catch (error) {
      // Silently ignore storage check errors
    }
  }

  /**
   * Perform emergency cleanup when storage is full
   */
  private performEmergencyCleanup(): void {
    try {
      const now = Date.now();

      // Emergency cleanup is now disabled to prevent performance issues
      if (PERF_CONFIG.EMERGENCY_CLEANUP_DISABLED) {
        console.warn("⚠️ Emergency cleanup is disabled for performance");
        return;
      }

      lastEmergencyCleanup = now;
      emergencyCleanupAttempts++;

      console.log("🚨 Performing emergency storage cleanup...");

      // 1. Clean up all completed streams immediately
      const index = this.getStreamIndex();
      let cleanedCount = 0;

      for (const streamId of [...index.streamIds]) {
        const state = this.getStreamState(streamId);
        if (state && (state.isComplete || state.error)) {
          this.removeStreamState(streamId);
          cleanedCount++;
        }
      }

      console.log(
        `🧹 Emergency cleanup: removed ${cleanedCount} completed streams`
      );

      // 2. If still low on space, remove old incomplete streams
      if (cleanedCount < 5) {
        const remainingStreams = this.getIncompleteStreams();
        const sortedByAge = remainingStreams.sort(
          (a, b) => a.lastUpdateTime - b.lastUpdateTime
        );

        // Remove oldest 50% of incomplete streams
        const toRemove = sortedByAge.slice(
          0,
          Math.ceil(sortedByAge.length / 2)
        );
        for (const stream of toRemove) {
          this.removeStreamState(stream.streamId);
          cleanedCount++;
        }

        console.log(
          `🧹 Emergency cleanup: removed ${toRemove.length} old incomplete streams`
        );
      }

      // 3. Force garbage collection if available
      if (typeof window !== "undefined" && "gc" in window) {
        try {
          (window as any).gc();
        } catch (e) {
          // Ignore if GC not available
        }
      }

      console.log(
        `✅ Emergency cleanup completed: ${cleanedCount} streams removed`
      );
    } catch (error) {
      console.error("Failed to perform emergency cleanup:", error);

      // CRITICAL: Don't clear all data anymore as it can cause infinite loops
      console.log(
        "⚠️ Emergency cleanup failed, but not clearing all data to prevent loops"
      );
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Debug function: Log all current streams in storage
   */
  debugLogAllStreams(): void {
    try {
      if (typeof window === "undefined" || !PERF_CONFIG.ENABLE_DEBUG_LOGS)
        return;

      const index = this.getStreamIndex();
      console.log(
        `🔍 DEBUG: Total streams in index: ${index.streamIds.length}`
      );

      for (const streamId of index.streamIds) {
        const state = this.getStreamState(streamId);
        if (state) {
          console.log(`📄 Stream: ${streamId}`, {
            messageId: state.messageId,
            isComplete: state.isComplete,
            isPaused: state.isPaused,
            contentLength: state.content?.length || 0,
            lastUpdate: new Date(state.lastUpdateTime).toISOString(),
            conversationId: state.conversationId,
          });
        } else {
          console.warn(`⚠️ Stream in index but no state found: ${streamId}`);
        }
      }
    } catch (error) {
      console.error("Failed to debug log streams:", error);
    }
  }
}

// Create a singleton instance
export const streamPersistence = new StreamPersistence();

// Export the class for custom instances
export { StreamPersistence };

// Utility functions
export function generateStreamId(
  conversationId: string,
  messageId: string
): string {
  return `stream-${conversationId}-${messageId}-${Date.now()}`;
}

export function calculateStreamProgress(
  chunksReceived: number,
  estimatedTotal?: number
): number {
  if (!estimatedTotal || estimatedTotal === 0) return 0;
  return Math.min(100, Math.round((chunksReceived / estimatedTotal) * 100));
}

export function calculateTokensPerSecond(
  totalTokens: number,
  elapsedTimeMs: number
): number {
  if (elapsedTimeMs === 0) return 0;
  return Math.round((totalTokens / elapsedTimeMs) * 1000);
}
