import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Paperclip, Globe, Mic, Send, Square } from "lucide-react";
import { FileAttachment } from "./FileAttachment";

interface ChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  attachments: any[];
  onAttachmentsChange: (attachments: any[]) => void;
  showAttachments: boolean;
  onToggleAttachments: () => void;
  searchEnabled: boolean;
  onToggleSearch: () => void;
  isSearching: boolean;
  isStreaming: boolean;
  onPauseStream: () => void;
  conversationId: string;
  selectedModel: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  modelName?: string;
}

export function ChatInput({
  inputValue,
  onInputChange,
  onSendMessage,
  onKeyPress,
  attachments,
  onAttachmentsChange,
  showAttachments,
  onToggleAttachments,
  searchEnabled,
  onToggleSearch,
  isSearching,
  isStreaming,
  onPauseStream,
  conversationId,
  selectedModel,
  textareaRef,
  modelName,
}: ChatInputProps) {
  const canSend = inputValue.trim() || attachments.length > 0;
  const isProcessing = isStreaming || isSearching;

  return (
    <div className="relative p-6 border-t border-slate-700/30 bg-slate-800/20 backdrop-blur-2xl">
      {/* Input area glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      <div className="max-w-4xl mx-auto space-y-4">
        {/* File Attachments */}
        {showAttachments && (
          <FileAttachment
            attachments={attachments}
            onAttachmentsChange={onAttachmentsChange}
            conversationId={conversationId}
            selectedModel={selectedModel}
            onModelRecommendation={(recommendedModels) => {
              console.log(
                "Model recommendations available:",
                recommendedModels.map((m) => m.name)
              );
            }}
          />
        )}

        <div className="relative group">
          {/* Enhanced glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-blue-500/10 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />

          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="💬 Type your message... (⌘ + Enter to send)"
            className="relative min-h-[70px] max-h-[200px] bg-slate-700/30 border-slate-600/50 text-white placeholder-slate-500 pr-28 resize-none focus:text-white rounded-2xl backdrop-blur-sm focus:border-emerald-500/50 focus:bg-slate-700/50 transition-all duration-300 focus:shadow-lg focus:shadow-emerald-500/10 text-base leading-relaxed p-5"
            rows={1}
          />

          <div className="absolute bottom-4 right-4 flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`h-10 w-10 p-0 rounded-xl transition-all duration-300 backdrop-blur-sm border border-slate-700/30 hover:border-slate-600/50 ${
                    showAttachments
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                      : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                  }`}
                  onClick={onToggleAttachments}
                >
                  <Paperclip className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>📎 Attach files</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`h-10 w-10 p-0 rounded-xl transition-all duration-300 backdrop-blur-sm border border-slate-700/30 hover:border-slate-600/50 ${
                    searchEnabled
                      ? "text-blue-400 bg-blue-500/10 border-blue-500/30"
                      : "text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                  }`}
                  onClick={onToggleSearch}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent" />
                  ) : (
                    <Globe className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {searchEnabled
                    ? "🔍 Web search enabled - will search before responding"
                    : "🌐 Enable web search for real-time information"}
                </p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-10 w-10 p-0 rounded-xl transition-all duration-300 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 backdrop-blur-sm border border-slate-700/30 hover:border-blue-500/30"
                >
                  <Mic className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>🎤 Voice input</p>
              </TooltipContent>
            </Tooltip>

            {isProcessing ? (
              // Pause/Stop button when streaming
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={onPauseStream}
                    className="relative group h-10 w-10 p-0 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-300 border border-red-500/30 overflow-hidden"
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-red-400/0 via-red-400/30 to-red-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <Square className="h-4 w-4 fill-current transition-transform duration-300 group-hover:scale-110" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isStreaming ? "Stop AI response" : "Stop search"}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              // Regular send button
              <Button
                size="sm"
                onClick={onSendMessage}
                disabled={!canSend}
                className="relative group h-10 w-10 p-0 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500/30 overflow-hidden"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/30 to-emerald-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <Send className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-4">
            <span>{inputValue.length} characters</span>
            <span>
              Model: <span className="text-slate-300">{modelName}</span>
            </span>
            {attachments.length > 0 && (
              <span className="text-emerald-400">
                {attachments.length} file(s) attached
              </span>
            )}
            {searchEnabled && (
              <span className="text-blue-400 flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Web search enabled
              </span>
            )}
            {isSearching && (
              <span className="text-blue-400 flex items-center gap-1">
                <div className="animate-spin rounded-full h-3 w-3 border border-blue-400 border-t-transparent" />
                Searching web... (click stop to cancel)
              </span>
            )}
            {isStreaming && (
              <span className="text-emerald-400 flex items-center gap-1">
                <div className="animate-pulse w-2 h-2 bg-emerald-400 rounded-full" />
                AI responding... (click stop to pause)
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Shift + Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}
