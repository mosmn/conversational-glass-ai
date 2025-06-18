"use client";

import { useCallback, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  chatErrorHandler,
  ErrorCategory,
  ErrorSeverity,
  handleChatError,
  handleStreamingError,
  handleAPIError,
  handleFileError,
  type ChatError,
  type ErrorHandlingOptions,
} from "@/lib/utils/chat-error-handler";

// Hook for general chat error handling
export function useChatErrorHandling(context?: {
  conversationId?: string;
  messageId?: string;
  userId?: string;
}) {
  const [lastError, setLastError] = useState<ChatError | null>(null);
  const { toast } = useToast();

  const handleError = useCallback(
    async (
      error: unknown,
      category: ErrorCategory = ErrorCategory.UNKNOWN,
      options: Omit<ErrorHandlingOptions, "context"> & {
        context?: ErrorHandlingOptions["context"];
      } = {}
    ): Promise<ChatError> => {
      const chatError = await handleChatError(error, category, {
        ...options,
        context: { ...context, ...options.context },
        onError: (err) => {
          setLastError(err);
          options.onError?.(err);
        },
      });

      return chatError;
    },
    [context]
  );

  const clearLastError = useCallback(() => {
    setLastError(null);
    if (context?.conversationId) {
      chatErrorHandler.clearErrorHistory({
        conversationId: context.conversationId,
      });
    }
  }, [context]);

  const getErrorStats = useCallback(() => {
    return chatErrorHandler.getErrorStats();
  }, []);

  return {
    handleError,
    lastError,
    clearLastError,
    getErrorStats,
  };
}

// Hook for API-specific error handling with retry logic
export function useAPIErrorHandling(
  endpoint?: string,
  context?: {
    conversationId?: string;
    messageId?: string;
  }
) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const retryAttempts = useRef<Map<string, number>>(new Map());

  const handleError = useCallback(
    async (
      error: unknown,
      onRetry?: () => Promise<void>
    ): Promise<ChatError> => {
      if (!endpoint) {
        throw new Error("Endpoint is required for API error handling");
      }

      const retryKey = `${endpoint}-${context?.conversationId}-${context?.messageId}`;

      const chatError = await handleAPIError(
        error,
        endpoint,
        context,
        onRetry
          ? async () => {
              setIsRetrying(true);
              try {
                await onRetry();
                // Reset retry count on success
                retryAttempts.current.delete(retryKey);
                setRetryCount(0);
              } catch (retryError) {
                const currentRetries = retryAttempts.current.get(retryKey) || 0;
                retryAttempts.current.set(retryKey, currentRetries + 1);
                setRetryCount(currentRetries + 1);
                throw retryError;
              } finally {
                setIsRetrying(false);
              }
            }
          : undefined
      );

      return chatError;
    },
    [endpoint, context]
  );

  const manualRetry = useCallback(
    async (onRetry: () => Promise<void>) => {
      if (isRetrying) return;

      setIsRetrying(true);
      try {
        await onRetry();
        setRetryCount(0);
      } catch (error) {
        setRetryCount((prev) => prev + 1);
        throw error;
      } finally {
        setIsRetrying(false);
      }
    },
    [isRetrying]
  );

  return {
    handleError,
    manualRetry,
    isRetrying,
    retryCount,
  };
}

// Hook for streaming-specific error handling
export function useStreamingErrorHandling(context: {
  conversationId: string;
  messageId: string;
  streamId?: string;
}) {
  const [streamError, setStreamError] = useState<ChatError | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  const handleError = useCallback(
    async (
      error: unknown,
      onRetry?: () => Promise<void>,
      onResume?: () => Promise<void>
    ): Promise<ChatError> => {
      const chatError = await handleStreamingError(
        error,
        context,
        onRetry
          ? async () => {
              setIsRecovering(true);
              try {
                await onRetry();
                setStreamError(null);
              } catch (retryError) {
                console.error("Retry failed:", retryError);
                throw retryError;
              } finally {
                setIsRecovering(false);
              }
            }
          : undefined,
        onResume
          ? async () => {
              setIsRecovering(true);
              try {
                await onResume();
                setStreamError(null);
              } catch (resumeError) {
                console.error("Resume failed:", resumeError);
                throw resumeError;
              } finally {
                setIsRecovering(false);
              }
            }
          : undefined
      );

      setStreamError(chatError);
      return chatError;
    },
    [context]
  );

  const clearStreamError = useCallback(() => {
    setStreamError(null);
  }, []);

  return {
    handleError,
    streamError,
    isRecovering,
    clearStreamError,
  };
}

// Hook for file processing error handling
export function useFileErrorHandling(context?: {
  conversationId?: string;
  messageId?: string;
}) {
  const [fileErrors, setFileErrors] = useState<Map<string, ChatError>>(
    new Map()
  );

  const handleError = useCallback(
    async (error: unknown, filename: string): Promise<ChatError> => {
      const chatError = await handleFileError(error, filename, context);

      setFileErrors((prev) => new Map(prev).set(filename, chatError));

      return chatError;
    },
    [context]
  );

  const clearFileError = useCallback((filename: string) => {
    setFileErrors((prev) => {
      const newMap = new Map(prev);
      newMap.delete(filename);
      return newMap;
    });
  }, []);

  const clearAllFileErrors = useCallback(() => {
    setFileErrors(new Map());
  }, []);

  const getFileError = useCallback(
    (filename: string) => {
      return fileErrors.get(filename);
    },
    [fileErrors]
  );

  return {
    handleError,
    fileErrors,
    clearFileError,
    clearAllFileErrors,
    getFileError,
  };
}

// Hook for form validation error handling
export function useValidationErrorHandling() {
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const handleError = useCallback(
    async (error: unknown, field?: string): Promise<ChatError> => {
      const chatError = await handleChatError(error, ErrorCategory.VALIDATION, {
        showToast: false, // Don't show toast for validation errors
      });

      if (field) {
        setValidationErrors((prev) => ({
          ...prev,
          [field]: chatError.userMessage,
        }));
      }

      return chatError;
    },
    []
  );

  const clearFieldError = useCallback((field: string) => {
    setValidationErrors((prev) => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setValidationErrors({});
  }, []);

  const hasErrors = Object.keys(validationErrors).length > 0;

  return {
    handleError,
    validationErrors,
    clearFieldError,
    clearAllErrors,
    hasErrors,
  };
}

// Hook for model-specific error handling
export function useModelErrorHandling(
  currentModel: string,
  onModelSwitch?: (newModel: string) => void
) {
  const [modelErrors, setModelErrors] = useState<Map<string, ChatError>>(
    new Map()
  );
  const [failedModels, setFailedModels] = useState<Set<string>>(new Set());

  const handleError = useCallback(
    async (
      error: unknown,
      model: string = currentModel,
      context?: {
        conversationId?: string;
        messageId?: string;
      }
    ): Promise<ChatError> => {
      const chatError = await handleChatError(
        error,
        ErrorCategory.AI_PROVIDER,
        {
          context: { ...context, model, provider: model.split("/")[0] },
          suggestRecovery: true,
        }
      );

      setModelErrors((prev) => new Map(prev).set(model, chatError));

      // Mark model as failed if it's a critical error
      if (
        chatError.severity === ErrorSeverity.CRITICAL ||
        chatError.severity === ErrorSeverity.HIGH
      ) {
        setFailedModels((prev) => new Set(prev).add(model));
      }

      return chatError;
    },
    [currentModel]
  );

  const clearModelError = useCallback((model: string) => {
    setModelErrors((prev) => {
      const newMap = new Map(prev);
      newMap.delete(model);
      return newMap;
    });

    setFailedModels((prev) => {
      const newSet = new Set(prev);
      newSet.delete(model);
      return newSet;
    });
  }, []);

  const suggestAlternativeModel = useCallback(
    (availableModels: string[]) => {
      // Find a model that hasn't failed recently
      const workingModels = availableModels.filter(
        (model) => !failedModels.has(model)
      );

      if (workingModels.length > 0) {
        const suggested = workingModels[0];
        if (onModelSwitch) {
          onModelSwitch(suggested);
        }
        return suggested;
      }

      return null;
    },
    [failedModels, onModelSwitch]
  );

  const isModelFailed = useCallback(
    (model: string) => {
      return failedModels.has(model);
    },
    [failedModels]
  );

  return {
    handleError,
    modelErrors,
    failedModels,
    clearModelError,
    suggestAlternativeModel,
    isModelFailed,
  };
}

// Hook for comprehensive error recovery
export function useErrorRecovery() {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryActions, setRecoveryActions] = useState<
    Array<{
      action: string;
      label: string;
      execute: () => Promise<void>;
    }>
  >([]);

  const addRecoveryAction = useCallback(
    (action: string, label: string, execute: () => Promise<void>) => {
      setRecoveryActions((prev) => [...prev, { action, label, execute }]);
    },
    []
  );

  const executeRecovery = useCallback(
    async (action: string) => {
      const recoveryAction = recoveryActions.find((a) => a.action === action);
      if (!recoveryAction) return;

      setIsRecovering(true);
      try {
        await recoveryAction.execute();
        // Remove the action after successful execution
        setRecoveryActions((prev) => prev.filter((a) => a.action !== action));
      } catch (error) {
        console.error(`Recovery action '${action}' failed:`, error);
        throw error;
      } finally {
        setIsRecovering(false);
      }
    },
    [recoveryActions]
  );

  const clearRecoveryActions = useCallback(() => {
    setRecoveryActions([]);
  }, []);

  return {
    isRecovering,
    recoveryActions,
    addRecoveryAction,
    executeRecovery,
    clearRecoveryActions,
  };
}
