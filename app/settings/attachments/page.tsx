"use client";

import React from "react";
import { StorageUsageSection } from "@/components/settings/attachments/StorageUsageSection";
import { AttachmentHistorySection } from "@/components/settings/attachments/AttachmentHistorySection";
import { AttachmentPreferencesSection } from "@/components/settings/attachments/AttachmentPreferencesSection";
import { CleanupToolsSection } from "@/components/settings/attachments/CleanupToolsSection";

export default function AttachmentsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 p-4 sm:p-6">
      {/* Page Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-3">
          <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-gradient-to-b from-teal-500 to-cyan-500 rounded-full" />
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            Attachment Settings
          </h1>
        </div>
        <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-3xl">
          Manage your file attachments, storage usage, and organize your
          uploaded content with powerful cleanup tools and preferences.
        </p>
      </div>

      {/* Storage Overview & Preferences Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
        <StorageUsageSection />
        <AttachmentPreferencesSection />
      </div>

      {/* Attachment History Section */}
      <div className="mb-6 sm:mb-8">
        <AttachmentHistorySection />
      </div>

      {/* Cleanup Tools Section */}
      <div className="mb-6 sm:mb-8">
        <CleanupToolsSection />
      </div>
    </div>
  );
}
