"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  MarkdownContent,
  StreamingContent,
} from "@/components/ui/markdown-content";
import {
  processContent,
  needsProcessing,
} from "@/lib/content/markdown-processor";
import type { ProcessedContent } from "@/lib/content/markdown-processor";
import { cn } from "@/lib/utils";
import { ThinkingBlock } from "./ThinkingBlock";

// Add performance helpers
const PROCESSING_DEBOUNCE_MS = 200;
const MAX_CONTENT_LENGTH_FOR_SYNC_PROCESSING = 1000;

// Helper for non-blocking processing
const scheduleNonBlockingWork = (callback: () => Promise<void>) => {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(async () => await callback(), { timeout: 300 });
  } else {
    setTimeout(async () => await callback(), 0);
  }
};

interface MessageContentProps {
  content: string;
  isStreaming?: boolean;
  isUser?: boolean;
  className?: string;
  showLineNumbers?: boolean;
  maxCodeBlockHeight?: string;
  allowHtml?: boolean;
}

export function MessageContent({
  content,
  isStreaming = false,
  isUser = false,
  className,
  showLineNumbers = false,
  maxCodeBlockHeight = "400px",
  allowHtml = false,
}: MessageContentProps) {
  const [processedContent, setProcessedContent] =
    useState<ProcessedContent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Intelligent processing check using synchronous patterns
  const requiresProcessing = useMemo(() => {
    if (!content.trim() || isStreaming) return false;

    // Skip processing for very long content to prevent blocking
    if (content.length > 10000) {
      console.warn(
        "Content too long for advanced processing, using basic rendering"
      );
      return false;
    }

    // For user messages, only process if there's clear markdown/code content
    if (isUser) {
      // Check for obvious code patterns
      const hasCode =
        content.includes("```") ||
        content.includes("`") ||
        (content.includes("\n") && content.match(/^[ ]{4,}/m)); // Indented code blocks

      // Check for other markdown patterns
      const hasMarkdown =
        content.includes("*") ||
        content.includes("#") ||
        content.includes("](") ||
        content.includes("- ") ||
        content.includes("1. ");

      return hasCode || hasMarkdown;
    }

    // For assistant messages, use intelligent checks for processing needs
    const hasCodeBlocks = content.includes("```");
    const hasInlineCode = content.includes("`");
    const hasMarkdown =
      content.includes("*") ||
      content.includes("#") ||
      content.includes("](") ||
      content.includes("- ") ||
      content.includes("1. ") ||
      content.includes("**") ||
      content.includes("__") ||
      content.includes("~~");

    // Only process if there's actual formatted content
    return hasCodeBlocks || hasInlineCode || hasMarkdown;
  }, [content, isUser, isStreaming]);

  // Determine processing type for better user feedback
  const processingType = useMemo(() => {
    if (!content.trim() || !requiresProcessing) return null;

    const hasCodeBlocks = content.includes("```");
    const hasInlineCode = content.includes("`") && !hasCodeBlocks;
    const hasMarkdown =
      content.includes("*") ||
      content.includes("#") ||
      content.includes("](") ||
      content.includes("- ") ||
      content.includes("1. ");

    if (hasCodeBlocks) return "code";
    if (hasInlineCode) return "inline-code";
    if (hasMarkdown) return "markdown";

    return "text";
  }, [content, requiresProcessing]);

  // Process content when it changes and is not streaming
  useEffect(() => {
    // Clear any pending processing
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!requiresProcessing || isStreaming || !content.trim()) {
      setProcessedContent(null);
      setIsProcessing(false);
      return;
    }

    let isMounted = true;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const processContentAsync = async () => {
      if (abortController.signal.aborted) return;

      setIsProcessing(true);
      setProcessingError(null);

      try {
        // For assistant messages, always allow HTML for proper markdown rendering
        // For user messages, only allow HTML if there's clear markdown content
        const shouldAllowHtml = !isUser || allowHtml;

        // Use non-blocking processing for larger content
        let processed: ProcessedContent;

        if (content.length > MAX_CONTENT_LENGTH_FOR_SYNC_PROCESSING) {
          // Schedule heavy processing work in idle time
          processed = await new Promise<ProcessedContent>((resolve, reject) => {
            scheduleNonBlockingWork(async () => {
              try {
                const result = await processContent(content, {
                  enableHighlighting: true,
                  showLineNumbers,
                  maxCodeBlockHeight,
                  allowHtml: shouldAllowHtml,
                });
                resolve(result);
              } catch (error) {
                reject(error);
              }
            });
          });
        } else {
          processed = await processContent(content, {
            enableHighlighting: true,
            showLineNumbers,
            maxCodeBlockHeight,
            allowHtml: shouldAllowHtml,
          });
        }

        if (isMounted && !abortController.signal.aborted) {
          setProcessedContent(processed);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error("Failed to process message content:", error);
          if (isMounted) {
            setProcessingError(
              error instanceof Error ? error.message : "Processing failed"
            );
          }
        }
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setIsProcessing(false);
        }
      }
    };

    // Debounce processing for performance with longer delay for complex content
    const debounceMs =
      content.length > MAX_CONTENT_LENGTH_FOR_SYNC_PROCESSING
        ? PROCESSING_DEBOUNCE_MS * 2
        : PROCESSING_DEBOUNCE_MS;

    processingTimeoutRef.current = setTimeout(processContentAsync, debounceMs);

    return () => {
      isMounted = false;
      abortController.abort();
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, [
    content,
    requiresProcessing,
    isStreaming,
    showLineNumbers,
    maxCodeBlockHeight,
    allowHtml,
    isUser,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Show streaming content during streaming
  if (isStreaming) {
    return (
      <StreamingContent
        content={content}
        className={className}
        showTypingIndicator={true}
      />
    );
  }

  // Show processing state with contextual messaging
  if (isProcessing && processedContent === null) {
    const processingMessage = (() => {
      switch (processingType) {
        case "code":
          return "Formatting code...";
        case "inline-code":
          return "Highlighting syntax...";
        case "markdown":
          return "Rendering content...";
        default:
          return "Processing...";
      }
    })();

    return (
      <div className={cn("relative", className)}>
        <div className="opacity-60">
          <MarkdownContent content={content} allowHtml={!isUser || allowHtml} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/10 rounded">
          <div className="flex items-center space-x-2 text-sm text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-full backdrop-blur-sm">
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-slate-400 border-t-transparent" />
            <span>{processingMessage}</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (processingError) {
    return (
      <div className={className}>
        <MarkdownContent content={content} allowHtml={!isUser || allowHtml} />
        <div className="mt-2 text-xs text-amber-400 opacity-75">
          ⚠️ Content processing failed: {processingError}
        </div>
      </div>
    );
  }

  // Show processed content
  if (processedContent) {
    return (
      <MarkdownContent
        content={content}
        processedContent={processedContent}
        className={className}
        showLineNumbers={showLineNumbers}
        maxCodeBlockHeight={maxCodeBlockHeight}
        allowHtml={!isUser || allowHtml}
      />
    );
  }

  // Fallback to simple content - no unnecessary processing
  return (
    <MarkdownContent
      content={content}
      className={className}
      allowHtml={!isUser || allowHtml}
    />
  );
}

// Enhanced message bubble with improved content rendering
interface EnhancedMessageBubbleProps {
  content: string;
  role: "user" | "assistant" | "system";
  isStreaming?: boolean;
  timestamp: string | Date;
  model?: string;
  metadata?: {
    streamingComplete?: boolean;
    processingTime?: number;
    regenerated?: boolean;
    provider?: string;
    error?: boolean;
  };
  error?: string;
  className?: string;
}

export function EnhancedMessageBubble({
  content,
  role,
  isStreaming = false,
  timestamp,
  model,
  metadata,
  error,
  className,
}: EnhancedMessageBubbleProps) {
  const isUser = role === "user";
  const hasError = metadata?.error || error;

  return (
    <div
      className={cn(
        "flex",
        isUser ? "justify-end" : "justify-start",
        "group",
        className
      )}
    >
      <div className={cn("max-w-[80%]", isUser ? "order-2" : "order-1")}>
        <div
          className={cn(
            "flex items-start space-x-3",
            isUser ? "flex-row-reverse space-x-reverse" : ""
          )}
        >
          {/* Avatar */}
          <div
            className={cn(
              "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium",
              hasError
                ? "bg-red-600"
                : isUser
                ? "bg-emerald-600"
                : "bg-blue-600",
              "text-white"
            )}
          >
            {isUser ? "U" : "AI"}
          </div>

          {/* Message Content */}
          <div className={cn("flex-1", isUser ? "text-right" : "text-left")}>
            <div
              className={cn(
                "inline-block p-4 rounded-2xl",
                hasError
                  ? "bg-red-600/20 border border-red-500/30 text-red-400"
                  : isUser
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm text-slate-100"
              )}
            >
              {hasError ? (
                <div className="flex items-center">
                  <span className="mr-2">⚠️</span>
                  {error || "Failed to generate response"}
                </div>
              ) : (
                <MessageContent
                  content={content}
                  isStreaming={isStreaming}
                  isUser={isUser}
                  showLineNumbers={false}
                  maxCodeBlockHeight="300px"
                  allowHtml={!isUser} // Only allow HTML for assistant messages by default
                />
              )}
            </div>

            {/* Message metadata */}
            <div
              className={cn(
                "flex items-center justify-between mt-2 text-xs text-slate-400",
                isUser ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className="flex items-center space-x-2">
                <span>{new Date(timestamp).toLocaleTimeString()}</span>

                {/* Delivery status */}
                <span className="text-emerald-400" title="Delivered">
                  ✓
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {metadata?.processingTime && (
                  <span title={`Processing time: ${metadata.processingTime}s`}>
                    ⚡ {metadata.processingTime.toFixed(1)}s
                  </span>
                )}

                {model && <span>• {model}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
