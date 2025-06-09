"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Settings,
  Filter,
  Pin,
  Folder,
  Star,
  Clock,
  Zap,
  User,
  Sun,
  Moon,
  ChevronLeft,
} from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
  SidebarInput,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { useConversations } from "@/hooks/useConversations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuAction } from "@/components/ui/sidebar";

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

interface ChatSidebarProps {
  chats: Chat[];
  activeChatId?: string;
  onNewChat: () => void;
  onChatSelect: (chatId: string) => void;
}

interface ChatPreferences {
  pinnedChats: string[];
  bookmarkedChats: string[];
  chatCategories: Record<string, string>;
}

export function ChatSidebar({
  chats,
  activeChatId,
  onNewChat,
  onChatSelect,
}: ChatSidebarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedFilter, setSelectedFilter] = React.useState<string>("all");
  const { loading: conversationsLoading } = useConversations();

  // Local storage for chat preferences
  const [preferences, setPreferences] = React.useState<ChatPreferences>(() => {
    if (typeof window === "undefined")
      return { pinnedChats: [], bookmarkedChats: [], chatCategories: {} };
    const stored = localStorage.getItem("chat:preferences");
    return stored
      ? JSON.parse(stored)
      : { pinnedChats: [], bookmarkedChats: [], chatCategories: {} };
  });

  const savePreferences = React.useCallback((newPrefs: ChatPreferences) => {
    setPreferences(newPrefs);
    localStorage.setItem("chat:preferences", JSON.stringify(newPrefs));
  }, []);

  const togglePin = React.useCallback((chatId: string) => {
    setPreferences((prev: ChatPreferences) => {
      const newPinnedChats = prev.pinnedChats.includes(chatId)
        ? prev.pinnedChats.filter((id: string) => id !== chatId)
        : [...prev.pinnedChats, chatId];

      const newPrefs = {
        ...prev,
        pinnedChats: newPinnedChats,
      };

      localStorage.setItem("chat:preferences", JSON.stringify(newPrefs));
      return newPrefs;
    });
  }, []);

  const toggleBookmark = React.useCallback((chatId: string) => {
    setPreferences((prev: ChatPreferences) => {
      const newBookmarkedChats = prev.bookmarkedChats.includes(chatId)
        ? prev.bookmarkedChats.filter((id: string) => id !== chatId)
        : [...prev.bookmarkedChats, chatId];

      const newPrefs = {
        ...prev,
        bookmarkedChats: newBookmarkedChats,
      };

      localStorage.setItem("chat:preferences", JSON.stringify(newPrefs));
      return newPrefs;
    });
  }, []);

  // Filter chats based on search query and selected filter
  const filteredChats = React.useMemo(() => {
    return chats
      .filter((chat) => {
        const matchesSearch = chat.title
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

        switch (selectedFilter) {
          case "pinned":
            return matchesSearch && preferences.pinnedChats.includes(chat.id);
          case "bookmarked":
            return (
              matchesSearch && preferences.bookmarkedChats.includes(chat.id)
            );
          default:
            return matchesSearch;
        }
      })
      .sort((a, b) => {
        // Sort pinned chats first
        const aIsPinned = preferences.pinnedChats.includes(a.id);
        const bIsPinned = preferences.pinnedChats.includes(b.id);
        if (aIsPinned && !bIsPinned) return -1;
        if (!aIsPinned && bIsPinned) return 1;
        // Then sort by timestamp
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
  }, [chats, searchQuery, selectedFilter, preferences]);

  const pinnedChats = filteredChats.filter((chat) =>
    preferences.pinnedChats.includes(chat.id)
  );
  const recentChats = filteredChats.filter(
    (chat) => !preferences.pinnedChats.includes(chat.id)
  );

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas">
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => router.push("/")}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => router.push("/profile")}
            >
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SidebarInput
            type="search"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button variant="ghost" size="icon" onClick={onNewChat}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <ScrollArea className="h-[calc(100vh-10rem)]">
          {/* Filter Menu */}
          <SidebarMenu>
            <SidebarMenuButton
              className={selectedFilter === "all" ? "bg-accent" : ""}
              onClick={() => setSelectedFilter("all")}
            >
              <Clock className="h-4 w-4" />
              All Chats
            </SidebarMenuButton>
            <SidebarMenuButton
              className={selectedFilter === "pinned" ? "bg-accent" : ""}
              onClick={() => setSelectedFilter("pinned")}
            >
              <Pin className="h-4 w-4" />
              Pinned
            </SidebarMenuButton>
            <SidebarMenuButton
              className={selectedFilter === "bookmarked" ? "bg-accent" : ""}
              onClick={() => setSelectedFilter("bookmarked")}
            >
              <Star className="h-4 w-4" />
              Bookmarked
            </SidebarMenuButton>
          </SidebarMenu>

          <SidebarSeparator />

          {/* Pinned Chats */}
          {pinnedChats.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Pinned</SidebarGroupLabel>
              <SidebarGroupContent>
                {pinnedChats.map((chat) => (
                  <ChatHistoryItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === activeChatId}
                    isPinned={preferences.pinnedChats.includes(chat.id)}
                    isBookmarked={preferences.bookmarkedChats.includes(chat.id)}
                    onPin={() => togglePin(chat.id)}
                    onBookmark={() => toggleBookmark(chat.id)}
                    onClick={() => onChatSelect(chat.id)}
                  />
                ))}
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Recent Chats */}
          <SidebarGroup>
            <SidebarGroupLabel>Recent</SidebarGroupLabel>
            <SidebarGroupContent>
              {recentChats.map((chat) => (
                <ChatHistoryItem
                  key={chat.id}
                  chat={chat}
                  isActive={chat.id === activeChatId}
                  isPinned={preferences.pinnedChats.includes(chat.id)}
                  isBookmarked={preferences.bookmarkedChats.includes(chat.id)}
                  onPin={() => togglePin(chat.id)}
                  onBookmark={() => toggleBookmark(chat.id)}
                  onClick={() => onChatSelect(chat.id)}
                />
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/avatar.png" alt="User" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">User</span>
              <span className="text-xs text-muted-foreground">Free Plan</span>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function ChatHistoryItem({
  chat,
  isActive,
  isPinned,
  isBookmarked,
  onPin,
  onBookmark,
  onClick,
}: {
  chat: Chat;
  isActive: boolean;
  isPinned: boolean;
  isBookmarked: boolean;
  onPin: () => void;
  onBookmark: () => void;
  onClick: () => void;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        onClick={onClick}
        className="w-full justify-start gap-2"
      >
        <div className="flex w-full items-center gap-2">
          <div className="flex-1 truncate">
            <div className="flex items-center gap-2">
              <span className="truncate">{chat.title}</span>
              {isPinned && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPin();
                  }}
                >
                  <Pin className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
              {isBookmarked && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBookmark();
                  }}
                >
                  <Star className="h-3 w-3 text-muted-foreground" />
                </Button>
              )}
            </div>
            {chat.preview && (
              <span className="block truncate text-xs text-muted-foreground">
                {chat.preview}
              </span>
            )}
          </div>
          <Badge variant="outline" className="shrink-0">
            {chat.model}
          </Badge>
        </div>
      </SidebarMenuButton>
      <SidebarMenuAction
        showOnHover
        onClick={(e) => {
          e.stopPropagation();
          onPin();
        }}
      >
        <Pin className="h-4 w-4" />
      </SidebarMenuAction>
      <SidebarMenuAction
        showOnHover
        onClick={(e) => {
          e.stopPropagation();
          onBookmark();
        }}
      >
        <Star className="h-4 w-4" />
      </SidebarMenuAction>
    </SidebarMenuItem>
  );
}
