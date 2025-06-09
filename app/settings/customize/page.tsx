"use client";

import React from "react";
import { UserProfileSection } from "@/components/settings/customize/UserProfileSection";
import { PlanUsageSection } from "@/components/settings/customize/PlanUsageSection";
import { AIPersonalizationSection } from "@/components/settings/customize/AIPersonalizationSection";
import { VisualCustomizationSection } from "@/components/settings/customize/VisualCustomizationSection";
import { FontCustomizationSection } from "@/components/settings/customize/FontCustomizationSection";
import { KeyboardShortcutsSection } from "@/components/settings/customize/KeyboardShortcutsSection";

export default function CustomizePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-8 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Customize Settings
          </h1>
        </div>
        <p className="text-slate-400 text-lg leading-relaxed max-w-3xl">
          Personalize your Conversational Glass AI experience with custom
          preferences, AI behavior settings, and visual customization options.
        </p>
      </div>

      {/* Profile & Usage Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <UserProfileSection />
        <PlanUsageSection />
      </div>

      {/* AI Personalization Section */}
      <div className="mb-8">
        <AIPersonalizationSection />
      </div>

      {/* Visual Customization Section */}
      <div className="mb-8">
        <VisualCustomizationSection />
      </div>

      {/* Font & Shortcuts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        <FontCustomizationSection />
        <KeyboardShortcutsSection />
      </div>
    </div>
  );
}
