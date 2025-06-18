"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Check,
  Download,
  ChevronDown,
  ChevronUp,
  Code2,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  highlightedHtml?: string;
  lineCount?: number;
  className?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
  error?: string;
}

export function CodeBlock({
  code,
  language = "text",
  filename,
  highlightedHtml,
  lineCount = 0,
  className,
  showLineNumbers = false,
  maxHeight = "400px",
  error,
}: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Check if content is overflowing
  useEffect(() => {
    const checkOverflow = () => {
      if (codeRef.current) {
        const element = codeRef.current;
        setIsOverflowing(element.scrollHeight > element.clientHeight);
      }
    };

    checkOverflow();

    // Check again after a short delay to account for dynamic content
    const timeoutId = setTimeout(checkOverflow, 100);

    return () => clearTimeout(timeoutId);
  }, [highlightedHtml, code]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);

      toast({
        title: "Code copied!",
        description: "The code has been copied to your clipboard.",
        duration: 2000,
      });

      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
      toast({
        title: "Copy failed",
        description: "Failed to copy code to clipboard.",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [code, toast]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `code.${getFileExtension(language)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Download started",
      description: `Downloading ${a.download}`,
      duration: 2000,
    });
  }, [code, filename, language, toast]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed]);

  const getFileExtension = (lang: string): string => {
    const extensions: Record<string, string> = {
      javascript: "js",
      typescript: "ts",
      python: "py",
      java: "java",
      go: "go",
      rust: "rs",
      cpp: "cpp",
      c: "c",
      csharp: "cs",
      php: "php",
      ruby: "rb",
      swift: "swift",
      kotlin: "kt",
      dart: "dart",
      html: "html",
      css: "css",
      scss: "scss",
      json: "json",
      yaml: "yml",
      xml: "xml",
      sql: "sql",
      bash: "sh",
      shell: "sh",
      markdown: "md",
    };
    return extensions[lang] || "txt";
  };

  const displayLanguage = language === "text" ? "plain text" : language;

  return (
    <div
      className={cn(
        "relative group",
        "bg-slate-800/30 backdrop-blur-xl",
        "border border-slate-700/50",
        "rounded-xl overflow-hidden",
        "shadow-lg shadow-black/20",
        "transition-all duration-200",
        "hover:border-slate-600/60 hover:shadow-xl hover:shadow-black/30",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/30 bg-slate-800/20">
        <div className="flex items-center space-x-3">
          {filename ? (
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-200 font-mono">
                {filename}
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Code2 className="h-4 w-4 text-slate-400" />
              <Badge
                variant="outline"
                className="border-slate-600 text-slate-300 bg-slate-700/30 font-mono text-xs"
              >
                {displayLanguage}
              </Badge>
            </div>
          )}

          {lineCount > 0 && (
            <span className="text-xs text-slate-500">
              {lineCount} line{lineCount !== 1 ? "s" : ""}
            </span>
          )}

          {error && (
            <Badge variant="destructive" className="text-xs">
              Highlighting failed
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {/* Collapse button for long code blocks */}
          {lineCount > 15 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
            >
              {isCollapsed ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronUp className="h-3 w-3" />
              )}
            </Button>
          )}

          {/* Download button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
          >
            <Download className="h-3 w-3" />
          </Button>

          {/* Copy button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 w-7 p-0 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
          >
            {isCopied ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Code Content */}
      <div
        ref={codeRef}
        className={cn(
          "relative overflow-auto",
          "bg-slate-900/20",
          isCollapsed && "max-h-20",
          !isCollapsed && maxHeight && `max-h-[${maxHeight}]`
        )}
        style={{
          maxHeight: isCollapsed ? "80px" : maxHeight,
        }}
      >
        {highlightedHtml ? (
          <div
            className="shiki-wrapper"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <pre
            className={cn(
              "p-4 text-sm",
              "text-slate-200 font-mono",
              "whitespace-pre-wrap break-words",
              "leading-relaxed"
            )}
          >
            <code className={`language-${language}`}>{code}</code>
          </pre>
        )}

        {/* Fade effect for collapsed content */}
        {isCollapsed && (
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />
        )}

        {/* Scroll indicator */}
        {isOverflowing && !isCollapsed && (
          <div className="absolute bottom-2 right-2 opacity-60">
            <div className="flex items-center space-x-1 text-xs text-slate-400 bg-slate-800/80 px-2 py-1 rounded">
              <ChevronDown className="h-3 w-3" />
              <span>Scroll</span>
            </div>
          </div>
        )}
      </div>

      {/* Expand prompt for collapsed blocks */}
      {isCollapsed && (
        <div
          className="px-4 py-2 text-center cursor-pointer bg-slate-800/10 hover:bg-slate-800/20 transition-colors"
          onClick={toggleCollapse}
        >
          <span className="text-xs text-slate-400 hover:text-slate-300">
            Click to expand {lineCount - 3} more lines
          </span>
        </div>
      )}
    </div>
  );
}

// Inline code component
interface InlineCodeProps {
  children: React.ReactNode;
  language?: string;
  highlightedHtml?: string;
  className?: string;
}

export function InlineCode({
  children,
  language,
  highlightedHtml,
  className,
}: InlineCodeProps) {
  return (
    <code
      className={cn(
        "inline",
        "px-1.5 py-0.5",
        "text-sm font-mono",
        "bg-slate-700/40 text-slate-200",
        "border border-slate-600/40",
        "rounded-md",
        "backdrop-blur-sm",
        "whitespace-nowrap",
        "m-0",
        className
      )}
    >
      {highlightedHtml ? (
        <span dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
      ) : (
        children
      )}
    </code>
  );
}
