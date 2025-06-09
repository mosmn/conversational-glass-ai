"use client";

import React from "react";
import { UserProfileSection } from "@/components/settings/customize/UserProfileSection";
import { PlanUsageSection } from "@/components/settings/customize/PlanUsageSection";
import { AIPersonalizationSection } from "@/components/settings/customize/AIPersonalizationSection";
import { VisualCustomizationSection } from "@/components/settings/customize/VisualCustomizationSection";

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

      {/* Font Customization - Coming Soon */}
      <div className="p-8 bg-gradient-to-r from-slate-900/40 to-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-sm font-medium mb-4">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            Coming Soon
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Font Customization & Keyboard Shortcuts
          </h3>
          <p className="text-slate-400 mb-4 max-w-2xl mx-auto">
            We're working on font preferences with live preview, keyboard
            shortcut configuration, and additional customization options.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              "Font Selection",
              "Live Font Preview",
              "Keyboard Shortcuts",
              "Code Font Options",
              "Typography Settings",
            ].map((feature) => (
              <span
                key={feature}
                className="px-3 py-1 bg-slate-800/50 border border-slate-600/50 rounded-lg text-xs text-slate-400"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
