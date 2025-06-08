"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  User,
  Settings,
  Bell,
  Shield,
  ArrowLeft,
  Save,
  Edit3,
  Camera,
  Calendar,
  Zap,
  Database,
  Palette,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import AuthGuard from "@/components/auth/AuthGuard";
import ConversationalGlassLogo from "@/components/ConversationalGlassLogo";
import {
  UserPreferences,
  getUserPreferences,
  saveUserPreferences,
} from "@/lib/user-preferences";

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  // User preferences state
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    getUserPreferences()
  );

  // Save preferences when they change
  useEffect(() => {
    saveUserPreferences(preferences);
  }, [preferences]);

  if (!isLoaded) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
          <div className="w-8 h-8 bg-white/20 rounded-full animate-pulse" />
        </div>
      </AuthGuard>
    );
  }

  const userInitials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.emailAddresses[0]?.emailAddress[0].toUpperCase() || "U";

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
        {/* Floating particles background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full"
              animate={{
                x: [0, Math.random() * 100 - 50],
                y: [0, Math.random() * 100 - 50],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

        <div className="relative z-10 container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-white/60 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <ConversationalGlassLogo
                size="sm"
                animated={false}
                showText={true}
              />
            </div>

            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 rounded-full px-4 py-1">
              ✨ Pro User
            </Badge>
          </motion.div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-1"
            >
              <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white rounded-3xl overflow-hidden">
                <CardContent className="p-6 text-center">
                  <div className="relative mb-6">
                    <Avatar className="w-24 h-24 mx-auto border-4 border-white/20">
                      <AvatarImage
                        src={user?.imageUrl}
                        alt={user?.fullName || "User"}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-2xl font-bold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-2 border-white/20"
                    >
                      <Camera className="w-4 h-4" />
                    </Button>
                  </div>

                  <h2 className="text-xl font-bold mb-2 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                    {user?.fullName || "Anonymous User"}
                  </h2>
                  <p className="text-white/60 text-sm mb-6">
                    {user?.emailAddresses[0]?.emailAddress}
                  </p>

                  <div className="space-y-3 text-left">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-white/40" />
                      <span className="text-white/80">
                        Joined{" "}
                        {new Date(
                          user?.createdAt || Date.now()
                        ).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-white/80">247 conversations</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Database className="w-4 h-4 text-blue-400" />
                      <span className="text-white/80">12.4k messages sent</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Settings Tabs */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-3"
            >
              <Tabs defaultValue="profile" className="space-y-6">
                <TabsList className="bg-white/10 backdrop-blur-xl border border-white/20 p-1 rounded-2xl grid grid-cols-4 w-full">
                  <TabsTrigger
                    value="profile"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-xl transition-all duration-300"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger
                    value="preferences"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-xl transition-all duration-300"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </TabsTrigger>
                  <TabsTrigger
                    value="notifications"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-xl transition-all duration-300"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Notifications
                  </TabsTrigger>
                  <TabsTrigger
                    value="privacy"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60 rounded-xl transition-all duration-300"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Privacy
                  </TabsTrigger>
                </TabsList>

                {/* Profile Tab */}
                <TabsContent value="profile" className="space-y-6">
                  <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white rounded-3xl">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-white">
                        Personal Information
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(!isEditing)}
                        className="text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl"
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        {isEditing ? "Cancel" : "Edit"}
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-white/80">First Name</Label>
                          <Input
                            value={user?.firstName || ""}
                            disabled={!isEditing}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-white/80">Last Name</Label>
                          <Input
                            value={user?.lastName || ""}
                            disabled={!isEditing}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl mt-1"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-white/80">Email Address</Label>
                        <Input
                          value={user?.emailAddresses[0]?.emailAddress || ""}
                          disabled
                          className="bg-white/5 border-white/10 text-white/60 rounded-xl mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-white/80">Bio</Label>
                        <Textarea
                          placeholder="Tell us about yourself..."
                          disabled={!isEditing}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none rounded-xl mt-1"
                          rows={3}
                        />
                      </div>

                      {isEditing && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-3 pt-4"
                        >
                          <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl">
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setIsEditing(false)}
                            className="text-white/60 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl"
                          >
                            Cancel
                          </Button>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Preferences Tab */}
                <TabsContent value="preferences" className="space-y-6">
                  <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white rounded-3xl">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Palette className="w-5 h-5" />
                        Appearance & AI Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">Dark Mode</h4>
                          <p className="text-white/60 text-sm">
                            Use dark theme across the application
                          </p>
                        </div>
                        <Switch
                          checked={preferences.appearance.theme === "dark"}
                          onCheckedChange={(checked) =>
                            setPreferences((prev) => ({
                              ...prev,
                              appearance: {
                                ...prev.appearance,
                                theme: checked ? "dark" : "light",
                              },
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">Animations</h4>
                          <p className="text-white/60 text-sm">
                            Enable smooth animations and transitions
                          </p>
                        </div>
                        <Switch
                          checked={preferences.appearance.animations}
                          onCheckedChange={(checked) =>
                            setPreferences((prev) => ({
                              ...prev,
                              appearance: {
                                ...prev.appearance,
                                animations: checked,
                              },
                            }))
                          }
                        />
                      </div>

                      <div>
                        <Label className="text-white/80">
                          Default AI Model
                        </Label>
                        <select
                          value={preferences.ai.defaultModel}
                          onChange={(e) =>
                            setPreferences((prev) => ({
                              ...prev,
                              ai: {
                                ...prev.ai,
                                defaultModel: e.target.value as
                                  | "gpt-4"
                                  | "claude"
                                  | "gemini",
                              },
                            }))
                          }
                          className="w-full mt-2 bg-white/10 border border-white/20 text-white rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                        >
                          <option value="gpt-4" className="bg-black">
                            GPT-4 (Analytical Genius)
                          </option>
                          <option value="claude" className="bg-black">
                            Claude (Creative Virtuoso)
                          </option>
                          <option value="gemini" className="bg-black">
                            Gemini (Futuristic Innovator)
                          </option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">
                            Streaming Mode
                          </h4>
                          <p className="text-white/60 text-sm">
                            Show AI responses as they're generated
                          </p>
                        </div>
                        <Switch
                          checked={preferences.ai.streamingMode}
                          onCheckedChange={(checked) =>
                            setPreferences((prev) => ({
                              ...prev,
                              ai: { ...prev.ai, streamingMode: checked },
                            }))
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Notifications Tab */}
                <TabsContent value="notifications" className="space-y-6">
                  <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white rounded-3xl">
                    <CardHeader>
                      <CardTitle className="text-white">
                        Notification Preferences
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">
                            Email Notifications
                          </h4>
                          <p className="text-white/60 text-sm">
                            Receive updates via email
                          </p>
                        </div>
                        <Switch
                          checked={preferences.notifications.email}
                          onCheckedChange={(checked) =>
                            setPreferences((prev) => ({
                              ...prev,
                              notifications: {
                                ...prev.notifications,
                                email: checked,
                              },
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">
                            Push Notifications
                          </h4>
                          <p className="text-white/60 text-sm">
                            Get notified on your devices
                          </p>
                        </div>
                        <Switch
                          checked={preferences.notifications.push}
                          onCheckedChange={(checked) =>
                            setPreferences((prev) => ({
                              ...prev,
                              notifications: {
                                ...prev.notifications,
                                push: checked,
                              },
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">
                            Marketing Communications
                          </h4>
                          <p className="text-white/60 text-sm">
                            Product updates and tips
                          </p>
                        </div>
                        <Switch
                          checked={preferences.notifications.marketing}
                          onCheckedChange={(checked) =>
                            setPreferences((prev) => ({
                              ...prev,
                              notifications: {
                                ...prev.notifications,
                                marketing: checked,
                              },
                            }))
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Privacy Tab */}
                <TabsContent value="privacy" className="space-y-6">
                  <Card className="bg-white/10 backdrop-blur-xl border-white/20 text-white rounded-3xl">
                    <CardHeader>
                      <CardTitle className="text-white">
                        Privacy & Security
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">
                            Public Profile
                          </h4>
                          <p className="text-white/60 text-sm">
                            Allow others to find your profile
                          </p>
                        </div>
                        <Switch
                          checked={preferences.privacy.publicProfile}
                          onCheckedChange={(checked) =>
                            setPreferences((prev) => ({
                              ...prev,
                              privacy: {
                                ...prev.privacy,
                                publicProfile: checked,
                              },
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">
                            Show Activity Status
                          </h4>
                          <p className="text-white/60 text-sm">
                            Let others see when you're online
                          </p>
                        </div>
                        <Switch
                          checked={preferences.privacy.showActivity}
                          onCheckedChange={(checked) =>
                            setPreferences((prev) => ({
                              ...prev,
                              privacy: {
                                ...prev.privacy,
                                showActivity: checked,
                              },
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">
                            Analytics & Data Collection
                          </h4>
                          <p className="text-white/60 text-sm">
                            Help improve our services
                          </p>
                        </div>
                        <Switch
                          checked={preferences.privacy.dataCollection}
                          onCheckedChange={(checked) =>
                            setPreferences((prev) => ({
                              ...prev,
                              privacy: {
                                ...prev.privacy,
                                dataCollection: checked,
                              },
                            }))
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-red-900/20 backdrop-blur-xl border-red-500/20 text-white rounded-3xl">
                    <CardHeader>
                      <CardTitle className="text-red-400">
                        Danger Zone
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-medium">
                            Delete Account
                          </h4>
                          <p className="text-white/60 text-sm">
                            Permanently delete your account and all data
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Account
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
