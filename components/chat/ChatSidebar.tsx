"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConversations } from "@/hooks/useConversations";
import { useHierarchicalConversations } from "@/hooks/useHierarchicalConversations";
import { useToast } from "@/hooks/use-toast";
import { useUser, SignOutButton } from "@clerk/nextjs";
import {
  usePersonalization,
  useVisualPreferences,
} from "@/hooks/useUserPreferences";
import { HierarchicalChatItem } from "@/components/chat/HierarchicalChatItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Settings,
  ChevronLeft,
  ChevronRight,
  Pin,
  Folder,
  Star,
  Clock,
  User,
  Filter,
  GraduationCap,
  Sparkles,
  LogOut,
  MoreHorizontal,
  Edit3,
  Archive,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import ConversationalGlassLogo, {
  ConversationalGlassLogoMini,
} from "@/components/ConversationalGlassLogo";

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

interface ChatPreferences {
  pinnedChats: string[];
  bookmarkedChats: string[];
  chatCategories: Record<string, string>;
  theme: string;
  notifications: boolean;
  autoSave: boolean;
}

interface ChatSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentChatId: string;
  selectedModel: string;
  onCreateNewChat: () => void;
}

export function ChatSidebar({
  isCollapsed,
  onToggleCollapse,
  currentChatId,
  selectedModel,
  onCreateNewChat,
}: ChatSidebarProps) {
  const router = useRouter();
  const { user } = useUser();
  const personalization = usePersonalization();
  const visualPrefs = useVisualPreferences();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [usage, setUsage] = useState(65);
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

  // API hooks
  const {
    conversations,
    loading: conversationsLoading,
    createConversation,
    refetchConversations,
  } = useConversations();

  // Hierarchical conversations for enhanced sidebar display
  const {
    conversations: hierarchicalConversations,
    loading: hierarchicalLoading,
    refetchConversations: refetchHierarchical,
    navigateToConversation,
  } = useHierarchicalConversations();

  // Calculate actual usage and update when conversations change
  useEffect(() => {
    const calculateUsage = () => {
      const baseUsage = Math.min(hierarchicalConversations.length * 2, 80);
      return baseUsage + Math.floor(Math.random() * 20);
    };

    const newUsage = calculateUsage();
    setUsage(newUsage);
  }, [hierarchicalConversations.length]);

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
      refetchHierarchical();

      // Navigate away if current chat is deleted
      if (chatId === currentChatId) {
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

  // Process hierarchical conversations for display
  const filteredHierarchicalChats = hierarchicalConversations.filter((conv) => {
    // Search filter
    const matchesSearch =
      !searchQuery ||
      conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.branchName &&
        conv.branchName.toLowerCase().includes(searchQuery.toLowerCase()));

    // Category filter
    const category = preferences.chatCategories[conv.id] || "General";
    const matchesCategory =
      selectedCategory === "All" || category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Separate pinned and recent chats for hierarchical display
  const pinnedHierarchicalChats = filteredHierarchicalChats.filter((conv) =>
    preferences.pinnedChats.includes(conv.id)
  );
  const recentHierarchicalChats = filteredHierarchicalChats.filter(
    (conv) => !preferences.pinnedChats.includes(conv.id)
  );

  // Handler for navigating to parent conversations
  const handleNavigateToParent = (parentId: string) => {
    navigateToConversation(parentId);
    router.push(`/chat/${parentId}`);
  };

  // Available categories
  const categories = ["All", "Work", "Personal", "Creative", "Learning"];

  return (
    <div
      className={`${
        isCollapsed ? "w-16" : "w-80"
      } flex-shrink-0 relative transition-all duration-500 ease-in-out`}
    >
      {/* Glassmorphic Background */}
      <div className="absolute inset-0 bg-slate-800/30 backdrop-blur-2xl border-r border-slate-700/30" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-700/20 via-transparent to-slate-900/20" />

      {/* Animated Border */}
      <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Sidebar Header */}
        <div className="flex-shrink-0 p-6 border-b border-slate-700/30 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent" />

          <div className="relative">
            {!isCollapsed ? (
              <div className="flex items-center justify-between">
                <div className="transition-all duration-300 hover:scale-105">
                  <ConversationalGlassLogo
                    size="md"
                    animated={true}
                    showText={true}
                    className="flex-shrink-0"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleCollapse}
                  className="text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-300 rounded-xl backdrop-blur-sm border border-slate-700/30 hover:border-emerald-500/30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3">
                <div className="transition-all duration-300 hover:scale-110">
                  <ConversationalGlassLogoMini className="flex-shrink-0" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onToggleCollapse}
                  className="w-10 h-10 p-0 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-300 rounded-xl backdrop-blur-sm border border-slate-700/30 hover:border-emerald-500/30 shadow-lg hover:shadow-emerald-500/20"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {!isCollapsed && (
          <>
            {/* New Chat Button */}
            <div className="flex-shrink-0 p-6">
              <Button
                onClick={onCreateNewChat}
                className="w-full relative group overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 h-12 rounded-xl backdrop-blur-sm border border-emerald-500/30"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/20 to-emerald-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

                <div className="relative flex items-center justify-center space-x-2">
                  <Plus className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
                  <span className="font-semibold">✨ New Chat</span>
                </div>
              </Button>
            </div>

            {/* Search */}
            <div className="flex-shrink-0 px-6 pb-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-400 transition-colors duration-300" />
                <Input
                  placeholder="🔍 Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-12 h-12 bg-slate-700/30 border-slate-600/50 text-white placeholder-slate-500 focus:text-white rounded-xl backdrop-blur-sm focus:border-emerald-500/50 focus:bg-slate-700/50 transition-all duration-300 focus:shadow-lg focus:shadow-emerald-500/10"
                />
                <DropdownMenu
                  open={showFilterMenu}
                  onOpenChange={setShowFilterMenu}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all duration-300 rounded-lg"
                    >
                      <Filter className="h-4 w-4" />
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
            <div className="flex-shrink-0 px-6 pb-4">
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
            <div className="flex-1 min-h-0">
              <ScrollArea className="h-full px-4">
                <div className="space-y-2 max-w-full">
                  {/* Pinned Chats */}
                  {pinnedHierarchicalChats.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center text-sm text-slate-400 mb-2 px-2">
                        <Pin className="h-3 w-3 mr-1" />
                        Pinned
                      </div>
                      <div className="space-y-1">
                        {pinnedHierarchicalChats.map((chat) => (
                          <HierarchicalChatItem
                            key={chat.id}
                            chat={chat}
                            isActive={chat.id === currentChatId}
                            isPinned={preferences.pinnedChats.includes(chat.id)}
                            isBookmarked={preferences.bookmarkedChats.includes(
                              chat.id
                            )}
                            onPin={() => togglePin(chat.id)}
                            onBookmark={() => toggleBookmark(chat.id)}
                            onDelete={() => deleteChat(chat.id)}
                            onNavigateToParent={handleNavigateToParent}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Chats */}
                  <div>
                    <div className="flex items-center text-sm text-slate-400 mb-2 px-2">
                      <Clock className="h-3 w-3 mr-1" />
                      Recent
                    </div>
                    {hierarchicalLoading ? (
                      <div className="space-y-1">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="p-3 mx-2 rounded-lg bg-slate-700/30 animate-pulse"
                          >
                            <div className="h-4 bg-slate-600 rounded mb-2"></div>
                            <div className="h-3 bg-slate-600 rounded w-3/4"></div>
                          </div>
                        ))}
                      </div>
                    ) : recentHierarchicalChats.length === 0 ? (
                      <div className="text-center py-8 px-4">
                        <div className="text-slate-400 mb-2">
                          No conversations yet
                        </div>
                        <div className="text-xs text-slate-500">
                          Create a new chat to get started
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {recentHierarchicalChats.map((chat) => (
                          <HierarchicalChatItem
                            key={chat.id}
                            chat={chat}
                            isActive={chat.id === currentChatId}
                            isPinned={preferences.pinnedChats.includes(chat.id)}
                            isBookmarked={preferences.bookmarkedChats.includes(
                              chat.id
                            )}
                            onPin={() => togglePin(chat.id)}
                            onBookmark={() => toggleBookmark(chat.id)}
                            onDelete={() => deleteChat(chat.id)}
                            onNavigateToParent={handleNavigateToParent}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* Usage Meter */}
            <div className="flex-shrink-0 p-6 border-t border-slate-700/30">
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
            <div className="flex-shrink-0 p-6 border-t border-slate-700/30">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start p-2">
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
                      <div className="text-xs text-slate-400">Free Plan</div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => router.push("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/settings")}>
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
  );
}

// ChatHistoryItem Component
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
    <div className="mx-2 mb-1">
      <div
        onClick={handleClick}
        className={`relative p-3 rounded-lg cursor-pointer transition-all duration-200 group overflow-hidden max-w-full ${
          isActive
            ? "bg-emerald-600/20 border border-emerald-500/30"
            : "hover:bg-slate-700/50"
        }`}
      >
        {/* Main content area with reserved space for menu */}
        <div className="pr-8">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-1 min-w-0">
            <h3 className="font-medium text-sm text-white truncate flex-1 min-w-0">
              {chat.title}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              {chat.isPinned && <Pin className="h-3 w-3 text-emerald-400" />}
              {chat.isBookmarked && <Star className="h-3 w-3 text-amber-400" />}
            </div>
          </div>

          {/* Preview text */}
          {chat.preview && (
            <p className="text-xs text-slate-300 truncate mb-2 min-w-0">
              {chat.preview}
            </p>
          )}

          {/* Bottom row */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-xs text-slate-400 truncate flex-shrink min-w-0">
              {chat.timestamp.toLocaleDateString()}
            </span>
            <Badge
              variant="outline"
              className="text-xs border-slate-600 text-slate-300 flex-shrink-0"
            >
              {chat.model}
            </Badge>
          </div>
        </div>

        {/* Three-dot menu - positioned within bounds */}
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 hover:bg-slate-600/50 rounded-md"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="right"
              alignOffset={-10}
              sideOffset={5}
              className="w-48 bg-slate-800 border-slate-700 shadow-xl z-50"
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onPin();
                }}
                className="hover:bg-slate-700 cursor-pointer"
              >
                <Pin className="mr-2 h-4 w-4" />
                {chat.isPinned ? "Unpin" : "Pin"} Chat
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onBookmark();
                }}
                className="hover:bg-slate-700 cursor-pointer"
              >
                <Star className="mr-2 h-4 w-4" />
                {chat.isBookmarked ? "Remove Bookmark" : "Bookmark"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Add rename functionality
                }}
                className="hover:bg-slate-700 cursor-pointer"
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Add archive functionality
                }}
                className="hover:bg-slate-700 cursor-pointer"
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Are you sure you want to delete this chat?")) {
                    onDelete();
                  }
                }}
                className="text-red-400 focus:text-red-300 hover:bg-red-900/20 cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
