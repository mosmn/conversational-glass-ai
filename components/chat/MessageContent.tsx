"use client";

import React, { memo } from "react";
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
import { Copy, Check } from "lucide-react";
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

function CodeBlock({ children, className, inline }: CodeBlockProps) {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  // Extract language from className (format: "language-javascript")
  const language = className?.replace("language-", "") || "text";

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

  // Inline code
  if (inline) {
    return (
      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
        {children}
      </code>
    );
  }

  // Block code with syntax highlighting
  return (
    <div className="relative group my-4">
      <div className="flex items-center justify-between bg-muted px-4 py-2 rounded-t-lg border-b">
        <span className="text-sm font-medium text-muted-foreground">
          {language === "text" ? "Code" : language}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="h-6 w-6 p-0"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={theme === "dark" ? oneDark : oneLight}
          showLineNumbers={true}
          wrapLines={true}
          customStyle={{
            margin: 0,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomLeftRadius: "0.5rem",
            borderBottomRightRadius: "0.5rem",
          }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
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
        isUser && "prose-p:my-1",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          // Custom code block component with syntax highlighting
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

          // Custom paragraph component to handle streaming
          p: ({ children }) => (
            <p className={cn(isStreaming && "animate-pulse")}>{children}</p>
          ),

          // Custom link component with better styling
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline decoration-blue-600/30 hover:decoration-blue-600/60 transition-colors"
              {...props}
            >
              {children}
            </a>
          ),

          // Custom table styling
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table
                className="min-w-full border-collapse border border-gray-200 dark:border-gray-700"
                {...props}
              >
                {children}
              </table>
            </div>
          ),

          th: ({ children, ...props }) => (
            <th
              className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-left font-semibold"
              {...props}
            >
              {children}
            </th>
          ),

          td: ({ children, ...props }) => (
            <td
              className="border border-gray-200 dark:border-gray-700 px-4 py-2"
              {...props}
            >
              {children}
            </td>
          ),

          // Custom blockquote styling
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400 my-4"
              {...props}
            >
              {children}
            </blockquote>
          ),

          // Custom list styling
          ul: ({ children, ...props }) => (
            <ul className="list-disc pl-6 my-2 space-y-1" {...props}>
              {children}
            </ul>
          ),

          ol: ({ children, ...props }) => (
            <ol className="list-decimal pl-6 my-2 space-y-1" {...props}>
              {children}
            </ol>
          ),

          // Custom heading styling
          h1: ({ children, ...props }) => (
            <h1 className="text-2xl font-bold mt-6 mb-3 first:mt-0" {...props}>
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
