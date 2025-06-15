// Storage Utilities for Manual Storage Management
// These functions can be called from browser console if needed

import { streamPersistence } from "./persistence";

// Global functions accessible via browser console
declare global {
  interface Window {
    clearChatStorage: () => void;
    getChatStorageStats: () => {
      totalSize: number;
      messageCount: number;
      fileCount: number;
      oldestEntry: Date;
      newestEntry: Date;
      byType: Record<
        string,
        {
          count: number;
          size: number;
        }
      >;
    };
    forceChatStorageCleanup: () => void;
  }
}

/**
 * Clear all chat storage data (accessible via console)
 */
function clearChatStorage(): void {
  try {
    streamPersistence.clearAllStreams();

    // Also clear any other chat-related localStorage items
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("conversational-glass-ai:")) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    console.log("✅ All chat storage cleared");
    console.log("Please refresh the page for changes to take effect");
  } catch (error) {
    console.error("Failed to clear chat storage:", error);
  }
}

/**
 * Get storage statistics (accessible via console)
 */
function getChatStorageStats(): {
  totalSize: number;
  messageCount: number;
  fileCount: number;
  oldestEntry: Date;
  newestEntry: Date;
  byType: Record<
    string,
    {
      count: number;
      size: number;
    }
  >;
} {
  try {
    const stats = streamPersistence.getStorageStats();
    const formatted = {
      totalStreams: stats.totalStreams,
      incompleteStreams: stats.incompleteStreams,
      storageUsedMB: Math.round((stats.storageUsed / 1024 / 1024) * 100) / 100,
      oldestStreamDaysAgo: stats.oldestStream
        ? Math.round(
            ((Date.now() - stats.oldestStream) / (1000 * 60 * 60 * 24)) * 100
          ) / 100
        : 0,
    };

    console.table(formatted);
    return formatted;
  } catch (error) {
    console.error("Failed to get storage stats:", error);
    return null;
  }
}

/**
 * Force storage cleanup (accessible via console)
 */
function forceChatStorageCleanup(): void {
  try {
    const beforeStats = streamPersistence.getStorageStats();
    streamPersistence.cleanupOldStreams();
    const afterStats = streamPersistence.getStorageStats();

    console.log(`🧹 Cleanup completed:`);
    console.log(
      `  Before: ${beforeStats.totalStreams} streams, ${Math.round(
        beforeStats.storageUsed / 1024 / 1024
      )}MB`
    );
    console.log(
      `  After: ${afterStats.totalStreams} streams, ${Math.round(
        afterStats.storageUsed / 1024 / 1024
      )}MB`
    );
    console.log(
      `  Freed: ${Math.round(
        (beforeStats.storageUsed - afterStats.storageUsed) / 1024 / 1024
      )}MB`
    );
  } catch (error) {
    console.error("Failed to perform cleanup:", error);
  }
}

// Initialize global functions when in browser
if (typeof window !== "undefined") {
  window.clearChatStorage = clearChatStorage;
  window.getChatStorageStats = getChatStorageStats;
  window.forceChatStorageCleanup = forceChatStorageCleanup;

  // Log available commands
  console.log("🛠️ Chat Storage Utilities Available:");
  console.log("  window.getChatStorageStats() - Check storage usage");
  console.log("  window.forceChatStorageCleanup() - Force cleanup old data");
  console.log(
    "  window.clearChatStorage() - Clear all chat data (DESTRUCTIVE)"
  );
}

export { clearChatStorage, getChatStorageStats, forceChatStorageCleanup };
