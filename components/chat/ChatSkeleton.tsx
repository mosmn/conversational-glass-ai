import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";

interface ChatSkeletonProps {
  messageCount?: number;
  showWelcome?: boolean;
}

export function ChatSkeleton({
  messageCount = 3,
  showWelcome = false,
}: ChatSkeletonProps) {
  if (showWelcome) {
    return <WelcomeSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {[...Array(messageCount)].map((_, i) => (
        <div key={i} className="space-y-4">
          {/* User Message Skeleton */}
          <div className="flex justify-end items-start gap-3">
            <div className="flex flex-col items-end space-y-2 max-w-[85%] sm:max-w-lg">
              <div className="bg-slate-700/30 backdrop-blur-sm rounded-2xl rounded-br-md p-3 sm:p-4 border border-slate-600/30">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full bg-slate-600/50" />
                  <Skeleton className="h-4 w-3/4 bg-slate-600/50" />
                  {Math.random() > 0.5 && (
                    <Skeleton className="h-4 w-1/2 bg-slate-600/50" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Skeleton className="h-3 w-12 bg-slate-600/30" />
              </div>
            </div>
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0">
              <AvatarFallback className="bg-slate-700/50 border border-slate-600/30">
                <User className="h-4 w-4 text-slate-400" />
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Assistant Message Skeleton */}
          <div className="flex justify-start items-start gap-3">
            <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30">
                <Bot className="h-4 w-4 text-emerald-400" />
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-2 max-w-[85%] sm:max-w-2xl">
              <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl rounded-bl-md p-3 sm:p-4 border border-slate-700/30">
                <div className="space-y-2.5">
                  <Skeleton className="h-4 w-full bg-slate-600/40" />
                  <Skeleton className="h-4 w-11/12 bg-slate-600/40" />
                  <Skeleton className="h-4 w-4/5 bg-slate-600/40" />
                  {Math.random() > 0.3 && (
                    <>
                      <div className="pt-1">
                        <Skeleton className="h-4 w-3/4 bg-slate-600/40" />
                      </div>
                      <Skeleton className="h-4 w-5/6 bg-slate-600/40" />
                    </>
                  )}
                  {Math.random() > 0.7 && (
                    <div className="pt-2 space-y-2">
                      <Skeleton className="h-20 w-full bg-slate-600/30 rounded-lg" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Skeleton className="h-3 w-16 bg-slate-600/30" />
                <span className="text-slate-600">•</span>
                <Skeleton className="h-3 w-8 bg-slate-600/30" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WelcomeSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 sm:p-8">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        {/* Logo/Title Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-12 w-64 mx-auto bg-slate-700/30" />
          <Skeleton className="h-6 w-96 mx-auto bg-slate-700/20" />
        </div>

        {/* Quick Actions Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30"
            >
              <div className="space-y-3">
                <Skeleton className="h-8 w-8 bg-slate-600/40 rounded-lg" />
                <Skeleton className="h-5 w-16 bg-slate-600/40" />
                <Skeleton className="h-4 w-full bg-slate-600/30" />
              </div>
            </div>
          ))}
        </div>

        {/* Suggested prompts skeleton */}
        <div className="space-y-3 mt-6">
          <Skeleton className="h-5 w-32 mx-auto bg-slate-700/30" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-10 w-full bg-slate-700/20 rounded-lg"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Typing indicator skeleton for when AI is responding
export function TypingIndicatorSkeleton() {
  return (
    <div className="flex justify-start items-start gap-3 max-w-4xl mx-auto">
      <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30">
          <Bot className="h-4 w-4 text-emerald-400" />
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col space-y-2 max-w-[85%] sm:max-w-2xl">
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl rounded-bl-md p-3 sm:p-4 border border-slate-700/30">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
              <div
                className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              />
              <div
                className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
            </div>
            <span className="text-sm text-slate-400">AI is thinking...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading skeleton for sidebar
export function SidebarSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {/* New chat button skeleton */}
      <Skeleton className="h-10 w-full bg-slate-700/30 rounded-lg" />

      {/* Search skeleton */}
      <Skeleton className="h-9 w-full bg-slate-700/20 rounded-md" />

      {/* Chat list skeleton */}
      <div className="space-y-2 mt-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-8 w-full bg-slate-700/20 rounded-md" />
            {Math.random() > 0.7 && (
              <div className="ml-4 space-y-1">
                <Skeleton className="h-6 w-11/12 bg-slate-700/15 rounded-sm" />
                {Math.random() > 0.5 && (
                  <Skeleton className="h-6 w-4/5 bg-slate-700/15 rounded-sm" />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
