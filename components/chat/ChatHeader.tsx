import React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Share, Settings, GitBranch, Menu, Plus } from "lucide-react";
import { ModelSelector } from "./ModelSelector";

interface ChatHeaderProps {
  conversationTitle?: string;
  conversationModel?: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
  lastSyncTime?: string;
  onShareClick: () => void;
  hasConversation: boolean;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  sidebarCollapsed: boolean;
}

export function ChatHeader({
  conversationTitle,
  conversationModel,
  selectedModel,
  onModelChange,
  lastSyncTime,
  onShareClick,
  hasConversation,
  onToggleSidebar,
  onNewChat,
  sidebarCollapsed,
}: ChatHeaderProps) {
  const router = useRouter();

  return (
    <div
      className="relative z-10 flex items-center justify-between p-3 sm:p-3 lg:p-6 border-b border-slate-700/30 bg-slate-800/20 backdrop-blur-2xl 
                    pt-safe-top sm:pt-3 lg:pt-6"
    >
      {/* Subtle header glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5 pointer-events-none" />

      <div className="relative flex items-center gap-3 sm:gap-3 lg:gap-4 z-10 min-w-0 flex-1">
        {/* Mobile Menu Button - Much larger touch target */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="lg:hidden hover:bg-slate-700/50 hover:text-emerald-400 transition-colors 
                     h-12 w-12 sm:h-10 sm:w-10 p-0 flex-shrink-0 touch-manipulation 
                     rounded-xl active:scale-95 active:bg-slate-700/60"
        >
          <Menu className="h-6 w-6 sm:h-5 sm:w-5" />
        </Button>

        {/* New Chat Button - Shows when sidebar is collapsed on desktop */}
        {sidebarCollapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onNewChat}
                className="hidden lg:flex hover:bg-slate-700/50 hover:text-emerald-400 transition-colors h-8 w-8 p-0 flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>New conversation</p>
            </TooltipContent>
          </Tooltip>
        )}

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-1 h-6 sm:h-6 lg:h-8 bg-gradient-to-b from-emerald-400 to-blue-500 rounded-full flex-shrink-0" />
          <h2 className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent truncate">
            {conversationTitle || "✨ New Conversation"}
          </h2>
        </div>
      </div>

      <div className="relative flex items-center gap-2 sm:gap-2 z-10 flex-shrink-0">
        {/* Model Selector - Hidden on mobile for space */}
        <div className="hidden sm:flex items-center">
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={onModelChange}
          />
        </div>

        {/* Sync Status Indicator - Hidden on mobile */}
        {lastSyncTime && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="hidden sm:flex bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
              >
                <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse" />
                Synced
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Last synced: {new Date(lastSyncTime).toLocaleTimeString()}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Share Button - Larger touch target on mobile */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onShareClick}
              disabled={!hasConversation}
              className="hover:bg-slate-700/50 hover:text-emerald-400 transition-colors 
                         h-10 w-10 sm:h-9 sm:w-9 lg:h-10 lg:w-10 p-0 touch-manipulation
                         rounded-xl active:scale-95 active:bg-slate-700/60"
            >
              <Share className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Share conversation</p>
          </TooltipContent>
        </Tooltip>

        {/* Settings Button - Larger touch target on mobile */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/settings/customize")}
              className="hover:bg-slate-700/50 hover:text-blue-400 transition-colors 
                         h-10 w-10 sm:h-9 sm:w-9 lg:h-10 lg:w-10 p-0 touch-manipulation
                         rounded-xl active:scale-95 active:bg-slate-700/60"
            >
              <Settings className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Settings & Customization</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
