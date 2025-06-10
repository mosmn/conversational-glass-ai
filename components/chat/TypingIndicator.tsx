import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConversationalGlassLogoMini } from "@/components/ConversationalGlassLogo";

export function TypingIndicator() {
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
