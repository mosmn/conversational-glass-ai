"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Palette, Type, Keyboard, BarChart3, Crown } from "lucide-react";
import { UserProfileSection } from "@/components/settings/customize/UserProfileSection";
import { PlanUsageSection } from "@/components/settings/customize/PlanUsageSection";

export default function CustomizePage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Customize</h1>
        <p className="text-slate-400">
          Personalize your Convo Glass AI experience with custom settings,
          themes, and preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Profile Section */}
        <UserProfileSection />

        {/* Plan & Usage Section */}
        <PlanUsageSection />

        {/* AI Personalization Section */}
        <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              AI Personalization
            </CardTitle>
            <CardDescription className="text-slate-400">
              Customize how Convo Glass AI interacts with you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-300">
              AI personalization coming soon...
            </div>
          </CardContent>
        </Card>

        {/* Visual Customization Section */}
        <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Palette className="h-5 w-5 text-purple-400" />
              Visual Customization
            </CardTitle>
            <CardDescription className="text-slate-400">
              Customize the visual appearance and theme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-300">
              Visual options coming soon...
            </div>
          </CardContent>
        </Card>

        {/* Font Customization Section */}
        <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Type className="h-5 w-5 text-green-400" />
              Font Customization
            </CardTitle>
            <CardDescription className="text-slate-400">
              Choose your preferred fonts for text and code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-300">
              Font selection coming soon...
            </div>
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts Section */}
        <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Keyboard className="h-5 w-5 text-cyan-400" />
              Keyboard Shortcuts
            </CardTitle>
            <CardDescription className="text-slate-400">
              Configure keyboard shortcuts and accessibility options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-300">
              Keyboard shortcuts coming soon...
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
