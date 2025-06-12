"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, LogOut } from "lucide-react";
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

export function UserProfile() {
  const router = useRouter();
  const { user } = useUser();
  const personalization = usePersonalization();
  const visualPrefs = useVisualPreferences();

  return (
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
  );
}
