import React, { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Paperclip,
  Globe,
  Mic,
  Send,
  Square,
  StopCircle,
  Search,
} from "lucide-react";
import { FileAttachment } from "./FileAttachment";
import { SearchResultsPreview } from "./SearchResultsPreview";
import { SearchControls } from "./SearchControls";
import { EnhancedSearchInput } from "./EnhancedSearchInput";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useEnhancedSearch } from "@/hooks/useEnhancedSearch";
import { useToast } from "@/hooks/use-toast";

interface ChatInputProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
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
  onSendMessageWithSearch?: (content: string, searchResults: any[]) => void;
}

export function ChatInput({
  inputValue,
  onInputChange,
  onSendMessage,
  onKeyDown,
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
  onSendMessageWithSearch,
}: ChatInputProps) {
  const { toast } = useToast();
  const [textareaHeight, setTextareaHeight] = useState("auto");
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [manualSearchQuery, setManualSearchQuery] = useState("");
  const buttonContainerRef = useRef<HTMLDivElement>(null);

  // Enhanced search functionality
  const {
    performSearch,
    currentResults,
    showResultsPreview,
    settings,
    updateSettings,
    searchHistory,
    suggestions,
    availableProviders,
    useSelectedResults,
    useAllResults,
    cancelSearch,
    refineSearch,
    isSearching: isEnhancedSearching,
  } = useEnhancedSearch({
    onSearchComplete: (results, query) => {
      if (onSendMessageWithSearch) {
        onSendMessageWithSearch(query, results);
      }
      setShowManualSearch(false);
      setManualSearchQuery("");
    },
  });

  // Auto-resize textarea functionality
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;

      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = "auto";

      // Calculate new height based on content
      const newHeight = Math.min(
        Math.max(textarea.scrollHeight, 50), // minimum 50px
        200 // maximum 200px
      );

      textarea.style.height = `${newHeight}px`;
      setTextareaHeight(`${newHeight}px`);
    }
  }, [inputValue, textareaRef]);

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
  const isProcessing =
    isStreaming || isSearching || isTranscribing || isEnhancedSearching;

  // Calculate dynamic padding based on number of visible buttons
  const getButtonCount = () => {
    let count = 4; // attachments, search, manual search, send/stop
    if (isVoiceSupported) count += 1; // voice button
    return count;
  };

  const buttonCount = getButtonCount();
  const dynamicPaddingRight = `${buttonCount * 40 + 16}px`; // 40px per button + 16px margin

  // Accumulated manual search context results
  const [contextResults, setContextResults] = useState<any[]>([]);

  const addResultsToContext = (results: any[]) => {
    setContextResults((prev) => [...prev, ...results]);
    cancelSearch();
  };

  const handleSend = () => {
    if (contextResults.length > 0 && onSendMessageWithSearch) {
      onSendMessageWithSearch(inputValue, contextResults);
      setContextResults([]);
    } else {
      onSendMessage();
    }
  };

  return (
    <div className="relative p-3 sm:p-3 lg:p-6 pb-safe-bottom border-t border-slate-700/30 bg-slate-800/20 backdrop-blur-2xl">
      {/* Input area glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent" />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      <div className="max-w-4xl mx-auto space-y-2 sm:space-y-3 lg:space-y-4">
        {/* Enhanced Manual Search */}
        {showManualSearch && (
          <div className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-400" />
                Manual Web Search
              </h3>
              <div className="flex items-center gap-2">
                <SearchControls
                  settings={settings}
                  onSettingsChange={updateSettings}
                  availableProviders={availableProviders}
                  className="text-xs"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualSearch(false)}
                  className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                >
                  ×
                </Button>
              </div>
            </div>

            <EnhancedSearchInput
              value={manualSearchQuery}
              onChange={setManualSearchQuery}
              onSearch={performSearch}
              onClear={() => setManualSearchQuery("")}
              suggestions={suggestions}
              recentSearches={searchHistory}
              isLoading={isEnhancedSearching}
              placeholder="Search the web for information..."
              className="w-full"
            />
          </div>
        )}

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

          {/* Textarea with dynamic height and padding */}
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type your message... (Enter ⏎ to send, Shift+Enter for newline)"
            className="relative resize-none overflow-y-auto hide-scrollbar bg-slate-700/30 border-slate-600/50 text-white placeholder-slate-500 focus:text-white rounded-xl sm:rounded-2xl backdrop-blur-sm focus:border-emerald-500/50 focus:bg-slate-700/50 transition-all duration-300 focus:shadow-lg focus:shadow-emerald-500/10 text-sm sm:text-base leading-relaxed p-3 sm:p-4 lg:p-5"
            style={{
              height: textareaHeight,
              paddingRight: dynamicPaddingRight,
              minHeight: "50px",
              maxHeight: "200px",
            }}
            rows={1}
          />

          {/* Button container positioned to avoid text overlap */}
          <div
            ref={buttonContainerRef}
            className="absolute bottom-3 sm:bottom-4 lg:bottom-5 right-3 sm:right-4 lg:right-5 flex items-end gap-1 sm:gap-2"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-lg transition-all duration-300 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600/70 touch-manipulation shrink-0 ${
                    showAttachments
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                      : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                  }`}
                  onClick={onToggleAttachments}
                >
                  <Paperclip className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
                  className={`h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-lg transition-all duration-300 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600/70 touch-manipulation shrink-0 ${
                    searchEnabled
                      ? "text-blue-400 bg-blue-500/10 border-blue-500/30"
                      : "text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                  }`}
                  onClick={onToggleSearch}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-2 border-blue-400 border-t-transparent" />
                  ) : (
                    <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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

            {/* <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-lg transition-all duration-300 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600/70 touch-manipulation shrink-0 ${
                    showManualSearch
                      ? "text-purple-400 bg-purple-500/10 border-purple-500/30"
                      : "text-slate-400 hover:text-purple-400 hover:bg-purple-500/10"
                  }`}
                  onClick={() => setShowManualSearch(!showManualSearch)}
                  disabled={isEnhancedSearching}
                >
                  <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {showManualSearch
                    ? "🔍 Manual search panel open - search before sending message"
                    : "🔍 Open manual search - search the web independently"}
                </p>
              </TooltipContent>
            </Tooltip> */}

            {isVoiceSupported && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-lg transition-all duration-200 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600/70 touch-manipulation shrink-0 ${
                      isRecording
                        ? "text-red-400 bg-red-500/10 border-red-500/30"
                        : isTranscribing
                        ? "text-blue-400 bg-blue-500/10 border-blue-500/30"
                        : "text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                    }`}
                    style={
                      isRecording
                        ? {
                            transform: `scale(${1 + volume * 0.2})`,
                            boxShadow: `0 0 ${Math.max(5, volume * 15)}px ${
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
                    disabled={isProcessing && !isRecording}
                  >
                    {isRecording ? (
                      <StopCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    ) : isTranscribing ? (
                      <div className="animate-spin rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-2 border-blue-400 border-t-transparent" />
                    ) : (
                      <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isRecording
                      ? `🔴 Recording... ${formattedDuration} (click to stop)`
                      : isTranscribing
                      ? "🤖 Converting speech to text..."
                      : "🎤 Click to start voice input"}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Send/Stop button */}
            {isProcessing ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={onPauseStream}
                    className="relative group h-8 w-8 sm:h-9 sm:w-9 p-0 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 rounded-lg shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-300 border border-red-500/30 overflow-hidden touch-manipulation shrink-0"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-400/0 via-red-400/30 to-red-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    <Square className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current transition-transform duration-300 group-hover:scale-110" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isStreaming ? "Stop AI response" : "Stop search"}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!canSend}
                className="relative group h-8 w-8 sm:h-9 sm:w-9 p-0 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500/30 overflow-hidden touch-manipulation shrink-0"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/30 to-emerald-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Enhanced status bar with better responsive design */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <span className="whitespace-nowrap">
              {inputValue.length} characters
            </span>
            <span className="whitespace-nowrap">
              Model: <span className="text-slate-300">{modelName}</span>
            </span>
            {attachments.length > 0 && (
              <span className="text-emerald-400 whitespace-nowrap">
                {attachments.length} file(s) attached
              </span>
            )}
            {searchEnabled && (
              <span className="text-blue-400 flex items-center gap-1 whitespace-nowrap">
                <Globe className="h-3 w-3" />
                Web search enabled
              </span>
            )}
            {isSearching && (
              <span className="text-blue-400 flex items-center gap-1 whitespace-nowrap">
                <div className="animate-spin rounded-full h-3 w-3 border border-blue-400 border-t-transparent" />
                Searching web...
              </span>
            )}
            {isRecording && (
              <span className="text-red-400 flex items-center gap-1 whitespace-nowrap">
                <div className="animate-pulse w-2 h-2 bg-red-400 rounded-full" />
                Recording... {formattedDuration}
              </span>
            )}
            {isTranscribing && (
              <span className="text-blue-400 flex items-center gap-1 whitespace-nowrap">
                <div className="animate-spin rounded-full h-3 w-3 border border-blue-400 border-t-transparent" />
                Transcribing...
              </span>
            )}
            {isStreaming && (
              <span className="text-emerald-400 flex items-center gap-1 whitespace-nowrap">
                <div className="animate-pulse w-2 h-2 bg-emerald-400 rounded-full" />
                AI responding...
              </span>
            )}
          </div>
          <div className="flex items-center text-slate-500">
            <span className="whitespace-nowrap">
              Shift + Enter for new line
            </span>
          </div>
        </div>
      </div>

      {/* Search Results Preview Modal */}
      {showResultsPreview && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm overflow-y-auto flex justify-center items-start pt-10 pb-10 px-4">
          <SearchResultsPreview
            results={currentResults}
            query={manualSearchQuery}
            provider={currentResults[0]?.metadata?.provider || "unknown"}
            processingTime={0}
            totalResults={currentResults.length}
            suggestions={suggestions.map((s) => s.query)}
            onSelectResults={useSelectedResults}
            onAddContext={addResultsToContext}
            onRefineSearch={refineSearch}
            onCancel={cancelSearch}
          />
        </div>
      )}
    </div>
  );
}
