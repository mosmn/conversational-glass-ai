"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ModelSelector } from "./ModelSelector";
import { Badge } from "@/components/ui/badge";
import { Settings, Bot, ChevronUp, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface FloatingMobileActionsProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  lastSyncTime?: string;
  className?: string;
}

export function FloatingMobileActions({
  selectedModel,
  onModelChange,
  lastSyncTime,
  className,
}: FloatingMobileActionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();

  return (
    <div className={cn("sm:hidden fixed bottom-20 right-4 z-40", className)}>
      <div className="flex flex-col items-end gap-2">
        {/* Expanded Actions */}
        {isExpanded && (
          <div className="flex flex-col items-end gap-2 animate-in slide-in-from-bottom-2 duration-200">
            {/* Model Selector */}
            <div className="glass-card p-2 rounded-xl border border-white/10 backdrop-blur-xl bg-slate-900/80">
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={onModelChange}
              />
            </div>

            {/* Sync Status */}
            {lastSyncTime && (
              <Badge
                variant="outline"
                className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30 backdrop-blur-xl"
              >
                <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse" />
                Synced
              </Badge>
            )}

            {/* Settings Quick Access */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/settings")}
              className="glass-card hover:bg-slate-700/50 hover:text-blue-400 transition-colors h-10 w-10 p-0 backdrop-blur-xl bg-slate-900/80 border border-white/10"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "glass-card h-12 w-12 p-0 rounded-full transition-all duration-200",
            "backdrop-blur-xl bg-slate-900/80 border border-white/10",
            "hover:bg-slate-700/50 hover:text-emerald-400",
            "shadow-lg hover:shadow-emerald-500/20",
            isExpanded && "rotate-180"
          )}
        >
          {isExpanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <Bot className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
