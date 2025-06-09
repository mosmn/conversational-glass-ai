"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
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
import { useToast } from "@/hooks/use-toast";
import { User, Copy, Check, ExternalLink } from "lucide-react";
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
      <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <User className="h-5 w-5 text-emerald-400" />
            User Profile
          </CardTitle>
          <CardDescription className="text-slate-400">
            Manage your profile information and account details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-slate-700 rounded-full"></div>
              <div className="space-y-2">
                <div className="w-32 h-4 bg-slate-700 rounded"></div>
                <div className="w-48 h-3 bg-slate-700 rounded"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="w-20 h-4 bg-slate-700 rounded"></div>
              <div className="w-full h-10 bg-slate-700 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profileData) {
    return (
      <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <User className="h-5 w-5 text-emerald-400" />
            User Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-400">
            Failed to load profile data. Please refresh the page.
          </div>
        </CardContent>
      </Card>
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
    <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <User className="h-5 w-5 text-emerald-400" />
          User Profile
        </CardTitle>
        <CardDescription className="text-slate-400">
          Manage your profile information and account details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Avatar & Basic Info */}
        <div className="flex items-center space-x-4">
          <Avatar className="w-16 h-16 border-2 border-slate-600">
            <AvatarImage
              src={profileData.imageUrl || undefined}
              alt={profileData.fullName}
            />
            <AvatarFallback className="bg-emerald-600 text-white text-lg font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">
              {profileData.fullName || "User"}
            </h3>
            <p className="text-sm text-slate-400">{profileData.email}</p>
            <p className="text-xs text-slate-500">
              Member since{" "}
              {new Date(profileData.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* User ID Section */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-300">User ID</Label>
          <div className="flex items-center space-x-2">
            <Input
              value={profileData.clerkId}
              readOnly
              className="bg-slate-700/50 border-slate-600 text-slate-300 font-mono text-sm"
            />
            <Button
              onClick={copyUserId}
              variant="outline"
              size="sm"
              className={cn(
                "border-slate-600 hover:border-slate-500 transition-colors",
                isCopied
                  ? "text-emerald-400 border-emerald-500"
                  : "text-slate-400"
              )}
            >
              {isCopied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            This is your unique user identifier. Keep it safe.
          </p>
        </div>

        {/* Bio Section */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-300">Bio</Label>
          <Textarea
            value={profileData.bio || ""}
            readOnly
            placeholder="No bio added yet"
            className="bg-slate-700/50 border-slate-600 text-slate-300 resize-none"
            rows={3}
          />
          <p className="text-xs text-slate-500">
            Bio can be updated through your Clerk profile settings.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700">
          <div className="text-xs text-slate-500">Profile managed by Clerk</div>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-400 hover:text-white hover:border-slate-500"
            onClick={() => window.open("https://clerk.dev/account", "_blank")}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Manage Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
