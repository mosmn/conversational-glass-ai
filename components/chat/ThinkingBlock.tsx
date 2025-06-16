"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Brain, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/ui/markdown-content";

interface ThinkingBlockProps {
  content: string;
  defaultVisible?: boolean;
  className?: string;
}

export function ThinkingBlock({
  content,
  defaultVisible = false,
  className,
}: ThinkingBlockProps) {
  const [isVisible, setIsVisible] = useState(defaultVisible);

  if (!content?.trim()) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(!isVisible)}
        className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 h-auto p-2 -mb-1"
      >
        <Brain className="h-3 w-3" />
        <span>AI Thinking Process</span>
        {isVisible ? (
          <>
            <EyeOff className="h-3 w-3" />
            <ChevronUp className="h-3 w-3" />
          </>
        ) : (
          <>
            <Eye className="h-3 w-3" />
            <ChevronDown className="h-3 w-3" />
          </>
        )}
      </Button>

      {/* Thinking Content */}
      {isVisible && (
        <div
          className={cn(
            "relative border border-slate-600/30 rounded-lg overflow-hidden",
            "bg-gradient-to-br from-slate-800/20 to-slate-900/30",
            "backdrop-blur-sm"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/20 border-b border-slate-600/20">
            <Brain className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-medium text-slate-300">
              Thinking Process
            </span>
            <div className="ml-auto flex items-center gap-1">
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" />
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-75" />
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse delay-150" />
            </div>
          </div>

          {/* Content */}
          <div className="p-3">
            <div
              className={cn(
                "prose prose-slate prose-sm max-w-none",
                "prose-p:text-slate-300 prose-p:leading-relaxed",
                "prose-code:text-blue-300 prose-code:bg-slate-800/50",
                "prose-pre:bg-slate-900/50 prose-pre:border prose-pre:border-slate-600/30",
                "prose-strong:text-slate-200",
                "prose-em:text-slate-300",
                "prose-headings:text-slate-200",
                "prose-blockquote:text-slate-400 prose-blockquote:border-slate-600/50"
              )}
            >
              <MarkdownContent
                content={content}
                allowHtml={false}
                className="text-slate-300"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
