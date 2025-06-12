"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchAndFilterProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

export function SearchAndFilter({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
}: SearchAndFilterProps) {
  return (
    <div className="flex-shrink-0 px-6 pb-4">
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-400 transition-colors duration-300" />
        <Input
          placeholder="🔍 Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 pr-12 h-12 bg-slate-700/30 border-slate-600/50 text-white placeholder-slate-500 focus:text-white rounded-xl backdrop-blur-sm focus:border-emerald-500/50 focus:bg-slate-700/50 transition-all duration-300 focus:shadow-lg focus:shadow-emerald-500/10"
        />
      </div>
    </div>
  );
}
