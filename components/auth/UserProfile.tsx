"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { User, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function UserProfile() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-white/10 rounded-full animate-pulse" />
        <div className="w-16 h-4 bg-white/10 rounded animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userInitials =
    user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user.emailAddresses[0]?.emailAddress[0].toUpperCase() || "U";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-10 w-auto px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300"
          >
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8 border-2 border-white/20">
                <AvatarImage
                  src={user.imageUrl}
                  alt={user.fullName || "User"}
                />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-medium text-white/90 truncate max-w-24">
                  {user.firstName ||
                    user.emailAddresses[0]?.emailAddress.split("@")[0]}
                </span>
                <span className="text-xs text-white/60">
                  {user.emailAddresses[0]?.emailAddress.length > 20
                    ? `${user.emailAddresses[0]?.emailAddress.substring(
                        0,
                        17
                      )}...`
                    : user.emailAddresses[0]?.emailAddress}
                </span>
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-64 bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl"
          align="end"
        >
          <DropdownMenuLabel className="text-white/90">
            <div className="flex items-center space-x-3 py-2">
              <Avatar className="h-10 w-10 border-2 border-white/20">
                <AvatarImage
                  src={user.imageUrl}
                  alt={user.fullName || "User"}
                />
                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold text-white">
                  {user.fullName || "User"}
                </span>
                <span className="text-sm text-white/60 font-normal">
                  {user.emailAddresses[0]?.emailAddress}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="bg-white/10" />

          <DropdownMenuItem
            className="text-white/80 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white rounded-lg mx-1 my-1"
            asChild
          >
            <Link href="/profile" className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              <span>Profile Settings</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem className="text-white/80 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:text-white rounded-lg mx-1 my-1">
            <Settings className="mr-2 h-4 w-4" />
            <span>Preferences</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-white/10" />

          <DropdownMenuItem
            asChild
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300 rounded-lg mx-1 my-1"
          >
            <SignOutButton>
              <button className="flex items-center w-full">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </SignOutButton>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
