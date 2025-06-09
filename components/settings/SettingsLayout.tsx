"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Settings,
  Sparkles,
  Shield,
  Crown,
} from "lucide-react";
import Link from "next/link";
import { SettingsNavigation } from "./SettingsNavigation";
import ConversationalGlassLogo, {
  ConversationalGlassLogoMini,
} from "@/components/ConversationalGlassLogo";

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Extract current section from pathname
  const currentSection = pathname.split("/")[2] || "customize";
  const sectionTitles: Record<string, string> = {
    customize: "Customize",
    history: "History",
    models: "Models",
    "api-keys": "API Keys",
    attachments: "Attachments",
  };

  const sectionDescriptions: Record<string, string> = {
    customize: "Personalize your AI experience",
    history: "Manage your conversation history",
    models: "Configure AI model preferences",
    "api-keys": "Manage your API keys",
    attachments: "Control file attachments",
  };

  const currentTitle = sectionTitles[currentSection] || "Settings";
  const currentDescription =
    sectionDescriptions[currentSection] || "Configure your settings";

  const userInitials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
          <div className="absolute top-0 -right-4 w-72 h-72 bg-teal-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
        </div>
      </div>

      <div className="flex h-screen relative z-10">
        {/* Settings Navigation Sidebar */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className={`${
            sidebarCollapsed ? "w-20" : "w-80"
          } flex-shrink-0 bg-slate-800/40 backdrop-blur-xl border-r border-slate-700/50 transition-all duration-300`}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                {!sidebarCollapsed ? (
                  <ConversationalGlassLogo
                    size="md"
                    animated={true}
                    showText={true}
                    className="flex-shrink-0"
                  />
                ) : (
                  <ConversationalGlassLogoMini className="flex-shrink-0 mx-auto" />
                )}
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-2">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/chat")}
                        className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </div>
                )}
              </div>

              {sidebarCollapsed && (
                <div className="mt-4 flex justify-center">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSidebarCollapsed(false)}
                      className="text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl w-12 h-12"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </div>
              )}
            </div>

            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="flex-1 flex flex-col"
                >
                  {/* Settings Header */}
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <motion.div
                        className="p-2 bg-emerald-500/20 rounded-xl"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 10,
                        }}
                      >
                        <Settings className="h-5 w-5 text-emerald-400" />
                      </motion.div>
                      <div>
                        <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                          Settings
                        </h2>
                        <p className="text-xs text-slate-400">
                          Customize your experience
                        </p>
                      </div>
                    </div>

                    {/* User Profile */}
                    {user && (
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-xl blur-sm opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="relative p-4 bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="w-12 h-12 border-2 border-emerald-500/30">
                                <AvatarImage
                                  src={user.imageUrl}
                                  alt={user.fullName || "User"}
                                />
                                <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white font-bold">
                                  {userInitials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-800 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-white truncate">
                                {user.fullName || "User"}
                              </div>
                              <div className="text-xs text-slate-400 truncate">
                                {user.primaryEmailAddress?.emailAddress}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10 text-xs px-2 py-0"
                                >
                                  <Shield className="h-2.5 w-2.5 mr-1" />
                                  Free
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation */}
                  <ScrollArea className="flex-1 px-4">
                    <SettingsNavigation currentSection={currentSection} />
                  </ScrollArea>

                  {/* Footer */}
                  <div className="p-4 border-t border-slate-700/50">
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800/30 border border-slate-700/50 rounded-xl text-slate-400 text-xs">
                        <Sparkles className="h-3 w-3" />
                        <span>Conversational Glass AI</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-xl relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5" />
            <div className="relative flex items-center justify-between px-6 py-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-8 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                      {currentTitle}
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                      {currentDescription}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm text-slate-300">Settings</div>
                  <div className="text-xs text-slate-500">
                    Conversational Glass
                  </div>
                </div>
              </div>
            </div>
          </motion.header>

          {/* Settings Content */}
          <main className="flex-1 overflow-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="relative min-h-full"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}
