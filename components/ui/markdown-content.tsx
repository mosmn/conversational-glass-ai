"use client";

import React, { useMemo } from "react";
import { CodeBlock, InlineCode } from "./code-block";
import { cn } from "@/lib/utils";
import type {
  ProcessedContent,
  ProcessedSegment,
} from "@/lib/content/markdown-processor";

interface MarkdownContentProps {
  content: string;
  processedContent?: ProcessedContent;
  className?: string;
  showLineNumbers?: boolean;
  maxCodeBlockHeight?: string;
  allowHtml?: boolean;
  isStreaming?: boolean;
}

export function MarkdownContent({
  content,
  processedContent,
  className,
  showLineNumbers = false,
  maxCodeBlockHeight = "400px",
  allowHtml = false,
  isStreaming = false,
}: MarkdownContentProps) {
  const renderedContent = useMemo(() => {
    // If we have processed content, use it
    if (processedContent && !isStreaming) {
      return renderProcessedContent(processedContent, {
        showLineNumbers,
        maxCodeBlockHeight,
      });
    }

    // For streaming or simple content, render as plain text
    return renderPlainContent(content, allowHtml);
  }, [
    processedContent,
    content,
    showLineNumbers,
    maxCodeBlockHeight,
    allowHtml,
    isStreaming,
  ]);

  return (
    <div
      className={cn(
        "markdown-content",
        "prose prose-invert max-w-none",
        "text-current",
        className
      )}
    >
      {renderedContent}
    </div>
  );
}

function renderProcessedContent(
  processedContent: ProcessedContent,
  options: {
    showLineNumbers: boolean;
    maxCodeBlockHeight: string;
  }
): React.ReactNode {
  if (processedContent.isPlainText) {
    const segment = processedContent.segments[0];
    return (
      <div
        className="whitespace-pre-wrap break-words"
        dangerouslySetInnerHTML={{
          __html: segment.highlightedContent || segment.content,
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {processedContent.segments.map((segment) => (
        <SegmentRenderer
          key={segment.id}
          segment={segment}
          showLineNumbers={options.showLineNumbers}
          maxCodeBlockHeight={options.maxCodeBlockHeight}
        />
      ))}
    </div>
  );
}

function renderPlainContent(
  content: string,
  allowHtml: boolean
): React.ReactNode {
  if (allowHtml) {
    return (
      <div
        className="whitespace-pre-wrap break-words"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return <div className="whitespace-pre-wrap break-words">{content}</div>;
}

interface SegmentRendererProps {
  segment: ProcessedSegment;
  showLineNumbers: boolean;
  maxCodeBlockHeight: string;
}

function SegmentRenderer({
  segment,
  showLineNumbers,
  maxCodeBlockHeight,
}: SegmentRendererProps) {
  switch (segment.type) {
    case "text":
      return (
        <div
          className="whitespace-pre-wrap break-words leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: segment.highlightedContent || segment.content,
          }}
        />
      );

    case "code":
      return (
        <CodeBlock
          code={segment.content}
          language={segment.language}
          filename={segment.filename}
          highlightedHtml={segment.highlightedContent}
          lineCount={segment.lineCount}
          showLineNumbers={showLineNumbers}
          maxHeight={maxCodeBlockHeight}
          error={segment.error}
        />
      );

    case "inline-code":
      return (
        <InlineCode
          language={segment.language}
          highlightedHtml={segment.highlightedContent}
        >
          {segment.content}
        </InlineCode>
      );

    default:
      return (
        <div className="text-slate-400 italic">
          Unknown content type: {(segment as any).type}
        </div>
      );
  }
}

// Streaming content component for real-time updates
interface StreamingContentProps {
  content: string;
  className?: string;
  showTypingIndicator?: boolean;
}

export function StreamingContent({
  content,
  className,
  showTypingIndicator = true,
}: StreamingContentProps) {
  return (
    <div
      className={cn(
        "markdown-content prose prose-invert max-w-none text-current",
        className
      )}
    >
      <div className="whitespace-pre-wrap break-words leading-relaxed">
        {content}
        {showTypingIndicator && (
          <span className="inline-block ml-1 w-2 h-5 bg-emerald-400 animate-pulse" />
        )}
      </div>
    </div>
  );
}

// Content statistics component
interface ContentStatsProps {
  stats: {
    wordCount: number;
    lineCount: number;
    codeBlockCount: number;
    inlineCodeCount: number;
    languages: string[];
  };
  className?: string;
}

export function ContentStats({ stats, className }: ContentStatsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 text-xs text-slate-500",
        className
      )}
    >
      <span>{stats.wordCount} words</span>

      {stats.lineCount > 1 && <span>• {stats.lineCount} lines</span>}

      {stats.codeBlockCount > 0 && (
        <span>
          • {stats.codeBlockCount} code block
          {stats.codeBlockCount !== 1 ? "s" : ""}
        </span>
      )}

      {stats.inlineCodeCount > 0 && (
        <span>• {stats.inlineCodeCount} inline code</span>
      )}

      {stats.languages.length > 0 && (
        <span>• {stats.languages.join(", ")}</span>
      )}
    </div>
  );
}
