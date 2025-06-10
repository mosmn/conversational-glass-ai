import React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Share, Settings, GitBranch } from "lucide-react";
import { ModelSelector } from "./ModelSelector";

interface ChatHeaderProps {
  conversationTitle?: string;
  conversationModel?: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
  lastSyncTime?: string;
  totalBranches: number;
  onShareClick: () => void;
  onBranchNavigatorClick: () => void;
  hasConversation: boolean;
}

export function ChatHeader({
  conversationTitle,
  conversationModel,
  selectedModel,
  onModelChange,
  lastSyncTime,
  totalBranches,
  onShareClick,
  onBranchNavigatorClick,
  hasConversation,
}: ChatHeaderProps) {
  const router = useRouter();

  return (
    <div className="relative z-10 flex items-center justify-between p-6 border-b border-slate-700/30 bg-slate-800/20 backdrop-blur-2xl">
      {/* Subtle header glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5 pointer-events-none" />

      <div className="relative flex items-center space-x-4 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-1 h-8 bg-gradient-to-b from-emerald-400 to-blue-500 rounded-full" />
          <h2 className="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            {conversationTitle || "✨ New Conversation"}
          </h2>
        </div>
        {(conversationModel || selectedModel) && (
          <Badge
            variant="outline"
            className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10 backdrop-blur-sm px-3 py-1 rounded-full font-medium"
          >
            🤖 {conversationModel || selectedModel}
          </Badge>
        )}
      </div>

      <div className="relative flex items-center space-x-2 z-10">
        {/* Model Selector */}
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={onModelChange}
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
              <p>Last synced: {new Date(lastSyncTime).toLocaleTimeString()}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Branch Navigator Button */}
        {totalBranches > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onBranchNavigatorClick}
                className="hover:bg-slate-700/50 hover:text-purple-400 transition-colors"
              >
                <GitBranch className="h-4 w-4 mr-1" />
                <span className="text-xs">{totalBranches}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>View conversation branches ({totalBranches})</p>
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onShareClick}
              disabled={!hasConversation}
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
  );
}
