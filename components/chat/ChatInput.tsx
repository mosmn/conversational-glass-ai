import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Paperclip, Globe, Mic, Send, Square, StopCircle } from "lucide-react";
import { FileAttachment } from "./FileAttachment";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  // Voice input functionality
  const {
    isRecording,
    isTranscribing,
    formattedDuration,
    isSupported: isVoiceSupported,
    toggleRecording,
    error: voiceError,
    volume,
  } = useVoiceInput({
    onTranscription: (text: string) => {
      // Append transcribed text to existing input
      const newValue = inputValue ? `${inputValue} ${text}` : text;
      onInputChange(newValue);

      // Focus the textarea after transcription
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Move cursor to end
        const length = newValue.length;
        textareaRef.current.setSelectionRange(length, length);
      }

      toast({
        title: "Voice transcribed",
        description: "Your speech has been converted to text successfully.",
      });
    },
    onError: (error: string) => {
      toast({
        title: "Voice input failed",
        description: error,
        variant: "destructive",
      });
    },
    language: "en",
  });

  const canSend = inputValue.trim() || attachments.length > 0;
  const isProcessing = isStreaming || isSearching || isTranscribing;

  return (
    <div className="relative p-2 sm:p-3 lg:p-6 border-t border-slate-700/30 bg-slate-800/20 backdrop-blur-2xl">
      {/* Input area glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      <div className="max-w-4xl mx-auto space-y-2 sm:space-y-3 lg:space-y-4">
        {/* File Attachments */}
        {showAttachments && (
          <FileAttachment
            attachments={attachments}
            onAttachmentsChange={onAttachmentsChange}
            conversationId={conversationId}
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
            placeholder="Type your message... (⌘ + Enter to send)"
            className="relative min-h-[50px] sm:min-h-[70px] max-h-[150px] sm:max-h-[200px] bg-slate-700/30 border-slate-600/50 text-white placeholder-slate-500 pr-20 sm:pr-28 resize-none focus:text-white rounded-xl sm:rounded-2xl backdrop-blur-sm focus:border-emerald-500/50 focus:bg-slate-700/50 transition-all duration-300 focus:shadow-lg focus:shadow-emerald-500/10 text-sm sm:text-base leading-relaxed p-3 sm:p-5"
            rows={1}
          />

          <div className="absolute bottom-2 sm:bottom-3 lg:bottom-4 right-2 sm:right-3 lg:right-4 flex items-center gap-1 sm:gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-lg sm:rounded-xl transition-all duration-300 backdrop-blur-sm border border-slate-700/30 hover:border-slate-600/50 touch-manipulation ${
                    showAttachments
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                      : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                  }`}
                  onClick={onToggleAttachments}
                >
                  <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
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
                  className={`h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-lg sm:rounded-xl transition-all duration-300 backdrop-blur-sm border border-slate-700/30 hover:border-slate-600/50 touch-manipulation ${
                    searchEnabled
                      ? "text-blue-400 bg-blue-500/10 border-blue-500/30"
                      : "text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                  }`}
                  onClick={onToggleSearch}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-blue-400 border-t-transparent" />
                  ) : (
                    <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
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
                  className={`h-9 w-9 sm:h-10 sm:w-10 p-0 rounded-lg sm:rounded-xl transition-all duration-200 backdrop-blur-sm border border-slate-700/30 hover:border-slate-600/50 touch-manipulation ${
                    isRecording
                      ? "text-red-400 bg-red-500/10 border-red-500/30"
                      : isTranscribing
                      ? "text-blue-400 bg-blue-500/10 border-blue-500/30"
                      : isVoiceSupported
                      ? "text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                      : "text-slate-600 cursor-not-allowed opacity-50"
                  }`}
                  style={
                    isRecording
                      ? {
                          transform: `scale(${1 + volume * 0.3})`,
                          boxShadow: `0 0 ${Math.max(5, volume * 20)}px ${
                            volume > 0.7
                              ? "#ef444450"
                              : volume > 0.4
                              ? "#f59e0b50"
                              : "#ef444430"
                          }`,
                        }
                      : {}
                  }
                  onClick={toggleRecording}
                  disabled={!isVoiceSupported || isProcessing}
                >
                  {isRecording ? (
                    <StopCircle className="h-5 w-5" />
                  ) : isTranscribing ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {!isVoiceSupported
                    ? "🚫 Voice input not supported in this browser"
                    : isRecording
                    ? `🔴 Recording... ${formattedDuration} (click to stop)`
                    : isTranscribing
                    ? "🤖 Converting speech to text..."
                    : "🎤 Click to start voice input"}
                </p>
              </TooltipContent>
            </Tooltip>

            {isProcessing ? (
              // Pause/Stop button when streaming
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={onPauseStream}
                    className="relative group h-9 w-9 sm:h-10 sm:w-10 p-0 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 rounded-lg sm:rounded-xl shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-300 border border-red-500/30 overflow-hidden touch-manipulation"
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
                className="relative group h-9 w-9 sm:h-10 sm:w-10 p-0 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg sm:rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500/30 overflow-hidden touch-manipulation"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/30 to-emerald-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <Send className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="hidden sm:flex items-center justify-between text-xs text-slate-400">
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
            {isRecording && (
              <span className="text-red-400 flex items-center gap-1">
                <div className="animate-pulse w-2 h-2 bg-red-400 rounded-full" />
                Recording... {formattedDuration}
              </span>
            )}
            {isTranscribing && (
              <span className="text-blue-400 flex items-center gap-1">
                <div className="animate-spin rounded-full h-3 w-3 border border-blue-400 border-t-transparent" />
                Transcribing...
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
