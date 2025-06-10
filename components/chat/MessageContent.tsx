"use client";

import React, { useState, useEffect, useMemo } from "react";
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

  // Determine if content needs processing
  const requiresProcessing = useMemo(() => {
    // Always process assistant messages to ensure markdown is rendered
    if (!isUser) {
      return true;
    }

    // For user messages, only process if there are obvious code patterns
    const hasCodePatterns = content.includes("```") || content.includes("`");
    return hasCodePatterns;
  }, [content, isUser]);

  // Process content when it changes and is not streaming
  useEffect(() => {
    if (!requiresProcessing || isStreaming || !content.trim()) {
      setProcessedContent(null);
      return;
    }

    let isMounted = true;

    const processContentAsync = async () => {
      setIsProcessing(true);
      setProcessingError(null);

      try {
        const processed = await processContent(content, {
          enableHighlighting: true,
          showLineNumbers,
          maxCodeBlockHeight,
          allowHtml,
        });

        if (isMounted) {
          setProcessedContent(processed);
        }
      } catch (error) {
        console.error("Failed to process message content:", error);
        if (isMounted) {
          setProcessingError(
            error instanceof Error ? error.message : "Processing failed"
          );
        }
      } finally {
        if (isMounted) {
          setIsProcessing(false);
        }
      }
    };

    // Debounce processing for performance
    const timeoutId = setTimeout(processContentAsync, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [
    content,
    requiresProcessing,
    isStreaming,
    showLineNumbers,
    maxCodeBlockHeight,
    allowHtml,
  ]);

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

  // Show processing state
  if (requiresProcessing && isProcessing) {
    return (
      <div className={cn("relative", className)}>
        <MarkdownContent
          content={content}
          className="opacity-50"
          allowHtml={allowHtml}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/20 rounded">
          <div className="flex items-center space-x-2 text-sm text-slate-400">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-400 border-t-transparent" />
            <span>Processing code...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (processingError) {
    return (
      <div className={className}>
        <MarkdownContent content={content} allowHtml={allowHtml} />
        <div className="mt-2 text-xs text-amber-400 opacity-75">
          ⚠️ Code highlighting failed: {processingError}
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
        allowHtml={allowHtml}
      />
    );
  }

  // Fallback to simple content
  return (
    <MarkdownContent
      content={content}
      className={className}
      allowHtml={allowHtml}
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
                  allowHtml={false}
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
