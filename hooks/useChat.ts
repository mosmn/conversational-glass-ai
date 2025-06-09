"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  apiClient,
  type Message,
  type APIError,
  type StreamChunk,
} from "@/lib/api/client";

interface UseChatReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  isStreaming: boolean;
  sendMessage: (content: string, model: string) => Promise<void>;
  refetchMessages: () => Promise<void>;
  currentStreamContent: string;
}

export function useChat(conversationId: string): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamContent, setCurrentStreamContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.getConversationMessages(conversationId);
      setMessages(response.messages);
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.error || "Failed to fetch messages");
      console.error("Fetch messages error:", err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const sendMessage = useCallback(
    async (content: string, model: string) => {
      if (!content.trim() || !conversationId) return;

      try {
        setError(null);
        setIsStreaming(true);
        setCurrentStreamContent("");

        // Add user message immediately to UI
        const userMessage: Message = {
          id: `temp-${Date.now()}`,
          role: "user",
          content,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, userMessage]);

        // Add temporary assistant message for streaming
        const tempAssistantMessage: Message = {
          id: `temp-assistant-${Date.now()}`,
          role: "assistant",
          content: "",
          model,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tempAssistantMessage]);

        // Cancel any existing stream
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        let assistantContent = "";

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

            // Update the temporary message
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === tempAssistantMessage.id
                  ? { ...msg, content: assistantContent }
                  : msg
              )
            );
          } else if (chunk.type === "error") {
            throw new Error(chunk.error || "Streaming error");
          } else if (chunk.finished) {
            break;
          }
        }

        // Refresh messages to get the real ones from the database
        await fetchMessages();
      } catch (err) {
        const apiError = err as APIError;
        setError(apiError.error || "Failed to send message");
        console.error("Send message error:", err);

        // Remove the temporary messages on error
        setMessages((prev) =>
          prev.filter((msg) => !msg.id.startsWith("temp-"))
        );
      } finally {
        setIsStreaming(false);
        setCurrentStreamContent("");
        abortControllerRef.current = null;
      }
    },
    [conversationId, fetchMessages]
  );

  const refetchMessages = useCallback(async () => {
    await fetchMessages();
  }, [fetchMessages]);

  // Initial load
  useEffect(() => {
    if (conversationId) {
      fetchMessages();
    }
  }, [conversationId, fetchMessages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    loading,
    error,
    isStreaming,
    sendMessage,
    refetchMessages,
    currentStreamContent,
  };
}
