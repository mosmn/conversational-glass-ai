"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConversations } from "@/hooks/useConversations";
import { useChat } from "@/hooks/useChat";
import { useModels } from "@/hooks/useModels";
import { useToast } from "@/hooks/use-toast";
import { useUser, SignOutButton } from "@clerk/nextjs";
import {
  usePersonalization,
  useVisualPreferences,
} from "@/hooks/useUserPreferences";
import type {
  Conversation as APIConversation,
  Message as APIMessage,
} from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Plus,
  Send,
  Mic,
  Paperclip,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Code,
  BarChart3,
  GraduationCap,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Share,
  Bookmark,
  MoreHorizontal,
  Filter,
  Pin,
  Folder,
  Star,
  Clock,
  Zap,
  User,
  Sun,
  Moon,
  Download,
  Upload,
  Trash2,
  Edit3,
  Archive,
  LogOut,
  DollarSign,
  Globe,
} from "lucide-react";
import { ModelSelector } from "./ModelSelector";
import { FileAttachment } from "./FileAttachment";
import { MessageContent } from "./MessageContent";
import { MessageAttachments } from "./MessageAttachments";
import { ShareModal } from "./ShareModal";
import { ChatSidebar } from "./ChatSidebar";
import { InlineImageGeneration } from "./InlineImageGeneration";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ConversationalGlassLogo, {
  ConversationalGlassLogoMini,
} from "@/components/ConversationalGlassLogo";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: Date | string;
  model?: string;
  isLoading?: boolean;
  error?: string;
  metadata?: {
    streamingComplete?: boolean;
    processingTime?: number;
    regenerated?: boolean;
    provider?: string;
    error?: boolean;
    attachments?: Array<{
      type: "image" | "pdf" | "text";
      url: string;
      filename: string;
      size: number;
      extractedText?: string;
      thumbnailUrl?: string;
      metadata?: {
        width?: number;
        height?: number;
        pages?: number;
        wordCount?: number;
      };
    }>;
    // Enhanced for image generation integration
    generatedImage?: {
      id: string;
      url: string;
      prompt: string;
      revisedPrompt?: string;
      provider: string;
      model: string;
      generationSettings: {
        size: string;
        quality: string;
        style: string;
      };
      dimensions: {
        width: number;
        height: number;
      };
      metadata: {
        generationTime: number;
        estimatedCost: number;
        format: string;
      };
      createdAt: string;
    };
    imageGenerationDetected?: boolean;
    suggestedImagePrompts?: string[];
  };
}

interface ChatInterfaceProps {
  chatId: string;
}

export function ChatInterface({ chatId }: ChatInterfaceProps) {
  const router = useRouter();
  const { user } = useUser();
  const personalization = usePersonalization();
  const visualPrefs = useVisualPreferences();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState("llama-3.3-70b-versatile");
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showInlineImageGeneration, setShowInlineImageGeneration] =
    useState(true);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Debug logging (reduced noise)
  useEffect(() => {
    console.log("ChatInterface: chatId changed to:", chatId);
  }, [chatId]);

  // API hooks
  const {
    conversations,
    loading: conversationsLoading,
    createConversation,
    refetchConversations,
  } = useConversations();
  const {
    messages,
    conversation,
    loading: messagesLoading,
    error: chatError,
    isStreaming,
    hasMore,
    sendMessage,
    loadMoreMessages,
    lastSyncTime,
    syncMessages,
  } = useChat(chatId);
  const { models, loading: modelsLoading, getModelById } = useModels();

  // Track if we've already refreshed for this title change
  const lastRefreshedTitleRef = useRef<string | null>(null);

  // Show toast notification for chat errors
  useEffect(() => {
    if (chatError) {
      toast({
        variant: "destructive",
        title: "Chat Error",
        description: chatError,
      });
    }
  }, [chatError, toast]);

  // Refresh conversations when conversation title changes (with debouncing and deduplication)
  useEffect(() => {
    if (
      conversation?.title &&
      conversation.title !== "New Chat" &&
      !conversation.title.startsWith("New Chat") &&
      conversation.title !== lastRefreshedTitleRef.current // Only refresh if title actually changed
    ) {
      // Debounce the refresh to prevent excessive API calls
      const timeoutId = setTimeout(() => {
        refetchConversations();
        lastRefreshedTitleRef.current = conversation.title;
      }, 2000); // Wait 2 seconds before refreshing to batch multiple changes

      return () => clearTimeout(timeoutId);
    }
  }, [conversation?.title]); // Remove refetchConversations from dependencies to prevent infinite loops

  // Create new chat function
  const handleCreateNewChat = async () => {
    const conversation = await createConversation({
      title: "New Chat",
      model: selectedModel,
    });

    if (conversation) {
      router.push(`/chat/${conversation.id}`);
    }
  };

  const quickActions = [
    {
      icon: Sparkles,
      title: "Create",
      description: "Generate content, write, brainstorm",
      color: "emerald",
    },
    {
      icon: Code,
      title: "Code",
      description: "Debug, explain, write code",
      color: "blue",
    },
    {
      icon: BarChart3,
      title: "Analyze",
      description: "Research, analyze data, summarize",
      color: "purple",
    },
    {
      icon: GraduationCap,
      title: "Learn",
      description: "Explain concepts, tutorials",
      color: "amber",
    },
  ];

  const suggestedPrompts = [
    "Help me debug this React component",
    "Explain quantum computing in simple terms",
    "Write a professional email to my client",
    "Create a meal plan for this week",
    "Review my code for best practices",
  ];

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && attachments.length === 0) || !chatId) return;

    const content = inputValue;
    const messageAttachments = attachments.filter(
      (a) => a.status === "uploaded"
    );

    // Debug logging
    console.log("🐛 DEBUG - handleSendMessage:");
    console.log("  📎 Total attachments:", attachments.length);
    console.log(
      "  📎 Attachments:",
      attachments.map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        url: a.url,
        category: a.category,
        extractedText: a.extractedText ? "present" : "none",
        thumbnailUrl: a.thumbnailUrl ? "present" : "none",
      }))
    );
    console.log(
      "  ✅ Filtered uploaded attachments:",
      messageAttachments.length
    );
    console.log(
      "  ✅ Message attachments:",
      messageAttachments.map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        url: a.url,
        category: a.category,
        extractedText: a.extractedText ? "present" : "none",
        thumbnailUrl: a.thumbnailUrl ? "present" : "none",
        metadata: a.metadata,
      }))
    );
    console.log("  🔍 Search enabled:", searchEnabled);

    setInputValue("");
    // Don't clear attachments immediately - let them see in the sent message

    try {
      let searchResults = null;
      let enhancedContent = content;

      // Perform web search if enabled
      if (searchEnabled) {
        setIsSearching(true);

        try {
          console.log("🔍 Performing web search for:", content);

          const searchResponse = await fetch("/api/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: content,
              maxResults: 5,
              searchType: "general",
              language: "en",
            }),
          });

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();

            console.log("🔍 Full search response:", searchData);

            // Extract results from the nested data structure
            searchResults = searchData.success
              ? searchData.data?.results
              : null;

            console.log("🔍 Extracted search results:", searchResults);

            if (searchResults && searchResults.length > 0) {
              // Create enhanced context with search results
              const searchContext = searchResults
                .map(
                  (result: any, index: number) =>
                    `[${index + 1}] ${result.title}\nURL: ${
                      result.url
                    }\nContent: ${result.snippet}\nPublished: ${
                      result.publishedDate || "N/A"
                    }\n`
                )
                .join("\n");

              enhancedContent = `Based on the following web search results, please provide a comprehensive answer to my question.

WEB SEARCH RESULTS:
${searchContext}

USER QUESTION: ${content}

Please synthesize the information from the search results to provide an accurate, up-to-date response. Include relevant citations and sources where appropriate.`;

              toast({
                title: "🔍 Web Search Complete",
                description: `Found ${searchResults.length} relevant results`,
              });
            } else {
              toast({
                title: "🔍 No Search Results",
                description: "No relevant results found for your query",
                variant: "destructive",
              });
            }
          } else {
            console.error("Search API error:", searchResponse.statusText);
            toast({
              title: "🔍 Search Failed",
              description:
                "Unable to perform web search. Continuing without search.",
              variant: "destructive",
            });
          }
        } catch (searchError) {
          console.error("Search error:", searchError);
          toast({
            title: "🔍 Search Error",
            description: "Search failed. Continuing without search.",
            variant: "destructive",
          });
        } finally {
          setIsSearching(false);
        }
      }

      // Send enhanced content to AI, but display original content in user bubble
      await sendMessage(
        enhancedContent,
        selectedModel,
        messageAttachments,
        searchEnabled && searchResults ? content : undefined // Only use different display content if search was used
      );

      // Clear attachments only after successful send
      setAttachments([]);
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsSearching(false);
      // Don't clear attachments on error so user can retry
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle image generation from inline widget
  const handleImageGenerated = (result: any) => {
    console.log("📸 Image generated:", result);

    // Add a success toast
    toast({
      title: "Image Generated",
      description: `Successfully created image using ${result.provider}`,
    });

    // Refresh messages to show the generated image
    if (result.addedToConversation) {
      // The image should already be linked to a message
      // Refresh the conversation to show the updated message
      setTimeout(() => {
        window.location.reload(); // Simple refresh for now
      }, 1000);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        {/* ChatSidebar Component */}
        <ChatSidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          currentChatId={chatId}
          selectedModel={selectedModel}
          onCreateNewChat={handleCreateNewChat}
        />

        {/* Main Content Area - Enhanced */}
        <div className="flex-1 flex flex-col relative">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-transparent to-slate-800/50" />
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

          {/* Header - Enhanced */}
          <div className="relative z-10 flex items-center justify-between p-6 border-b border-slate-700/30 bg-slate-800/20 backdrop-blur-2xl">
            {/* Subtle header glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5 pointer-events-none" />
            <div className="relative flex items-center space-x-4 z-10">
              <div className="flex items-center space-x-3">
                <div className="w-1 h-8 bg-gradient-to-b from-emerald-400 to-blue-500 rounded-full" />
                <h2 className="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  {conversation?.title ||
                    (messages.length > 0
                      ? "🔥 Chat Session"
                      : "✨ New Conversation")}
                </h2>
              </div>
              {(conversation || messages.length > 0) && (
                <Badge
                  variant="outline"
                  className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10 backdrop-blur-sm px-3 py-1 rounded-full font-medium"
                >
                  🤖 {conversation?.model || selectedModel}
                </Badge>
              )}
            </div>

            <div className="relative flex items-center space-x-2 z-10">
              {/* Model Selector */}
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />

              {/* Sync Status Indicator */}
              {lastSyncTime && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
                    >
                      <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse" />
                      Synced
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      Last synced: {new Date(lastSyncTime).toLocaleTimeString()}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowShareModal(true)}
                    disabled={!conversation && messages.length === 0}
                    className="hover:bg-slate-700/50 hover:text-emerald-400 transition-colors"
                  >
                    <Share className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Share conversation</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/settings")}
                    className="hover:bg-slate-700/50 hover:text-blue-400 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings & Customization</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Messages Area - Enhanced */}
          <div className="flex-1 relative overflow-hidden">
            {/* Conversation River Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-800/10 to-transparent" />
            <div className="absolute left-1/2 top-0 w-px h-full bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent transform -translate-x-1/2" />

            <ScrollArea className="h-full px-6 py-8 relative z-10">
              {messagesLoading ? (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="space-y-4">
                      <div className="flex justify-end">
                        <div className="bg-slate-700/30 rounded-lg p-4 max-w-xs animate-pulse">
                          <div className="h-4 bg-slate-600 rounded mb-2"></div>
                          <div className="h-4 bg-slate-600 rounded w-3/4"></div>
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-slate-800/30 rounded-lg p-4 max-w-xs animate-pulse">
                          <div className="h-4 bg-slate-600 rounded mb-2"></div>
                          <div className="h-4 bg-slate-600 rounded w-2/3"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <WelcomeInterface
                  quickActions={quickActions}
                  suggestedPrompts={suggestedPrompts}
                  onPromptSelect={setInputValue}
                />
              ) : (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {/* Load More Messages Button */}
                  {hasMore && (
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        onClick={loadMoreMessages}
                        disabled={messagesLoading}
                        className="bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50"
                      >
                        {messagesLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-transparent mr-2" />
                        ) : (
                          <Clock className="h-4 w-4 mr-2" />
                        )}
                        Load older messages
                      </Button>
                    </div>
                  )}

                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      user={user}
                      conversationId={chatId}
                      onImageGenerated={handleImageGenerated}
                      showInlineImageGeneration={showInlineImageGeneration}
                    />
                  ))}
                  {isStreaming && <TypingIndicator />}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Floating Action Button for Image Gallery */}
          <div className="absolute top-4 right-4 z-10">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-slate-800/90 backdrop-blur-sm border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-700/90"
                  onClick={() => {
                    // TODO: Show conversation artifacts modal
                    toast({
                      title: "Coming Soon",
                      description: "Conversation artifacts view will open here",
                    });
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Artifacts (
                  {
                    messages.filter((m) => (m.metadata as any)?.generatedImage)
                      .length
                  }
                  )
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View conversation artifacts and generated images</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Input Area - Enhanced */}
          <div className="relative p-6 border-t border-slate-700/30 bg-slate-800/20 backdrop-blur-2xl">
            {/* Input area glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-transparent" />
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
            <div className="max-w-4xl mx-auto space-y-4">
              {/* File Attachments */}
              {showAttachments && (
                <FileAttachment
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
                  conversationId={chatId}
                  selectedModel={selectedModel}
                  onModelRecommendation={(recommendedModels) => {
                    // Note: Removed automatic switching - users must manually click "Switch" button
                    // This prevents unwanted model changes during file uploads
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
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
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
                        onClick={() => setShowAttachments(!showAttachments)}
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
                        onClick={() => setSearchEnabled(!searchEnabled)}
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

                  <Button
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={
                      (!inputValue.trim() && attachments.length === 0) ||
                      isStreaming ||
                      isSearching
                    }
                    className="relative group h-10 w-10 p-0 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500/30 overflow-hidden"
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/30 to-emerald-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

                    {isStreaming || isSearching ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : (
                      <Send className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center space-x-4">
                  <span>{inputValue.length} characters</span>
                  <span>
                    Model:{" "}
                    <span className="text-slate-300">
                      {models.find((m) => m.id === selectedModel)?.name}
                    </span>
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
                      Searching web...
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400">
                    Shift + Enter for new line
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {conversation && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          conversationId={conversation.id}
          conversationTitle={conversation.title}
        />
      )}
    </TooltipProvider>
  );
}

// Supporting Components

function WelcomeInterface({
  quickActions,
  suggestedPrompts,
  onPromptSelect,
}: {
  quickActions: any[];
  suggestedPrompts: string[];
  onPromptSelect: (prompt: string) => void;
}) {
  return (
    <div className="max-w-4xl mx-auto text-center space-y-8">
      <div className="space-y-6">
        <div className="flex justify-center">
          <ConversationalGlassLogo
            size="xl"
            animated={true}
            showText={true}
            className="mb-4"
          />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400 bg-clip-text text-transparent">
          How can I help you today?
        </h1>
        <p className="text-lg text-slate-300">
          Choose an action below or start typing your question
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Card
            key={action.title}
            className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 hover:border-slate-600 transition-all duration-200 cursor-pointer group"
          >
            <CardContent className="p-6 text-center">
              <action.icon
                className={`h-8 w-8 mx-auto mb-3 text-${action.color}-400 group-hover:scale-110 transition-transform`}
              />
              <h3 className="font-semibold mb-2 text-white">{action.title}</h3>
              <p className="text-sm text-slate-300">{action.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Suggested Prompts */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Suggested Prompts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {suggestedPrompts.map((prompt, index) => (
            <Button
              key={index}
              variant="outline"
              className="border-slate-600 hover:border-emerald-500 hover:bg-emerald-600/10 text-left justify-start h-auto p-4 text-slate-200 hover:text-white"
              onClick={() => onPromptSelect(prompt)}
            >
              <div className="text-sm">{prompt}</div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  user,
  conversationId,
  onImageGenerated,
  showInlineImageGeneration = true,
}: {
  message: Message;
  user: any;
  conversationId: string;
  onImageGenerated?: (result: any) => void;
  showInlineImageGeneration?: boolean;
}) {
  const [showImageWidget, setShowImageWidget] = useState(false);
  const isUser = message.role === "user";
  const isStreaming = message.metadata?.streamingComplete === false;
  const hasError = message.metadata?.error || message.error;
  const hasAttachments =
    message.metadata?.attachments && message.metadata.attachments.length > 0;
  const hasGeneratedImage = message.metadata?.generatedImage;

  // Debug logging for attachment display
  if (hasAttachments) {
    console.log("🐛 MessageBubble - Displaying attachments:", {
      messageId: message.id,
      role: message.role,
      attachmentCount: message.metadata?.attachments?.length,
      attachments: message.metadata?.attachments?.map((att) => ({
        type: att.type,
        filename: att.filename,
        size: att.size,
        hasExtractedText: !!att.extractedText,
        hasThumbnail: !!att.thumbnailUrl,
        hasMetadata: !!att.metadata,
      })),
    });
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} group`}>
      <div className={`max-w-[80%] ${isUser ? "order-2" : "order-1"}`}>
        <div
          className={`flex items-start space-x-3 ${
            isUser ? "flex-row-reverse space-x-reverse" : ""
          }`}
        >
          <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-slate-700/50 transition-all duration-300 hover:ring-emerald-500/50">
            {isUser && user?.imageUrl ? (
              <AvatarImage
                src={user.imageUrl}
                alt={
                  user.fullName ||
                  user.emailAddresses?.[0]?.emailAddress ||
                  "User"
                }
                className="object-cover"
              />
            ) : null}
            <AvatarFallback
              className={`${
                hasError
                  ? "bg-red-600"
                  : isUser
                  ? "bg-emerald-600"
                  : "bg-blue-600"
              } transition-colors duration-300`}
            >
              {isUser ? (
                user?.imageUrl ? (
                  <span className="text-xs font-semibold">
                    {user?.firstName?.[0] ||
                      user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ||
                      "U"}
                  </span>
                ) : (
                  <User className="h-4 w-4" />
                )
              ) : (
                <ConversationalGlassLogoMini className="scale-50" />
              )}
            </AvatarFallback>
          </Avatar>

          <div className={`flex-1 ${isUser ? "text-right" : "text-left"}`}>
            <div
              className={`inline-block p-4 rounded-2xl ${
                hasError
                  ? "bg-red-600/20 border border-red-500/30 text-red-400"
                  : isUser
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm text-slate-100"
              }`}
            >
              {hasError ? (
                <div className="flex items-center text-current">
                  <span className="mr-2">⚠️</span>
                  {message.error || "Failed to generate response"}
                </div>
              ) : (
                <>
                  <MessageContent
                    content={message.content}
                    isStreaming={isStreaming}
                    isUser={isUser}
                    showLineNumbers={false}
                    maxCodeBlockHeight="300px"
                    allowHtml={true}
                  />

                  {/* Display generated image within the message bubble */}
                  {hasGeneratedImage && (
                    <div className="border-t border-white/10 pt-3 mt-3">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-blue-400" />
                            <span className="text-sm font-medium">
                              Generated Image
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {message.metadata?.generatedImage?.provider}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="h-3 w-3" />
                            {message.metadata?.generatedImage?.metadata.generationTime.toFixed(
                              1
                            )}
                            s
                            <DollarSign className="h-3 w-3 ml-2" />$
                            {message.metadata?.generatedImage?.metadata.estimatedCost.toFixed(
                              3
                            )}
                          </div>
                        </div>

                        <div className="relative group/image rounded-lg overflow-hidden">
                          <img
                            src={message.metadata?.generatedImage?.url || ""}
                            alt={
                              message.metadata?.generatedImage?.prompt ||
                              "Generated image"
                            }
                            className="w-full rounded-lg"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs"
                            >
                              <Share className="h-3 w-3 mr-1" />
                              Share
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                          <div>
                            <span className="font-medium">Model:</span>{" "}
                            {message.metadata?.generatedImage?.model}
                          </div>
                          <div>
                            <span className="font-medium">Size:</span>{" "}
                            {
                              message.metadata?.generatedImage
                                ?.generationSettings?.size
                            }
                          </div>
                          <div>
                            <span className="font-medium">Style:</span>{" "}
                            {
                              message.metadata?.generatedImage
                                ?.generationSettings?.style
                            }
                          </div>
                          <div>
                            <span className="font-medium">Quality:</span>{" "}
                            {
                              message.metadata?.generatedImage
                                ?.generationSettings?.quality
                            }
                          </div>
                        </div>

                        {message.metadata?.generatedImage?.revisedPrompt &&
                          message.metadata.generatedImage.revisedPrompt !==
                            message.metadata.generatedImage.prompt && (
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-slate-300">
                                AI Revised Prompt:
                              </div>
                              <div className="text-xs text-slate-400 italic">
                                "{message.metadata.generatedImage.revisedPrompt}
                                "
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Display attachments within the message bubble */}
                  {hasAttachments && (
                    <MessageAttachments
                      attachments={message.metadata!.attachments!}
                      isUser={isUser}
                      className={
                        message.content.trim() || hasGeneratedImage
                          ? "border-t border-white/10 pt-3 mt-3"
                          : ""
                      }
                    />
                  )}
                </>
              )}
            </div>

            <div
              className={`flex items-center justify-between mt-2 text-xs text-slate-400 ${
                isUser ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>{new Date(message.timestamp).toLocaleTimeString()}</span>

                {/* Delivery Status */}
                {message.id.startsWith("temp-") ? (
                  <span className="text-amber-400" title="Sending...">
                    ⏳
                  </span>
                ) : (
                  <span className="text-emerald-400" title="Delivered">
                    ✓
                  </span>
                )}

                {/* Attachment indicator */}
                {hasAttachments && (
                  <span
                    className="text-blue-400"
                    title={`${
                      message.metadata!.attachments!.length
                    } attachment(s)`}
                  >
                    📎 {message.metadata!.attachments!.length}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {message.metadata?.processingTime && (
                  <span
                    title={`Processing time: ${message.metadata.processingTime}s`}
                  >
                    ⚡ {message.metadata.processingTime.toFixed(1)}s
                  </span>
                )}

                {message.model && <span>• {message.model}</span>}
              </div>

              {!isUser && !hasError && (
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <ThumbsDown className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Share className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Inline Image Generation Widget */}
            {isUser &&
              showInlineImageGeneration &&
              !isStreaming &&
              !hasError &&
              !hasGeneratedImage && (
                <div className="mt-3">
                  <InlineImageGeneration
                    prompt={message.content}
                    conversationId={conversationId}
                    messageId={message.id}
                    onImageGenerated={onImageGenerated}
                    autoDetect={true}
                    className="max-w-md"
                  />
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-start space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-blue-600">
            <ConversationalGlassLogoMini className="scale-50" />
          </AvatarFallback>
        </Avatar>
        <div className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm rounded-2xl p-4">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
            <div
              className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
