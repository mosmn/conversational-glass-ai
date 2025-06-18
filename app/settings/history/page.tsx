"use client";

import React, { useState } from "react";
import { HistoryOverview } from "@/components/settings/history/HistoryOverview";
import {
  ConversationSearch,
  type ConversationFilters,
} from "@/components/settings/history/ConversationSearch";
import { ImportExportSection } from "@/components/settings/history/ImportExportSection";
import { ConversationList } from "@/components/settings/history/ConversationList";
import { DangerZone } from "@/components/settings/history/DangerZone";
import { useDebounce } from "@/hooks/use-debounce";

export default function HistoryPage() {
  const [filters, setFilters] = useState<ConversationFilters>({
    sortBy: "updated",
    sortOrder: "desc",
  });
  const [isLoading, setIsLoading] = useState(false);

  // Debounce search query to avoid excessive API calls
  const debouncedFilters = useDebounce(filters, 300);

  const handleFiltersChange = (newFilters: ConversationFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 p-4 sm:p-6">
      {/* Page Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-3">
          <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            History Management
          </h1>
        </div>
        <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-3xl">
          Manage your conversation history, search through past chats, export
          your data, and sync across devices. Your conversations are securely
          stored and fully searchable.
        </p>
      </div>

      {/* Overview Section */}
      <div className="mb-6 sm:mb-8">
        <HistoryOverview />
      </div>

      {/* Search & Export Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
        <ConversationSearch
          filters={filters}
          onFiltersChange={handleFiltersChange}
          isLoading={isLoading}
        />
        <ImportExportSection />
      </div>

      {/* Conversation List Section */}
      <div className="mb-6 sm:mb-8">
        <ConversationList
          filters={debouncedFilters}
          isLoading={isLoading}
          onLoadingChange={setIsLoading}
        />
      </div>

      {/* Danger Zone Section */}
      <div className="mb-6 sm:mb-8">
        <DangerZone />
      </div>
    </div>
  );
}
