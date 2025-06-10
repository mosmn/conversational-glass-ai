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
} from "lucide-react";
import { ModelSelector } from "./ModelSelector";
import { FileAttachment } from "./FileAttachment";
import { MessageContent } from "./MessageContent";
import { MessageAttachments } from "./MessageAttachments";
import { ShareModal } from "./ShareModal";
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
  };
}

interface Chat {
  id: string;
  title: string;
  preview?: string;
  timestamp: Date;
  model: string;
  isPinned?: boolean;
  isBookmarked?: boolean;
  category?: string;
}

interface ChatInterfaceProps {
  chatId: string;
}

interface ChatPreferences {
  pinnedChats: string[];
  bookmarkedChats: string[];
  chatCategories: Record<string, string>;
  theme: string;
  notifications: boolean;
  autoSave: boolean;
}

export function ChatInterface({ chatId }: ChatInterfaceProps) {
  const router = useRouter();
  const { user } = useUser();
  const personalization = usePersonalization();
  const visualPrefs = useVisualPreferences();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState("llama-3.3-70b-versatile");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [usage, setUsage] = useState(65); // Usage percentage
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Chat preferences with localStorage - handled client-side only
  const [preferences, setPreferences] = useState<ChatPreferences>({
    pinnedChats: [],
    bookmarkedChats: [],
    chatCategories: {},
    theme: "dark",
    notifications: true,
    autoSave: true,
  });

  // Load preferences from localStorage only on client side
  useEffect(() => {
    const stored = localStorage.getItem("chat:preferences");
    if (stored) {
      try {
        setPreferences(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to parse stored preferences:", error);
      }
    }
  }, []);

  const savePreferences = (newPrefs: ChatPreferences) => {
    setPreferences(newPrefs);
    localStorage.setItem("chat:preferences", JSON.stringify(newPrefs));
  };

  // Pin/bookmark functionality
  const togglePin = (chatId: string) => {
    const newPinnedChats = preferences.pinnedChats.includes(chatId)
      ? preferences.pinnedChats.filter((id) => id !== chatId)
      : [...preferences.pinnedChats, chatId];

    savePreferences({
      ...preferences,
      pinnedChats: newPinnedChats,
    });

    toast({
      title: preferences.pinnedChats.includes(chatId) ? "Unpinned" : "Pinned",
      description: `Chat ${
        preferences.pinnedChats.includes(chatId) ? "removed from" : "added to"
      } pinned conversations`,
    });
  };

  const toggleBookmark = (chatId: string) => {
    const newBookmarkedChats = preferences.bookmarkedChats.includes(chatId)
      ? preferences.bookmarkedChats.filter((id) => id !== chatId)
      : [...preferences.bookmarkedChats, chatId];

    savePreferences({
      ...preferences,
      bookmarkedChats: newBookmarkedChats,
    });

    toast({
      title: preferences.bookmarkedChats.includes(chatId)
        ? "Unbookmarked"
        : "Bookmarked",
      description: `Chat ${
        preferences.bookmarkedChats.includes(chatId)
          ? "removed from"
          : "added to"
      } bookmarks`,
    });
  };

  const deleteChat = async (chatId: string) => {
    try {
      // TODO: Implement delete API call
      toast({
        title: "Chat Deleted",
        description: "The conversation has been deleted",
      });

      // Remove from preferences
      savePreferences({
        ...preferences,
        pinnedChats: preferences.pinnedChats.filter((id) => id !== chatId),
        bookmarkedChats: preferences.bookmarkedChats.filter(
          (id) => id !== chatId
        ),
      });

      // Refresh conversations
      refetchConversations();

      // Navigate away if current chat is deleted
      if (chatId === chatId) {
        router.push("/chat/new");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete conversation",
      });
    }
  };

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

  // Calculate actual usage and update when conversations change
  useEffect(() => {
    const calculateUsage = () => {
      // Mock calculation based on number of conversations
      const baseUsage = Math.min(conversations.length * 2, 80);
      return baseUsage + Math.floor(Math.random() * 20);
    };

    const newUsage = calculateUsage();
    setUsage(newUsage);
  }, [conversations.length]);

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

  // Convert API conversations to local format for UI compatibility
  const chats: Chat[] = conversations.map((conv) => ({
    id: conv.id,
    title: conv.title,
    preview: `Last updated ${new Date(conv.updatedAt).toLocaleDateString()}`,
    timestamp: new Date(conv.updatedAt),
    model: conv.model,
    isPinned: preferences.pinnedChats.includes(conv.id),
    isBookmarked: preferences.bookmarkedChats.includes(conv.id),
    category: preferences.chatCategories[conv.id] || "General",
  }));

  // Filter chats based on search and category
  const filteredChats = chats.filter((chat) => {
    const matchesSearch = chat.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || chat.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Separate pinned and recent chats
  const pinnedChats = filteredChats.filter((chat) => chat.isPinned);
  const recentChats = filteredChats.filter((chat) => !chat.isPinned);

  // Available categories
  const categories = ["All", "Work", "Personal", "Creative", "Learning"];

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

    setInputValue("");
    // Don't clear attachments immediately - let them see in the sent message

    try {
      // Send message with attachment data
      await sendMessage(content, selectedModel, messageAttachments);
      // Clear attachments only after successful send
      setAttachments([]);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Don't clear attachments on error so user can retry
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-slate-900 text-white">
        {/* Left Sidebar */}
        <div
          className={`${
            sidebarCollapsed ? "w-16" : "w-80"
          } flex-shrink-0 bg-slate-800/50 backdrop-blur-xl border-r border-slate-700/50 transition-all duration-300`}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                {!sidebarCollapsed ? (
                  <ConversationalGlassLogo
                    size="md"
                    animated={true}
                    showText={true}
                    className="flex-shrink-0"
                  />
                ) : (
                  <ConversationalGlassLogoMini className="flex-shrink-0" />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="text-slate-400 hover:text-white"
                >
                  {sidebarCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {!sidebarCollapsed && (
              <>
                {/* New Chat Button */}
                <div className="p-4">
                  <Button
                    onClick={handleCreateNewChat}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Chat
                  </Button>
                </div>

                {/* Search */}
                <div className="px-4 pb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search chats..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 focus:text-white"
                    />
                    <DropdownMenu
                      open={showFilterMenu}
                      onOpenChange={setShowFilterMenu}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        >
                          <Filter className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => setSelectedCategory("All")}
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          All Chats
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSelectedCategory("Work")}
                        >
                          <Folder className="mr-2 h-4 w-4" />
                          Work
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSelectedCategory("Personal")}
                        >
                          <User className="mr-2 h-4 w-4" />
                          Personal
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSelectedCategory("Creative")}
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Creative
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSelectedCategory("Learning")}
                        >
                          <GraduationCap className="mr-2 h-4 w-4" />
                          Learning
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Chat Categories */}
                <div className="px-4 pb-2">
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <Badge
                        key={category}
                        variant="secondary"
                        className={`cursor-pointer transition-colors ${
                          selectedCategory === category
                            ? "bg-emerald-600 text-white border-emerald-500"
                            : "bg-slate-700 text-slate-200 hover:bg-slate-600 hover:text-white border-slate-600"
                        }`}
                        onClick={() => setSelectedCategory(category)}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Chat History */}
                <ScrollArea className="flex-1 px-4">
                  <div className="space-y-2">
                    {/* Pinned Chats */}
                    <div className="mb-4">
                      <div className="flex items-center text-sm text-slate-400 mb-2">
                        <Pin className="h-3 w-3 mr-1" />
                        Pinned
                      </div>
                      {pinnedChats.map((chat) => (
                        <ChatHistoryItem
                          key={chat.id}
                          chat={chat}
                          isActive={chat.id === chatId}
                          onPin={() => togglePin(chat.id)}
                          onBookmark={() => toggleBookmark(chat.id)}
                          onDelete={() => deleteChat(chat.id)}
                        />
                      ))}
                    </div>

                    {/* Recent Chats */}
                    <div>
                      <div className="flex items-center text-sm text-slate-400 mb-2">
                        <Clock className="h-3 w-3 mr-1" />
                        Recent
                      </div>
                      {conversationsLoading ? (
                        <div className="space-y-2">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className="p-3 rounded-lg bg-slate-700/30 animate-pulse"
                            >
                              <div className="h-4 bg-slate-600 rounded mb-2"></div>
                              <div className="h-3 bg-slate-600 rounded w-3/4"></div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        recentChats.map((chat) => (
                          <ChatHistoryItem
                            key={chat.id}
                            chat={chat}
                            isActive={chat.id === chatId}
                            onPin={() => togglePin(chat.id)}
                            onBookmark={() => toggleBookmark(chat.id)}
                            onDelete={() => deleteChat(chat.id)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </ScrollArea>

                {/* Usage Meter */}
                <div className="p-4 border-t border-slate-700/50">
                  <div className="mb-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Usage this month</span>
                      <span className="text-emerald-400">{usage}%</span>
                    </div>
                    <Progress value={usage} className="h-2 bg-slate-700" />
                  </div>
                  <p className="text-xs text-slate-500">Resets in 12 days</p>
                </div>

                {/* User Profile */}
                <div className="p-4 border-t border-slate-700/50">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start p-2"
                      >
                        <Avatar className="h-8 w-8 mr-3">
                          <AvatarImage src={user?.imageUrl} />
                          <AvatarFallback>
                            {user?.firstName?.[0] ||
                              user?.emailAddresses?.[0]?.emailAddress?.[0] ||
                              "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <div
                            className="text-sm font-medium"
                            data-personal-info={visualPrefs.hidePersonalInfo}
                          >
                            {personalization.displayName ||
                              user?.fullName ||
                              user?.emailAddresses?.[0]?.emailAddress ||
                              "User"}
                          </div>
                          <div className="text-xs text-slate-400">
                            Free Plan
                          </div>
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => router.push("/profile")}>
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/settings")}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        <span className="flex-1">Settings</span>
                        <span className="text-xs text-slate-500">⌘,</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <SignOutButton>
                          <button className="flex items-center w-full">
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign out
                          </button>
                        </SignOutButton>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-xl">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold">
                {conversation?.title ||
                  (messages.length > 0 ? "Chat Session" : "New Conversation")}
              </h2>
              {(conversation || messages.length > 0) && (
                <Badge
                  variant="outline"
                  className="border-emerald-500 text-emerald-400"
                >
                  {conversation?.model || selectedModel}
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-2">
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

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShareModal(true)}
                disabled={!conversation && messages.length === 0}
              >
                <Share className="h-4 w-4" />
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/settings")}
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

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-6">
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
                  <MessageBubble key={message.id} message={message} />
                ))}
                {isStreaming && <TypingIndicator />}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-6 border-t border-slate-700/50 bg-slate-800/30 backdrop-blur-xl">
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

              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message... (⌘ + Enter to send)"
                  className="min-h-[60px] max-h-[200px] bg-slate-700/50 border-slate-600 text-white placeholder-slate-400 pr-24 resize-none focus:text-white"
                  rows={1}
                />

                <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-8 w-8 p-0 ${
                          showAttachments ? "text-emerald-400" : ""
                        }`}
                        onClick={() => setShowAttachments(!showAttachments)}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Attach files</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <Mic className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Voice input</p>
                    </TooltipContent>
                  </Tooltip>

                  <Button
                    size="sm"
                    onClick={handleSendMessage}
                    disabled={
                      (!inputValue.trim() && attachments.length === 0) ||
                      isStreaming
                    }
                    className="bg-emerald-600 hover:bg-emerald-700 h-8 w-8 p-0"
                  >
                    {isStreaming ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
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

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-md bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Settings</DialogTitle>
            <DialogDescription className="text-slate-300">
              Manage your chat preferences and account settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Theme Settings */}
            <div className="space-y-3">
              <Label htmlFor="theme" className="text-sm font-medium text-white">
                Theme
              </Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant={preferences.theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    savePreferences({ ...preferences, theme: "dark" })
                  }
                  className="flex-1"
                >
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                </Button>
                <Button
                  variant={
                    preferences.theme === "light" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    savePreferences({ ...preferences, theme: "light" })
                  }
                  className="flex-1"
                >
                  <Sun className="h-4 w-4 mr-2" />
                  Light
                </Button>
              </div>
            </div>

            {/* Notifications */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label
                  htmlFor="notifications"
                  className="text-sm font-medium text-white"
                >
                  Notifications
                </Label>
                <p className="text-xs text-slate-400">
                  Get notified about new messages
                </p>
              </div>
              <Switch
                id="notifications"
                checked={preferences.notifications}
                onCheckedChange={(checked) =>
                  savePreferences({ ...preferences, notifications: checked })
                }
              />
            </div>

            {/* Auto Save */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label
                  htmlFor="autosave"
                  className="text-sm font-medium text-white"
                >
                  Auto Save
                </Label>
                <p className="text-xs text-slate-400">
                  Automatically save conversations
                </p>
              </div>
              <Switch
                id="autosave"
                checked={preferences.autoSave}
                onCheckedChange={(checked) =>
                  savePreferences({ ...preferences, autoSave: checked })
                }
              />
            </div>

            {/* Current Usage Display */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-white">
                Current Usage
              </Label>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Messages this month</span>
                  <span className="text-emerald-400">
                    {conversations.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Storage used</span>
                  <span className="text-emerald-400">{usage}%</span>
                </div>
                <Progress value={usage} className="h-2 bg-slate-700" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (
                    confirm(
                      "This will clear all your chat preferences. Continue?"
                    )
                  ) {
                    savePreferences({
                      pinnedChats: [],
                      bookmarkedChats: [],
                      chatCategories: {},
                      theme: "dark",
                      notifications: true,
                      autoSave: true,
                    });
                    toast({
                      title: "Settings Reset",
                      description:
                        "All preferences have been reset to defaults",
                    });
                  }
                }}
                className="border-slate-600 text-slate-300 hover:text-white"
              >
                Reset to Defaults
              </Button>
              <Button
                onClick={() => setShowSettingsDialog(false)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

// Supporting Components
function ChatHistoryItem({
  chat,
  isActive,
  onPin,
  onBookmark,
  onDelete,
}: {
  chat: Chat;
  isActive: boolean;
  onPin: () => void;
  onBookmark: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/chat/${chat.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 group ${
        isActive
          ? "bg-emerald-600/20 border border-emerald-500/30"
          : "hover:bg-slate-700/50"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-medium text-sm truncate text-white">
              {chat.title}
            </h3>
            {chat.isPinned && (
              <Pin className="h-3 w-3 text-emerald-400 flex-shrink-0" />
            )}
            {chat.isBookmarked && (
              <Star className="h-3 w-3 text-amber-400 flex-shrink-0" />
            )}
          </div>
          {chat.preview && (
            <p className="text-xs text-slate-300 truncate mb-2">
              {chat.preview}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{chat.timestamp.toLocaleDateString()}</span>
            <Badge
              variant="outline"
              className="text-xs border-slate-600 text-slate-300"
            >
              {chat.model}
            </Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onPin();
              }}
            >
              <Pin className="mr-2 h-4 w-4" />
              {chat.isPinned ? "Unpin" : "Pin"} Chat
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onBookmark();
              }}
            >
              <Star className="mr-2 h-4 w-4" />
              {chat.isBookmarked ? "Remove Bookmark" : "Bookmark"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Add rename functionality
              }}
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Add archive functionality
              }}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Are you sure you want to delete this chat?")) {
                  onDelete();
                }
              }}
              className="text-red-400 focus:text-red-300"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

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

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isStreaming = message.metadata?.streamingComplete === false;
  const hasError = message.metadata?.error || message.error;
  const hasAttachments =
    message.metadata?.attachments && message.metadata.attachments.length > 0;

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
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback
              className={`${
                hasError
                  ? "bg-red-600"
                  : isUser
                  ? "bg-emerald-600"
                  : "bg-blue-600"
              }`}
            >
              {isUser ? (
                <User className="h-4 w-4" />
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
                    allowHtml={false}
                  />

                  {/* Display attachments within the message bubble */}
                  {hasAttachments && (
                    <MessageAttachments
                      attachments={message.metadata!.attachments!}
                      isUser={isUser}
                      className={
                        message.content.trim()
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
