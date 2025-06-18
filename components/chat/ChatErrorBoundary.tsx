"use client";

import React, { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertTriangle, Bug, MessageSquare } from "lucide-react";
import {
  chatErrorHandler,
  ErrorCategory,
  ErrorSeverity,
} from "@/lib/utils/chat-error-handler";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  conversationId?: string;
  messageId?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  retryCount: number;
}

export class ChatErrorBoundary extends Component<Props, State> {
  private readonly maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Handle the error using our standardized error handler
    const chatError = chatErrorHandler.createError(
      error,
      ErrorCategory.UNKNOWN,
      {
        conversationId: this.props.conversationId,
        messageId: this.props.messageId,
      }
    );

    this.setState({ errorId: chatError.id });

    // Log the error with React error info
    console.error("React Error Boundary caught an error:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: chatError.id,
      context: {
        conversationId: this.props.conversationId,
        messageId: this.props.messageId,
      },
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Don't show toast for React errors as we'll show inline UI
    chatErrorHandler.handleError(error, ErrorCategory.UNKNOWN, {
      showToast: false,
      context: {
        conversationId: this.props.conversationId,
        messageId: this.props.messageId,
      },
    });
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState((prevState) => ({
        hasError: false,
        error: null,
        errorId: null,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  handleRefresh = () => {
    window.location.reload();
  };

  getErrorSeverity(): ErrorSeverity {
    if (!this.state.error) return ErrorSeverity.MEDIUM;

    const message = this.state.error.message.toLowerCase();

    if (
      message.includes("chunkloaderror") ||
      message.includes("loading chunk")
    ) {
      return ErrorSeverity.LOW; // Often recoverable with retry
    }

    if (message.includes("network") || message.includes("fetch")) {
      return ErrorSeverity.LOW;
    }

    if (
      message.includes("out of memory") ||
      message.includes("maximum call stack")
    ) {
      return ErrorSeverity.CRITICAL;
    }

    return ErrorSeverity.MEDIUM;
  }

  getErrorType(): string {
    if (!this.state.error) return "Unknown Error";

    const message = this.state.error.message.toLowerCase();
    const name = this.state.error.name;

    if (
      message.includes("chunkloaderror") ||
      message.includes("loading chunk")
    ) {
      return "Resource Loading Error";
    }

    if (message.includes("network") || message.includes("fetch")) {
      return "Network Error";
    }

    if (name === "TypeError") {
      return "Type Error";
    }

    if (name === "ReferenceError") {
      return "Reference Error";
    }

    if (message.includes("out of memory")) {
      return "Memory Error";
    }

    return name || "Runtime Error";
  }

  getUserFriendlyMessage(): string {
    if (!this.state.error) return "An unexpected error occurred.";

    const message = this.state.error.message.toLowerCase();

    if (
      message.includes("chunkloaderror") ||
      message.includes("loading chunk")
    ) {
      return "Failed to load application resources. This is usually temporary.";
    }

    if (message.includes("network") || message.includes("fetch")) {
      return "Network connection issue. Please check your internet connection.";
    }

    if (message.includes("out of memory")) {
      return "The application is using too much memory. Please refresh the page.";
    }

    return "Something went wrong with the chat interface. We've logged the error and are working on a fix.";
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const severity = this.getErrorSeverity();
      const errorType = this.getErrorType();
      const userMessage = this.getUserFriendlyMessage();
      const canRetry = this.state.retryCount < this.maxRetries;
      const shouldShowTechnicalDetails = severity === ErrorSeverity.CRITICAL;

      return (
        <div className="flex items-center justify-center min-h-[200px] p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert
              className={`border-2 ${
                severity === ErrorSeverity.CRITICAL
                  ? "border-red-500/50 bg-red-500/10"
                  : severity === ErrorSeverity.HIGH
                  ? "border-orange-500/50 bg-orange-500/10"
                  : "border-yellow-500/50 bg-yellow-500/10"
              }`}
            >
              <AlertTriangle
                className={`h-4 w-4 ${
                  severity === ErrorSeverity.CRITICAL
                    ? "text-red-500"
                    : severity === ErrorSeverity.HIGH
                    ? "text-orange-500"
                    : "text-yellow-500"
                }`}
              />
              <AlertTitle className="flex items-center gap-2">
                <span>Chat Error</span>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    severity === ErrorSeverity.CRITICAL
                      ? "border-red-500/50 text-red-400"
                      : severity === ErrorSeverity.HIGH
                      ? "border-orange-500/50 text-orange-400"
                      : "border-yellow-500/50 text-yellow-400"
                  }`}
                >
                  {errorType}
                </Badge>
              </AlertTitle>
              <AlertDescription className="space-y-3">
                <p className="text-sm text-muted-foreground">{userMessage}</p>

                {this.state.errorId && (
                  <p className="text-xs font-mono text-muted-foreground">
                    Error ID: {this.state.errorId}
                  </p>
                )}

                {shouldShowTechnicalDetails && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Technical Details
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {this.state.error.name}: {this.state.error.message}
                      {this.state.error.stack && (
                        <>
                          {"\n\nStack Trace:"}
                          {"\n"}
                          {this.state.error.stack}
                        </>
                      )}
                    </pre>
                  </details>
                )}

                <div className="flex gap-2 pt-2">
                  {canRetry && (
                    <Button
                      size="sm"
                      onClick={this.handleRetry}
                      className="flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Try Again
                      {this.state.retryCount > 0 && (
                        <span className="text-xs">
                          ({this.state.retryCount}/{this.maxRetries})
                        </span>
                      )}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={this.handleRefresh}
                    className="flex items-center gap-1"
                  >
                    <MessageSquare className="h-3 w-3" />
                    Refresh Page
                  </Button>

                  {severity === ErrorSeverity.CRITICAL && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        window.open(
                          "mailto:support@example.com?subject=Critical Chat Error&body=Error ID: " +
                            this.state.errorId,
                          "_blank"
                        );
                      }}
                      className="flex items-center gap-1"
                    >
                      <Bug className="h-3 w-3" />
                      Report Bug
                    </Button>
                  )}
                </div>

                {!canRetry && (
                  <p className="text-xs text-muted-foreground">
                    Maximum retry attempts reached. Please refresh the page or
                    contact support.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withChatErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, "children">
) {
  return function WrappedComponent(props: P) {
    return (
      <ChatErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ChatErrorBoundary>
    );
  };
}

// Hook for programmatic error reporting
export function useChatErrorReporting() {
  const reportError = React.useCallback(
    (
      error: Error,
      context?: {
        conversationId?: string;
        messageId?: string;
        action?: string;
      }
    ) => {
      chatErrorHandler.handleError(error, ErrorCategory.UNKNOWN, {
        context,
        showToast: true,
        logError: true,
      });
    },
    []
  );

  return { reportError };
}
