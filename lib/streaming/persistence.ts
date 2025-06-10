// Stream Persistence Layer for Resumable Streaming

import {
  StreamState,
  StreamStorageConfig,
  StreamPersistenceError,
  StreamRecoveryData,
} from "./types";

// Default configuration
const DEFAULT_CONFIG: StreamStorageConfig = {
  maxStorageSize: 50 * 1024 * 1024, // 50MB
  maxStreamAge: 24 * 60 * 60 * 1000, // 24 hours
  cleanupInterval: 60 * 60 * 1000, // 1 hour
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

      // Store the state
      localStorage.setItem(key, JSON.stringify(data));

      // Update the stream index
      this.updateStreamIndex(state.streamId, state.conversationId);

      console.log(`💾 Stream state saved: ${state.streamId}`);
    } catch (error) {
      console.error("Failed to save stream state:", error);
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
    const index = this.getStreamIndex();

    if (!index.streamIds.includes(streamId)) {
      index.streamIds.push(streamId);
    }

    index.conversationMap[streamId] = conversationId;
    index.lastUpdated = Date.now();

    localStorage.setItem(STORAGE_KEYS.STREAM_INDEX, JSON.stringify(index));
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
