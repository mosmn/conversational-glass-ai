"use client";

import React, { useCallback, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  chatErrorHandler,
  ErrorCategory,
  type ChatError,
} from "@/lib/utils/chat-error-handler";

interface FailedMessage {
  id: string;
  userMessageId: string;
  content: string;
  model: string;
  timestamp: string;
  error: ChatError;
  attachments?: any[];
  searchResults?: any[];
  displayContent?: string;
}

interface UseStreamingFailureHandlerOptions {
  conversationId: string;
  onRetryMessage: (
    content: string,
    model: string,
    attachments?: any[],
    displayContent?: string,
    searchResults?: any[]
  ) => Promise<void>;
  onRemoveMessage: (messageId: string) => void;
  onRemoveMessages: (messageIds: string[]) => void;
}

export function useStreamingFailureHandler({
  conversationId,
  onRetryMessage,
  onRemoveMessage,
  onRemoveMessages,
}: UseStreamingFailureHandlerOptions) {
  const { toast } = useToast();
  const [failedMessages, setFailedMessages] = useState<
    Map<string, FailedMessage>
  >(new Map());
  const [isRetrying, setIsRetrying] = useState<Set<string>>(new Set());
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Handle streaming failure - removes the failed message and stores retry information
  const handleStreamingFailure = useCallback(
    async (
      error: unknown,
      context: {
        userMessageId: string;
        assistantMessageId: string;
        content: string;
        model: string;
        attachments?: any[];
        searchResults?: any[];
        displayContent?: string;
      }
    ) => {
      // Create standardized error
      const chatError = await chatErrorHandler.handleError(
        error,
        ErrorCategory.STREAMING,
        {
          context: {
            conversationId,
            messageId: context.assistantMessageId,
            model: context.model,
          },
          showToast: false, // We'll show custom toast
        }
      );

      // Store failed message data for retry
      const failedMessage: FailedMessage = {
        id: context.assistantMessageId,
        userMessageId: context.userMessageId,
        content: context.content,
        model: context.model,
        timestamp: new Date().toISOString(),
        error: chatError,
        attachments: context.attachments,
        searchResults: context.searchResults,
        displayContent: context.displayContent,
      };

      setFailedMessages((prev) =>
        new Map(prev).set(context.assistantMessageId, failedMessage)
      );

      // Remove both user and assistant messages from UI immediately
      onRemoveMessages([context.userMessageId, context.assistantMessageId]);

      // Show error toast with retry option
      toast({
        title: "Message Failed",
        description: `${chatError.userMessage} Click to retry.`,
        variant: "destructive",
        duration: 8000,
        onClick: () => handleRetryFailedMessage(context.assistantMessageId),
      });

      // Auto-retry for certain error types after a delay
      if (
        chatError.isRetryable &&
        chatError.category === ErrorCategory.NETWORK
      ) {
        const timeout = setTimeout(() => {
          handleRetryFailedMessage(context.assistantMessageId);
        }, 3000);

        retryTimeouts.current.set(context.assistantMessageId, timeout);
      }

      return chatError;
    },
    [conversationId, onRemoveMessages, toast]
  );

  // Retry a failed message
  const handleRetryFailedMessage = useCallback(
    async (failedMessageId: string) => {
      const failedMessage = failedMessages.get(failedMessageId);
      if (!failedMessage || isRetrying.has(failedMessageId)) {
        return;
      }

      setIsRetrying((prev) => new Set(prev).add(failedMessageId));

      // Clear any pending auto-retry timeout
      const timeout = retryTimeouts.current.get(failedMessageId);
      if (timeout) {
        clearTimeout(timeout);
        retryTimeouts.current.delete(failedMessageId);
      }

      try {
        // Show retrying toast
        toast({
          title: "Retrying...",
          description: "Sending your message again",
          duration: 3000,
        });

        // Retry the message
        await onRetryMessage(
          failedMessage.content,
          failedMessage.model,
          failedMessage.attachments,
          failedMessage.displayContent,
          failedMessage.searchResults
        );

        // Remove from failed messages on success
        setFailedMessages((prev) => {
          const newMap = new Map(prev);
          newMap.delete(failedMessageId);
          return newMap;
        });

        toast({
          title: "Message Sent",
          description: "Your message has been sent successfully",
          duration: 2000,
        });
      } catch (error) {
        // Handle retry failure
        await chatErrorHandler.handleError(error, ErrorCategory.STREAMING, {
          context: {
            conversationId,
            messageId: failedMessageId,
            model: failedMessage.model,
          },
          customUserMessage: "Retry failed. Please try again.",
        });
      } finally {
        setIsRetrying((prev) => {
          const newSet = new Set(prev);
          newSet.delete(failedMessageId);
          return newSet;
        });
      }
    },
    [failedMessages, isRetrying, onRetryMessage, conversationId, toast]
  );

  // Dismiss a failed message (remove from retry queue)
  const dismissFailedMessage = useCallback((failedMessageId: string) => {
    setFailedMessages((prev) => {
      const newMap = new Map(prev);
      newMap.delete(failedMessageId);
      return newMap;
    });

    // Clear any pending timeout
    const timeout = retryTimeouts.current.get(failedMessageId);
    if (timeout) {
      clearTimeout(timeout);
      retryTimeouts.current.delete(failedMessageId);
    }
  }, []);

  // Get retry info for a failed message
  const getRetryInfo = useCallback(
    (messageId: string) => {
      return failedMessages.get(messageId);
    },
    [failedMessages]
  );

  // Check if a message is currently being retried
  const isMessageRetrying = useCallback(
    (messageId: string) => {
      return isRetrying.has(messageId);
    },
    [isRetrying]
  );

  // Handle API-level incomplete messages (from existing data)
  const handleIncompleteMessage = useCallback(
    (message: {
      id: string;
      content: string;
      model?: string;
      timestamp: string;
    }) => {
      // For existing incomplete messages, just remove them silently
      // They'll be cleaned up by the normal message refresh cycle
      onRemoveMessage(message.id);
    },
    [onRemoveMessage]
  );

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    // Clear all pending timeouts
    retryTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    retryTimeouts.current.clear();
  }, []);

  return {
    handleStreamingFailure,
    handleRetryFailedMessage,
    dismissFailedMessage,
    handleIncompleteMessage,
    getRetryInfo,
    isMessageRetrying,
    failedMessages: Array.from(failedMessages.values()),
    cleanup,
  };
}
