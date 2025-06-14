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
        "prose-strong:text-white prose-em:text-slate-200",
        "prose-code:bg-slate-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-emerald-300",
        "prose-blockquote:border-l-emerald-500 prose-blockquote:text-slate-300",
        "prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:text-emerald-300",
        "prose-headings:text-white prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
        "prose-p:text-slate-100 prose-p:leading-relaxed",
        "prose-li:text-slate-200 prose-ul:list-disc prose-ol:list-decimal",
        "prose-table:border-slate-600 prose-th:border-slate-600 prose-td:border-slate-600",
        "prose-hr:border-slate-600",
        "text-current leading-relaxed",
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
        className="whitespace-pre-wrap break-words leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: segment.highlightedContent || segment.content,
        }}
      />
    );
  }

  return (
    <div className="space-y-2">
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
    // If it's simple text without HTML, don't use dangerouslySetInnerHTML
    if (!content.includes("<") && !content.includes("&")) {
      return (
        <div className="whitespace-pre-wrap break-words leading-relaxed">
          {content}
        </div>
      );
    }

    return (
      <div
        className="leading-relaxed"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <div className="whitespace-pre-wrap break-words leading-relaxed">
      {content}
    </div>
  );
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
          className="leading-relaxed"
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
