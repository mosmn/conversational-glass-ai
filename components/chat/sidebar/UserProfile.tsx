"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  usePersonalization,
  useVisualPreferences,
} from "@/hooks/useUserPreferences";
import "@/styles/clerk-auth.css";

export function UserProfile() {
  const router = useRouter();
  const { user } = useUser();
  const personalization = usePersonalization();
  const visualPrefs = useVisualPreferences();

  return (
    <div className="flex-shrink-0 p-4 border-t border-slate-700/30">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start p-3 hover:bg-slate-800/40 transition-colors duration-200"
          >
            <Avatar className="h-9 w-9 mr-3 ring-2 ring-slate-600/50">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="bg-slate-700">
                {user?.firstName?.[0] ||
                  user?.emailAddresses?.[0]?.emailAddress?.[0] ||
                  "U"}
              </AvatarFallback>
            </Avatar>
            <div className="text-left flex-1 overflow-hidden">
              <div
                className="text-sm font-medium truncate"
                data-personal-info={visualPrefs.hidePersonalInfo}
              >
                {personalization.displayName ||
                  user?.fullName ||
                  user?.emailAddresses?.[0]?.emailAddress ||
                  "User"}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                Free Plan
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={() => router.push("/settings/customize")}
            className="hover:bg-slate-800/40"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span className="flex-1">Settings</span>
            <kbd className="text-xs text-slate-500 bg-slate-800/40 px-1.5 py-0.5 rounded">
              ⌘,
            </kbd>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <SignOutButton>
              <button className="flex items-center w-full text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors duration-200">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </button>
            </SignOutButton>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
