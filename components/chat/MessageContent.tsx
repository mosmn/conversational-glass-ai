"use client";

import React, { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/cjs/styles/prism";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  FileText,
  ExternalLink,
  Quote,
  List,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface MessageContentProps {
  content: string;
  isStreaming?: boolean;
  isUser?: boolean;
  className?: string;
  showLineNumbers?: boolean;
  maxCodeBlockHeight?: string;
  allowHtml?: boolean;
}

interface CodeBlockProps {
  children: string;
  className?: string;
  inline?: boolean;
}

// Language icon mapping for better visual representation
const getLanguageIcon = (language: string) => {
  switch (language.toLowerCase()) {
    case "javascript":
    case "js":
      return "🟨";
    case "typescript":
    case "ts":
      return "🔷";
    case "python":
    case "py":
      return "🐍";
    case "java":
      return "☕";
    case "cpp":
    case "c++":
      return "⚡";
    case "rust":
      return "🦀";
    case "go":
      return "🐹";
    case "html":
      return "🌐";
    case "css":
      return "🎨";
    case "sql":
      return "🗄️";
    case "bash":
    case "shell":
      return "💻";
    case "json":
      return "📋";
    case "yaml":
    case "yml":
      return "📄";
    default:
      return "📝";
  }
};

function CodeBlock({ children, className, inline }: CodeBlockProps) {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Extract language from className (format: "language-javascript")
  const language = className?.replace("language-", "") || "text";
  const languageIcon = getLanguageIcon(language);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Code copied to clipboard",
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  // Inline code with explicit theme colors
  if (inline) {
    return (
      <code className="relative rounded bg-gray-100 dark:bg-gray-800 px-[0.3rem] py-[0.2rem] font-mono text-sm font-medium text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600">
        {children}
      </code>
    );
  }

  // Determine if code block should be collapsible (more than 15 lines)
  const lineCount = children.split("\n").length;
  const isLongCode = lineCount > 15;

  // Block code with explicit theme colors
  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
      {/* Header with explicit colors */}
      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-300 dark:border-gray-600">
        <div className="flex items-center gap-2">
          <span className="text-sm" role="img" aria-label={`${language} icon`}>
            {languageIcon}
          </span>
          <span className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">
            {language === "text" ? "Code" : language}
          </span>
          {lineCount > 1 && (
            <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400">
              {lineCount} lines
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isLongCode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
              title={isExpanded ? "Collapse code" : "Expand code"}
              style={{ color: theme === "dark" ? "#ffffff" : "#000000" }}
            >
              {isExpanded ? (
                <ChevronUp
                  className="h-3 w-3"
                  style={{ color: theme === "dark" ? "#ffffff" : "#000000" }}
                />
              ) : (
                <ChevronDown
                  className="h-3 w-3"
                  style={{ color: theme === "dark" ? "#ffffff" : "#000000" }}
                />
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Copy code"
            style={{ color: theme === "dark" ? "#ffffff" : "#000000" }}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
            ) : (
              <Copy
                className="h-3 w-3"
                style={{ color: theme === "dark" ? "#ffffff" : "#000000" }}
              />
            )}
          </Button>
        </div>
      </div>

      {/* Code content with proper width constraints */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isLongCode && !isExpanded && "max-h-60"
        )}
      >
        <div className="overflow-x-auto max-w-full">
          <SyntaxHighlighter
            language={language}
            style={theme === "dark" ? oneDark : oneLight}
            showLineNumbers={true}
            wrapLines={false}
            customStyle={{
              margin: 0,
              borderRadius: 0,
              fontSize: "13px",
              lineHeight: "1.4",
              background: "transparent",
            }}
            codeTagProps={{
              style: {
                fontSize: "13px",
                fontFamily:
                  'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
              },
            }}
          >
            {children}
          </SyntaxHighlighter>
        </div>
      </div>

      {/* Fade overlay for collapsed code */}
      {isLongCode && !isExpanded && (
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none" />
      )}
    </div>
  );
}

export const MessageContent = memo(function MessageContent({
  content,
  isStreaming = false,
  isUser = false,
  className,
  showLineNumbers = true,
  maxCodeBlockHeight = "400px",
  allowHtml = false,
}: MessageContentProps) {
  // Simple content preprocessing for user messages
  const processedContent = isUser ? content.trim() : content;

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none dark:prose-invert",
        "prose-pre:p-0 prose-code:before:content-none prose-code:after:content-none",
        // Clean prose styling
        "prose-headings:font-semibold",
        "prose-p:leading-relaxed",
        "prose-li:my-0.5",
        isUser && "prose-p:my-1",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          // Enhanced code block component
          code: ({ children, className, ...props }) => {
            const { inline } = props as any;
            return (
              <CodeBlock
                children={String(children).replace(/\n$/, "")}
                className={className}
                inline={inline}
              />
            );
          },

          // Clean paragraph styling
          p: ({ children }) => (
            <p
              className={cn(
                "my-2 first:mt-0 last:mb-0",
                isStreaming && "animate-pulse"
              )}
            >
              {children}
            </p>
          ),

          // Enhanced link component
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline decoration-blue-600/30 hover:decoration-blue-600/60 transition-colors"
              {...props}
            >
              {children}
              <ExternalLink className="h-3 w-3 opacity-50" />
            </a>
          ),

          // Table with explicit theme colors
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4 rounded-md border border-gray-300 dark:border-gray-600">
              <table
                className="min-w-full border-collapse bg-white dark:bg-gray-900"
                {...props}
              >
                {children}
              </table>
            </div>
          ),

          th: ({ children, ...props }) => (
            <th
              className="border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-left font-semibold text-sm text-gray-900 dark:text-gray-100"
              {...props}
            >
              {children}
            </th>
          ),

          td: ({ children, ...props }) => (
            <td
              className="border-b border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-gray-100"
              {...props}
            >
              {children}
            </td>
          ),

          // Blockquote with explicit colors
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="relative border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic text-gray-600 dark:text-gray-400"
              {...props}
            >
              <Quote className="absolute -left-1 top-0 h-3 w-3 text-gray-400 dark:text-gray-500" />
              {children}
            </blockquote>
          ),

          // Standard list styling
          ul: ({ children, ...props }) => (
            <ul className="list-disc pl-6 my-2 space-y-0.5" {...props}>
              {children}
            </ul>
          ),

          ol: ({ children, ...props }) => (
            <ol className="list-decimal pl-6 my-2 space-y-0.5" {...props}>
              {children}
            </ol>
          ),

          // Clean heading styling
          h1: ({ children, ...props }) => (
            <h1
              className="text-2xl font-bold mt-6 mb-3 first:mt-0 border-b border-gray-300 dark:border-gray-600 pb-2"
              {...props}
            >
              {children}
            </h1>
          ),

          h2: ({ children, ...props }) => (
            <h2 className="text-xl font-bold mt-5 mb-3 first:mt-0" {...props}>
              {children}
            </h2>
          ),

          h3: ({ children, ...props }) => (
            <h3 className="text-lg font-bold mt-4 mb-2 first:mt-0" {...props}>
              {children}
            </h3>
          ),

          h4: ({ children, ...props }) => (
            <h4
              className="text-base font-semibold mt-3 mb-2 first:mt-0"
              {...props}
            >
              {children}
            </h4>
          ),

          h5: ({ children, ...props }) => (
            <h5
              className="text-sm font-semibold mt-3 mb-1 first:mt-0"
              {...props}
            >
              {children}
            </h5>
          ),

          h6: ({ children, ...props }) => (
            <h6 className="text-sm font-medium mt-2 mb-1 first:mt-0" {...props}>
              {children}
            </h6>
          ),

          // Clean horizontal rule
          hr: ({ ...props }) => (
            <hr
              className="my-6 border-t border-gray-300 dark:border-gray-600"
              {...props}
            />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});

// Legacy exports for backward compatibility
export function EnhancedMessageBubble({
  content,
  role,
  isStreaming = false,
  timestamp,
  model,
  metadata,
  error,
  className,
}: {
  content: string;
  role: "user" | "assistant" | "system";
  isStreaming?: boolean;
  timestamp: string | Date;
  model?: string;
  metadata?: any;
  error?: string;
  className?: string;
}) {
  return (
    <div className={cn("message-bubble", className)}>
      <MessageContent
        content={content}
        isStreaming={isStreaming}
        isUser={role === "user"}
      />
    </div>
  );
}
