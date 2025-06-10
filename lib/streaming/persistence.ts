// Stream Persistence Layer for Resumable Streaming

import {
  StreamState,
  StreamStorageConfig,
  StreamPersistenceError,
  StreamRecoveryData,
} from "./types";

// Default configuration
const DEFAULT_CONFIG: StreamStorageConfig = {
  maxStorageSize: 4 * 1024 * 1024, // 4MB (conservative limit)
  maxStreamAge: 2 * 60 * 60 * 1000, // 2 hours (reduced from 24h)
  cleanupInterval: 10 * 60 * 1000, // 10 minutes (more frequent cleanup)
  compressionEnabled: false, // Disable for now to keep simple
  encryptionEnabled: false, // Disable for now to keep simple
};

// Storage keys
const STORAGE_KEYS = {
  STREAM_STATE: "conversational-glass-ai:stream-state:",
  STREAM_INDEX: "conversational-glass-ai:stream-index",
  CONFIG: "conversational-glass-ai:stream-config",
  LAST_CLEANUP: "conversational-glass-ai:last-cleanup",
} as const;

class StreamPersistence {
  private config: StreamStorageConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<StreamStorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Perform immediate cleanup on initialization
    setTimeout(() => {
      this.cleanupOldStreams();

      // Check storage usage and warn if high
      const stats = this.getStorageStats();
      if (stats.storageUsed > 2 * 1024 * 1024) {
        // > 2MB
        console.warn(
          `⚠️ High storage usage detected: ${Math.round(
            stats.storageUsed / 1024 / 1024
          )}MB`
        );
        this.performEmergencyCleanup();
      }
    }, 1000);

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

      console.log(`💾 Stream state saved: ${state.streamId}`);
    } catch (error) {
      console.error("Failed to save stream state:", error);

      // Handle quota exceeded errors
      if (error instanceof Error && error.name === "QuotaExceededError") {
        console.log("🚨 Storage quota exceeded while saving stream state");
        this.performEmergencyCleanup();

        // Try saving again after cleanup
        try {
          const key = `${STORAGE_KEYS.STREAM_STATE}${state.streamId}`;
          const data = { ...state, savedAt: Date.now() };
          localStorage.setItem(key, JSON.stringify(data));
          this.updateStreamIndex(state.streamId, state.conversationId);
          console.log(`💾 Stream state saved after cleanup: ${state.streamId}`);
          return;
        } catch (retryError) {
          console.error("Failed to save even after cleanup:", retryError);
        }
      }

      throw new StreamPersistenceError(
        "Failed to save stream state",
        "save",
        error
      );
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

      console.log(`📖 Stream state loaded: ${streamId}`);
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
        .filter((stream) => stream.conversationId === conversationId)
        .map((stream) => ({
          streamId: stream.streamId,
          lastContent: stream.content,
          progress: stream.estimatedCompletion || 0,
          interruptedAt: stream.lastUpdateTime,
          model: stream.model,
          provider: stream.provider,
          canRecover: !stream.error && !stream.isComplete,
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
      localStorage.removeItem(key);

      // Update index
      this.removeFromStreamIndex(streamId);

      console.log(`🗑️ Stream state removed: ${streamId}`);
    } catch (error) {
      console.error("Failed to remove stream state:", error);
    }
  }

  /**
   * Mark stream as complete
   */
  markStreamComplete(streamId: string): void {
    try {
      const state = this.getStreamState(streamId);
      if (state) {
        this.saveStreamState({
          ...state,
          isComplete: true,
          lastUpdateTime: Date.now(),
        });
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
            if (data.savedAt < cutoffTime || data.isComplete) {
              localStorage.removeItem(key);
              this.removeFromStreamIndex(streamId);
              cleanedCount++;
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
      console.log(`🧹 Cleaned up ${cleanedCount} old streams`);

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

      // If quota exceeded, perform emergency cleanup
      if (error instanceof Error && error.name === "QuotaExceededError") {
        console.log(
          "🚨 Storage quota exceeded, performing emergency cleanup..."
        );
        this.performEmergencyCleanup();

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
          console.error("Failed to save after emergency cleanup:", retryError);
          throw new StreamPersistenceError(
            "Storage quota exceeded even after cleanup",
            "save",
            retryError
          );
        }
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
    try {
      if (typeof window === "undefined") return;

      // Get current storage usage
      let totalUsage = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("conversational-glass-ai:")) {
          const value = localStorage.getItem(key);
          if (value) {
            totalUsage += value.length * 2; // UTF-16 bytes
          }
        }
      }

      // Add size of new data
      totalUsage += newData.length * 2;

      // Typical localStorage limit is 5-10MB, warn at 4MB
      const WARNING_THRESHOLD = 4 * 1024 * 1024; // 4MB

      if (totalUsage > WARNING_THRESHOLD) {
        console.warn(
          `⚠️ Storage usage: ${Math.round(
            totalUsage / 1024 / 1024
          )}MB - approaching limits`
        );

        // Proactively cleanup if we're close to limits
        if (totalUsage > WARNING_THRESHOLD * 1.25) {
          this.performEmergencyCleanup();
        }
      }
    } catch (error) {
      console.error("Failed to check storage quota:", error);
    }
  }

  /**
   * Perform emergency cleanup when storage is full
   */
  private performEmergencyCleanup(): void {
    try {
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
      if (cleanedCount < 10) {
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

      // Last resort: clear all stream data
      console.log("🆘 Last resort: clearing all stream data");
      this.clearAllStreams();
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
