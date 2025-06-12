"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ConversationalGlassLogo, {
  ConversationalGlassLogoMini,
} from "@/components/ConversationalGlassLogo";

interface SidebarHeaderProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function SidebarHeader({
  isCollapsed,
  onToggleCollapse,
}: SidebarHeaderProps) {
  return (
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
  );
}
