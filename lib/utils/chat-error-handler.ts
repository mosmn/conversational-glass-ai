import { toast } from "@/hooks/use-toast";
import { aiLogger, apiLogger, fileLogger, streamLogger } from "./logger";

// Error severity levels
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

// Error categories for chat functionality
export enum ErrorCategory {
  NETWORK = "network",
  AUTHENTICATION = "authentication",
  VALIDATION = "validation",
  AI_PROVIDER = "ai_provider",
  STREAMING = "streaming",
  FILE_PROCESSING = "file_processing",
  RATE_LIMIT = "rate_limit",
  UNKNOWN = "unknown",
}

// Standard error interface
export interface ChatError {
  id: string;
  message: string;
  details?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: Date;
  userMessage: string; // User-friendly message
  technicalMessage: string; // Technical details for logs
  isRetryable: boolean;
  retryCount?: number;
  maxRetries?: number;
  context?: {
    conversationId?: string;
    messageId?: string;
    model?: string;
    provider?: string;
    userId?: string;
    endpoint?: string;
    filename?: string;
  };
}

// Recovery action types
export enum RecoveryAction {
  RETRY = "retry",
  SWITCH_MODEL = "switch_model",
  CLEAR_CACHE = "clear_cache",
  REFRESH_SESSION = "refresh_session",
  CONTACT_SUPPORT = "contact_support",
  NONE = "none",
}

export interface ErrorRecoveryOptions {
  action: RecoveryAction;
  actionLabel: string;
  onAction?: () => Promise<void> | void;
  autoExecute?: boolean;
  delay?: number; // Delay before auto-execution in ms
}

export interface ErrorHandlingOptions {
  showToast?: boolean;
  logError?: boolean;
  suggestRecovery?: boolean;
  context?: ChatError["context"];
  customUserMessage?: string;
  onError?: (error: ChatError) => void;
}

class ChatErrorHandler {
  private errorHistory: Map<string, ChatError[]> = new Map();
  private retryAttempts: Map<string, number> = new Map();

  /**
   * Creates a standardized chat error from various error sources
   */
  createError(
    error: unknown,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    context?: ChatError["context"]
  ): ChatError {
    const id = this.generateErrorId();
    const timestamp = new Date();

    // Parse error message and determine severity
    const { message, technicalMessage, severity, isRetryable } =
      this.parseError(error, category);

    // Generate user-friendly message
    const userMessage = this.generateUserMessage(category, message, context);

    const chatError: ChatError = {
      id,
      message,
      category,
      severity,
      timestamp,
      userMessage,
      technicalMessage,
      isRetryable,
      maxRetries: this.getMaxRetries(category),
      context,
    };

    // Store error in history
    this.addToHistory(chatError);

    return chatError;
  }

  /**
   * Handles an error with standardized logging and user feedback
   */
  async handleError(
    error: unknown,
    category: ErrorCategory,
    options: ErrorHandlingOptions = {}
  ): Promise<ChatError> {
    const chatError = this.createError(error, category, options.context);

    // Log error
    if (options.logError !== false) {
      this.logError(chatError);
    }

    // Show toast notification
    if (options.showToast !== false) {
      this.showErrorToast(chatError, options.suggestRecovery);
    }

    // Call custom error handler
    if (options.onError) {
      try {
        options.onError(chatError);
      } catch (handlerError) {
        console.error("Error in custom error handler:", handlerError);
      }
    }

    return chatError;
  }

  /**
   * Handles streaming errors with special recovery options
   */
  async handleStreamingError(
    error: unknown,
    context: { conversationId: string; messageId: string; streamId?: string },
    onRetry?: () => Promise<void>,
    onResume?: () => Promise<void>
  ): Promise<ChatError> {
    const chatError = this.createError(error, ErrorCategory.STREAMING, context);

    // Determine recovery actions for streaming errors
    const recoveryOptions: ErrorRecoveryOptions[] = [];

    if (onRetry && chatError.isRetryable) {
      recoveryOptions.push({
        action: RecoveryAction.RETRY,
        actionLabel: "Retry Message",
        onAction: onRetry,
      });
    }

    if (onResume && this.isResumableStreamError(error)) {
      recoveryOptions.push({
        action: RecoveryAction.RETRY,
        actionLabel: "Resume Stream",
        onAction: onResume,
      });
    }

    // Log streaming error
    streamLogger.error(
      {
        error: chatError.technicalMessage,
        context,
        recoveryOptions: recoveryOptions.map((opt) => opt.action),
      },
      "Streaming error occurred"
    );

    // Show enhanced toast with recovery options
    this.showStreamingErrorToast(chatError, recoveryOptions);

    return chatError;
  }

  /**
   * Handles API errors with automatic retry logic
   */
  async handleAPIError(
    error: unknown,
    endpoint: string,
    context?: ChatError["context"],
    onRetry?: () => Promise<void>
  ): Promise<ChatError> {
    const category = this.categorizeAPIError(error);
    const chatError = this.createError(error, category, {
      ...context,
      endpoint,
    });

    // Check if we should auto-retry
    if (chatError.isRetryable && onRetry) {
      const retryKey = `${endpoint}-${context?.conversationId}-${context?.messageId}`;
      const currentRetries = this.retryAttempts.get(retryKey) || 0;

      if (currentRetries < (chatError.maxRetries || 3)) {
        this.retryAttempts.set(retryKey, currentRetries + 1);
        chatError.retryCount = currentRetries + 1;

        // Auto-retry with exponential backoff for certain errors
        if (this.shouldAutoRetry(category)) {
          const delay = Math.pow(2, currentRetries) * 1000; // Exponential backoff
          setTimeout(async () => {
            try {
              await onRetry();
              this.retryAttempts.delete(retryKey); // Clear on success
            } catch (retryError) {
              // Handle retry failure
              await this.handleAPIError(retryError, endpoint, context, onRetry);
            }
          }, delay);

          // Show retrying toast
          toast({
            title: "Retrying...",
            description: `Attempting to retry (${currentRetries + 1}/${
              chatError.maxRetries
            })`,
            duration: 3000,
          });

          return chatError;
        }
      } else {
        // Max retries reached
        chatError.isRetryable = false;
        chatError.userMessage =
          "Maximum retry attempts reached. Please try again later.";
      }
    }

    // Log API error
    apiLogger.error(
      {
        endpoint,
        error: chatError.technicalMessage,
        category,
        context,
        retryCount: chatError.retryCount,
      },
      "API error occurred"
    );

    // Show error toast
    this.showErrorToast(chatError, true);

    return chatError;
  }

  /**
   * Handles file processing errors
   */
  async handleFileError(
    error: unknown,
    filename: string,
    context?: ChatError["context"]
  ): Promise<ChatError> {
    const chatError = this.createError(error, ErrorCategory.FILE_PROCESSING, {
      ...context,
      filename,
    });

    // Log file error
    fileLogger.error(
      {
        filename,
        error: chatError.technicalMessage,
        context,
      },
      "File processing error"
    );

    // Show specific file error toast
    toast({
      title: "File Processing Error",
      description: `Failed to process ${filename}: ${chatError.userMessage}`,
      variant: "destructive",
      duration: 5000,
    });

    return chatError;
  }

  /**
   * Gets error recovery suggestions based on error category and context
   */
  getRecoverySuggestions(chatError: ChatError): ErrorRecoveryOptions[] {
    const suggestions: ErrorRecoveryOptions[] = [];

    switch (chatError.category) {
      case ErrorCategory.NETWORK:
        suggestions.push({
          action: RecoveryAction.RETRY,
          actionLabel: "Try Again",
          autoExecute: false,
        });
        break;

      case ErrorCategory.AI_PROVIDER:
        if (chatError.isRetryable) {
          suggestions.push({
            action: RecoveryAction.RETRY,
            actionLabel: "Retry with Same Model",
          });
        }
        suggestions.push({
          action: RecoveryAction.SWITCH_MODEL,
          actionLabel: "Switch to Different Model",
        });
        break;

      case ErrorCategory.RATE_LIMIT:
        suggestions.push({
          action: RecoveryAction.RETRY,
          actionLabel: "Try Again Later",
          delay: 60000, // 1 minute delay
        });
        break;

      case ErrorCategory.AUTHENTICATION:
        suggestions.push({
          action: RecoveryAction.REFRESH_SESSION,
          actionLabel: "Refresh Session",
        });
        break;

      case ErrorCategory.STREAMING:
        if (chatError.isRetryable) {
          suggestions.push({
            action: RecoveryAction.RETRY,
            actionLabel: "Resume Stream",
          });
        }
        break;
    }

    if (chatError.severity === ErrorSeverity.CRITICAL) {
      suggestions.push({
        action: RecoveryAction.CONTACT_SUPPORT,
        actionLabel: "Contact Support",
      });
    }

    return suggestions;
  }

  /**
   * Gets error statistics for debugging
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: ChatError[];
  } {
    const allErrors = Array.from(this.errorHistory.values()).flat();

    const errorsByCategory = Object.values(ErrorCategory).reduce(
      (acc, category) => {
        acc[category] = allErrors.filter((e) => e.category === category).length;
        return acc;
      },
      {} as Record<ErrorCategory, number>
    );

    const errorsBySeverity = Object.values(ErrorSeverity).reduce(
      (acc, severity) => {
        acc[severity] = allErrors.filter((e) => e.severity === severity).length;
        return acc;
      },
      {} as Record<ErrorSeverity, number>
    );

    const recentErrors = allErrors
      .filter((e) => Date.now() - e.timestamp.getTime() < 30 * 60 * 1000) // Last 30 minutes
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      totalErrors: allErrors.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors,
    };
  }

  /**
   * Clears error history for a specific context
   */
  clearErrorHistory(context?: {
    conversationId?: string;
    messageId?: string;
  }): void {
    if (!context) {
      this.errorHistory.clear();
      this.retryAttempts.clear();
      return;
    }

    if (context.conversationId) {
      this.errorHistory.delete(context.conversationId);
    }

    // Clear retry attempts for specific context
    for (const [key] of this.retryAttempts) {
      if (
        key.includes(context.conversationId || "") ||
        key.includes(context.messageId || "")
      ) {
        this.retryAttempts.delete(key);
      }
    }
  }

  // Private helper methods

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private parseError(
    error: unknown,
    category: ErrorCategory
  ): {
    message: string;
    technicalMessage: string;
    severity: ErrorSeverity;
    isRetryable: boolean;
  } {
    let message = "Unknown error occurred";
    let technicalMessage = "Unknown error";
    let severity = ErrorSeverity.MEDIUM;
    let isRetryable = false;

    if (error instanceof Error) {
      message = error.message;
      technicalMessage = `${error.name}: ${error.message}\n${error.stack}`;
    } else if (typeof error === "string") {
      message = error;
      technicalMessage = error;
    } else if (error && typeof error === "object") {
      message =
        (error as any).message || (error as any).error || JSON.stringify(error);
      technicalMessage = JSON.stringify(error, null, 2);
    }

    // Determine severity and retryability based on error content
    if (
      message.toLowerCase().includes("network") ||
      message.toLowerCase().includes("timeout")
    ) {
      severity = ErrorSeverity.LOW;
      isRetryable = true;
    } else if (message.toLowerCase().includes("rate limit")) {
      severity = ErrorSeverity.MEDIUM;
      isRetryable = true;
    } else if (
      message.toLowerCase().includes("unauthorized") ||
      message.toLowerCase().includes("forbidden")
    ) {
      severity = ErrorSeverity.HIGH;
      isRetryable = false;
    } else if (
      message.toLowerCase().includes("server error") ||
      message.toLowerCase().includes("internal error")
    ) {
      severity = ErrorSeverity.HIGH;
      isRetryable = true;
    }

    return { message, technicalMessage, severity, isRetryable };
  }

  private generateUserMessage(
    category: ErrorCategory,
    message: string,
    context?: ChatError["context"]
  ): string {
    switch (category) {
      case ErrorCategory.NETWORK:
        return "Connection issue detected. Please check your internet connection and try again.";
      case ErrorCategory.AUTHENTICATION:
        return "Authentication failed. Please refresh the page or sign in again.";
      case ErrorCategory.AI_PROVIDER:
        return `AI service temporarily unavailable${
          context?.model ? ` for ${context.model}` : ""
        }. Please try again or switch models.`;
      case ErrorCategory.RATE_LIMIT:
        return "Rate limit exceeded. Please wait a moment before sending another message.";
      case ErrorCategory.STREAMING:
        return "Message streaming was interrupted. You can try to resume or retry the message.";
      case ErrorCategory.FILE_PROCESSING:
        return "File processing failed. Please check the file format and try again.";
      case ErrorCategory.VALIDATION:
        return "Invalid input detected. Please check your message and try again.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  }

  private getMaxRetries(category: ErrorCategory): number {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 3;
      case ErrorCategory.AI_PROVIDER:
        return 2;
      case ErrorCategory.RATE_LIMIT:
        return 1;
      case ErrorCategory.STREAMING:
        return 3;
      default:
        return 1;
    }
  }

  private categorizeAPIError(error: unknown): ErrorCategory {
    const message = error instanceof Error ? error.message : String(error);
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("unauthorized") || lowerMessage.includes("401")) {
      return ErrorCategory.AUTHENTICATION;
    }
    if (lowerMessage.includes("rate limit") || lowerMessage.includes("429")) {
      return ErrorCategory.RATE_LIMIT;
    }
    if (lowerMessage.includes("network") || lowerMessage.includes("timeout")) {
      return ErrorCategory.NETWORK;
    }
    if (
      lowerMessage.includes("openai") ||
      lowerMessage.includes("anthropic") ||
      lowerMessage.includes("gemini")
    ) {
      return ErrorCategory.AI_PROVIDER;
    }

    return ErrorCategory.UNKNOWN;
  }

  private shouldAutoRetry(category: ErrorCategory): boolean {
    return [ErrorCategory.NETWORK, ErrorCategory.RATE_LIMIT].includes(category);
  }

  private isResumableStreamError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.toLowerCase().includes("stream") &&
      (message.toLowerCase().includes("interrupted") ||
        message.toLowerCase().includes("paused"))
    );
  }

  private addToHistory(error: ChatError): void {
    const key = error.context?.conversationId || "global";
    if (!this.errorHistory.has(key)) {
      this.errorHistory.set(key, []);
    }

    const errors = this.errorHistory.get(key)!;
    errors.push(error);

    // Keep only last 50 errors per conversation
    if (errors.length > 50) {
      errors.splice(0, errors.length - 50);
    }
  }

  private logError(error: ChatError): void {
    const logger =
      error.category === ErrorCategory.AI_PROVIDER ? aiLogger : apiLogger;

    logger.error(
      {
        errorId: error.id,
        category: error.category,
        severity: error.severity,
        context: error.context,
        isRetryable: error.isRetryable,
        retryCount: error.retryCount,
        technicalMessage: error.technicalMessage,
      },
      error.userMessage
    );
  }

  private showErrorToast(
    error: ChatError,
    showRecovery: boolean = false
  ): void {
    const recoveryOptions = showRecovery
      ? this.getRecoverySuggestions(error)
      : [];

    toast({
      title: this.getToastTitle(error.category, error.severity),
      description: error.userMessage,
      variant:
        error.severity === ErrorSeverity.CRITICAL ? "destructive" : "default",
      duration: this.getToastDuration(error.severity),
    });
  }

  private showStreamingErrorToast(
    error: ChatError,
    recoveryOptions: ErrorRecoveryOptions[]
  ): void {
    toast({
      title: "Streaming Interrupted",
      description: error.userMessage,
      variant: "default",
      duration: 8000, // Longer duration for streaming errors
    });
  }

  private getToastTitle(
    category: ErrorCategory,
    severity: ErrorSeverity
  ): string {
    if (severity === ErrorSeverity.CRITICAL) return "Critical Error";
    if (severity === ErrorSeverity.HIGH) return "Error";

    switch (category) {
      case ErrorCategory.NETWORK:
        return "Connection Issue";
      case ErrorCategory.AI_PROVIDER:
        return "AI Service Issue";
      case ErrorCategory.RATE_LIMIT:
        return "Rate Limited";
      case ErrorCategory.STREAMING:
        return "Stream Interrupted";
      default:
        return "Error";
    }
  }

  private getToastDuration(severity: ErrorSeverity): number {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 10000;
      case ErrorSeverity.HIGH:
        return 7000;
      case ErrorSeverity.MEDIUM:
        return 5000;
      default:
        return 3000;
    }
  }
}

// Export singleton instance
export const chatErrorHandler = new ChatErrorHandler();

// Convenience functions for common error scenarios
export const handleChatError =
  chatErrorHandler.handleError.bind(chatErrorHandler);
export const handleStreamingError =
  chatErrorHandler.handleStreamingError.bind(chatErrorHandler);
export const handleAPIError =
  chatErrorHandler.handleAPIError.bind(chatErrorHandler);
export const handleFileError =
  chatErrorHandler.handleFileError.bind(chatErrorHandler);

// Types are exported via their interface declarations above
