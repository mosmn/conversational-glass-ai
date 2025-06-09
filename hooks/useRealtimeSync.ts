"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient, type Message } from "@/lib/api/client";

interface UseRealtimeSyncOptions {
  conversationId: string;
  onMessagesUpdate: (messages: Message[]) => void;
  syncInterval?: number;
}

interface UseRealtimeSyncReturn {
  isOnline: boolean;
  connectionStatus: "connecting" | "connected" | "disconnected";
  lastSyncTime: string | null;
  queuedMessages: Message[];
  syncNow: () => Promise<void>;
  clearQueue: () => void;
}

export function useRealtimeSync({
  conversationId,
  onMessagesUpdate,
  syncInterval = 5000,
}: UseRealtimeSyncOptions): UseRealtimeSyncReturn {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [queuedMessages, setQueuedMessages] = useState<Message[]>([]);

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Initialize BroadcastChannel for cross-tab communication
  useEffect(() => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      broadcastChannelRef.current = new BroadcastChannel(
        `chat-sync-${conversationId}`
      );

      broadcastChannelRef.current.onmessage = (event) => {
        const { type, data } = event.data;

        if (type === "messages-updated") {
          onMessagesUpdate(data.messages);
          setLastSyncTime(data.lastSyncTime);
        } else if (type === "sync-request") {
          // Another tab is requesting sync - respond with current state
          syncNow();
        }
      };

      return () => {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.close();
        }
      };
    }
  }, [conversationId, onMessagesUpdate]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionStatus("connecting");
      // Sync when coming back online
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus("disconnected");
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Load persisted sync state from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSyncTime = localStorage.getItem(
        `chat-sync-time-${conversationId}`
      );
      const savedQueue = localStorage.getItem(`chat-queue-${conversationId}`);

      if (savedSyncTime) {
        setLastSyncTime(savedSyncTime);
      }

      if (savedQueue) {
        try {
          const parsedQueue = JSON.parse(savedQueue);
          setQueuedMessages(parsedQueue);
        } catch (error) {
          console.error("Failed to parse queued messages:", error);
        }
      }
    }
  }, [conversationId]);

  // Persist sync state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && lastSyncTime) {
      localStorage.setItem(`chat-sync-time-${conversationId}`, lastSyncTime);
    }
  }, [conversationId, lastSyncTime]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        `chat-queue-${conversationId}`,
        JSON.stringify(queuedMessages)
      );
    }
  }, [conversationId, queuedMessages]);

  const syncNow = useCallback(async () => {
    if (!conversationId || !isOnline) {
      setConnectionStatus("disconnected");
      return;
    }

    try {
      setConnectionStatus("connecting");

      // Get current sync time or default to 1 hour ago
      const syncTime =
        lastSyncTime || new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const syncResponse = await apiClient.syncMessages(
        conversationId,
        syncTime
      );

      if (
        syncResponse.newMessages.length > 0 ||
        syncResponse.updatedMessages.length > 0
      ) {
        const allMessages = [
          ...syncResponse.newMessages,
          ...syncResponse.updatedMessages,
        ];

        onMessagesUpdate(allMessages);
        setLastSyncTime(syncResponse.lastSyncTimestamp);

        // Broadcast to other tabs
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: "messages-updated",
            data: {
              messages: allMessages,
              lastSyncTime: syncResponse.lastSyncTimestamp,
            },
          });
        }
      }

      setConnectionStatus("connected");
    } catch (error) {
      console.error("Sync failed:", error);
      setConnectionStatus("disconnected");

      // If sync fails due to network, we'll retry on next interval
      if (error instanceof Error && error.message.includes("network")) {
        setIsOnline(false);
      }
    }
  }, [conversationId, lastSyncTime, isOnline, onMessagesUpdate]);

  const clearQueue = useCallback(() => {
    setQueuedMessages([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(`chat-queue-${conversationId}`);
    }
  }, [conversationId]);

  // Queue messages when offline
  const queueMessage = useCallback((message: Message) => {
    setQueuedMessages((prev) => [...prev, message]);
  }, []);

  // Process queued messages when online
  useEffect(() => {
    if (isOnline && queuedMessages.length > 0) {
      // Process queued messages (this would typically involve sending them)
      console.log(`Processing ${queuedMessages.length} queued messages`);

      // For now, just clear the queue since we don't have a specific send endpoint
      // In a full implementation, you'd send these messages to the server
      clearQueue();
    }
  }, [isOnline, queuedMessages, clearQueue]);

  // Setup sync interval
  useEffect(() => {
    if (isOnline && connectionStatus === "connected") {
      syncIntervalRef.current = setInterval(() => {
        syncNow();
      }, syncInterval);

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      };
    }
  }, [isOnline, connectionStatus, syncInterval, syncNow]);

  // Initial sync
  useEffect(() => {
    if (conversationId && isOnline) {
      syncNow();
    }
  }, [conversationId, isOnline]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, []);

  // Listen for visibility changes to sync when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isOnline) {
        // Tab became visible, sync to get latest messages
        syncNow();

        // Request sync from other tabs
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({
            type: "sync-request",
          });
        }
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    }
  }, [isOnline, syncNow]);

  return {
    isOnline,
    connectionStatus,
    lastSyncTime,
    queuedMessages,
    syncNow,
    clearQueue,
  };
}
