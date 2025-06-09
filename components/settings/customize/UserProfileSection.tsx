"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  Mail,
  Shield,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserProfileData {
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  imageUrl: string | null;
  bio: string | null;
  createdAt: string;
}

export function UserProfileSection() {
  const { user } = useUser();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  // Fetch user profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const response = await fetch("/api/user/profile");
        const result = await response.json();

        if (result.success) {
          setProfileData(result.data);
        } else {
          toast({
            title: "Error",
            description: "Failed to load profile data",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchProfileData();
    }
  }, [user, toast]);

  const copyUserId = async () => {
    if (!profileData?.clerkId) return;

    try {
      await navigator.clipboard.writeText(profileData.clerkId);
      setIsCopied(true);
      toast({
        title: "Copied!",
        description: "User ID copied to clipboard",
      });

      // Reset copied state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy User ID",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-emerald-500/20 rounded-xl">
                <User className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                User Profile
              </span>
            </CardTitle>
            <CardDescription className="text-slate-400 leading-relaxed">
              Manage your profile information and account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl"></div>
                <div className="space-y-3 flex-1">
                  <div className="w-40 h-5 bg-slate-700 rounded-lg"></div>
                  <div className="w-60 h-4 bg-slate-700 rounded-lg"></div>
                  <div className="w-32 h-3 bg-slate-700 rounded-lg"></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="w-24 h-4 bg-slate-700 rounded-lg"></div>
                <div className="w-full h-12 bg-slate-700 rounded-xl"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (!profileData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-orange-600/20 rounded-2xl blur-xl opacity-70" />
        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-red-500/20 rounded-xl">
                <User className="h-5 w-5 text-red-400" />
              </div>
              User Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-400 text-center py-8">
              <div className="mb-4">⚠️</div>
              Failed to load profile data. Please refresh the page.
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const userInitials = profileData.fullName
    ? profileData.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : profileData.email[0].toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative group"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />

      <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 hover:border-emerald-500/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-white">
            <motion.div
              className="p-2 bg-emerald-500/20 rounded-xl"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <User className="h-5 w-5 text-emerald-400" />
            </motion.div>
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent font-semibold">
              User Profile
            </span>
          </CardTitle>
          <CardDescription className="text-slate-400 leading-relaxed">
            Manage your profile information and account details
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* Profile Header */}
          <motion.div
            className="flex items-center space-x-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="relative">
              <Avatar className="w-20 h-20 border-2 border-emerald-500/30 shadow-2xl">
                <AvatarImage
                  src={profileData.imageUrl || undefined}
                  alt={profileData.fullName}
                />
                <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white text-xl font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <h3 className="text-xl font-bold text-white">
                {profileData.fullName || "User"}
              </h3>
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="h-4 w-4" />
                <span className="text-sm">{profileData.email}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Joined{" "}
                    {new Date(profileData.createdAt).toLocaleDateString(
                      "en-US",
                      { month: "short", year: "numeric" }
                    )}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                >
                  <Shield className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              </div>
            </div>
          </motion.div>

          {/* User ID Section */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              Unique User ID
            </Label>
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative group">
                <Input
                  value={profileData.clerkId}
                  readOnly
                  className="bg-slate-800/50 border-slate-600/50 text-slate-300 font-mono text-sm rounded-xl pr-12 group-hover:border-emerald-500/50 transition-colors"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                  ID
                </div>
              </div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={copyUserId}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "border-slate-600/50 hover:border-emerald-500/50 transition-all duration-300 rounded-xl px-4",
                    isCopied
                      ? "text-emerald-400 border-emerald-500/50 bg-emerald-500/10"
                      : "text-slate-400 hover:text-emerald-400"
                  )}
                >
                  <AnimatePresence mode="wait">
                    {isCopied ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 180 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 15,
                        }}
                        className="flex items-center gap-2"
                      >
                        <Check className="h-4 w-4" />
                        <span>Copied!</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ scale: 0, rotate: 180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: -180 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 15,
                        }}
                        className="flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        <span>Copy</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              This is your unique identifier across the platform. Keep it secure
              and use it for API access or support requests.
            </p>
          </motion.div>

          {/* Bio Section */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Label className="text-sm font-semibold text-slate-300">Bio</Label>
            <Textarea
              value={profileData.bio || ""}
              readOnly
              placeholder="No bio added yet. Click 'Manage Profile' to add one."
              className="bg-slate-800/30 border-slate-600/50 text-slate-300 resize-none rounded-xl min-h-[80px] placeholder:text-slate-500"
              rows={3}
            />
            <p className="text-xs text-slate-500">
              Bio can be updated through your Clerk profile settings.
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            className="flex items-center justify-between pt-6 border-t border-slate-700/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Shield className="h-3 w-3" />
              <span>Profile managed by Clerk</span>
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600/50 text-slate-400 hover:text-white hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all duration-300 rounded-xl"
                onClick={() =>
                  window.open("https://clerk.dev/account", "_blank")
                }
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage Profile
              </Button>
            </motion.div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
