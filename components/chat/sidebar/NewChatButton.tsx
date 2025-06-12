"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface NewChatButtonProps {
  onCreateNewChat: () => void;
}

export function NewChatButton({ onCreateNewChat }: NewChatButtonProps) {
  return (
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
  );
}
