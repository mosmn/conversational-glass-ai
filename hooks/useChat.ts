import { useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  model?: string;
  isStreaming?: boolean;
  error?: string;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  isStreaming: boolean;
}

export interface UseChatOptions {
  conversationId: string;
  model: "gpt-4" | "gpt-3.5-turbo";
  onMessageReceived?: (message: ChatMessage) => void;
  onError?: (error: string) => void;
}

export function useChat({
  conversationId,
  model,
  onMessageReceived,
  onError,
}: UseChatOptions) {
  const { user } = useUser();
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
    isStreaming: false,
  });

  const streamingMessageRef = useRef<string>("");
  const streamingMessageIdRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generate a unique message ID
  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add a message to the chat
  const addMessage = useCallback(
    (message: ChatMessage) => {
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, message],
      }));

      if (onMessageReceived) {
        onMessageReceived(message);
      }
    },
    [onMessageReceived]
  );

  // Update a message in the chat
  const updateMessage = useCallback(
    (messageId: string, updates: Partial<ChatMessage>) => {
      setState((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ),
      }));
    },
    []
  );

  // Send a message to the chat
  const sendMessage = useCallback(
    async (content: string) => {
      if (!user) {
        const error = "User must be authenticated to send messages";
        setState((prev) => ({ ...prev, error }));
        if (onError) onError(error);
        return;
      }

      if (!content.trim()) {
        return;
      }

      // Reset error state
      setState((prev) => ({ ...prev, error: null, isLoading: true }));

      // Add user message immediately
      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      addMessage(userMessage);

      // Create assistant message placeholder
      const assistantMessageId = generateMessageId();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        model,
        isStreaming: true,
      };

      addMessage(assistantMessage);

      // Set up streaming
      streamingMessageRef.current = "";
      streamingMessageIdRef.current = assistantMessageId;
      setState((prev) => ({ ...prev, isStreaming: true }));

      try {
        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        const response = await fetch("/api/chat/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId,
            content: content.trim(),
            model,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to send message");
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body reader available");
        }

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "content") {
                  streamingMessageRef.current += data.content;
                  updateMessage(assistantMessageId, {
                    content: streamingMessageRef.current,
                    isStreaming: true,
                  });
                } else if (data.type === "completion") {
                  updateMessage(assistantMessageId, {
                    content: data.content,
                    isStreaming: false,
                  });

                  setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    isStreaming: false,
                  }));
                  break;
                } else if (data.type === "error") {
                  throw new Error(data.error);
                }
              } catch (parseError) {
                console.error("Failed to parse SSE data:", parseError);
              }
            }
          }
        }
      } catch (error) {
        console.error("Chat error:", error);

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";

        // Update the assistant message with error
        updateMessage(assistantMessageId, {
          content:
            "Sorry, I encountered an error while processing your message.",
          error: errorMessage,
          isStreaming: false,
        });

        setState((prev) => ({
          ...prev,
          error: errorMessage,
          isLoading: false,
          isStreaming: false,
        }));

        if (onError) {
          onError(errorMessage);
        }
      } finally {
        abortControllerRef.current = null;
      }
    },
    [
      user,
      conversationId,
      model,
      generateMessageId,
      addMessage,
      updateMessage,
      onError,
    ]
  );

  // Stop streaming (abort current request)
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isLoading: false,
      isStreaming: false,
    }));

    // Finalize any streaming message
    if (streamingMessageIdRef.current && streamingMessageRef.current) {
      updateMessage(streamingMessageIdRef.current, {
        content: streamingMessageRef.current,
        isStreaming: false,
      });
    }
  }, [updateMessage]);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Set messages (for loading existing conversation)
  const setMessages = useCallback((messages: ChatMessage[]) => {
    setState((prev) => ({ ...prev, messages, error: null }));
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    isStreaming: state.isStreaming,
    error: state.error,
    sendMessage,
    stopStreaming,
    clearError,
    setMessages,
  };
}
