"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Calendar,
  Bot,
  Tag,
  SortAsc,
  SortDesc,
  X,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";

export interface ConversationFilters {
  searchQuery?: string;
  dateRange?: { start: Date; end: Date };
  models?: string[];
  tags?: string[];
  sortBy?: "date" | "title" | "messages" | "updated";
  sortOrder?: "asc" | "desc";
}

interface ConversationSearchProps {
  filters: ConversationFilters;
  onFiltersChange: (filters: ConversationFilters) => void;
  isLoading?: boolean;
}

export function ConversationSearch({
  filters,
  onFiltersChange,
  isLoading = false,
}: ConversationSearchProps) {
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    filters.dateRange?.start
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    filters.dateRange?.end
  );

  // Fetch available models and tags for filters
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [modelsResponse, tagsResponse] = await Promise.all([
          fetch("/api/conversations/filter-options?type=models"),
          fetch("/api/conversations/filter-options?type=tags"),
        ]);

        if (modelsResponse.ok) {
          const modelsData = await modelsResponse.json();
          setAvailableModels(modelsData.models || []);
        }

        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          setAvailableTags(tagsData.tags || []);
        }
      } catch (error) {
        console.error("Failed to fetch filter options:", error);
      }
    };

    fetchFilterOptions();
  }, []);

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      searchQuery: value || undefined,
    });
  };

  const handleModelToggle = (model: string, checked: boolean) => {
    const currentModels = filters.models || [];
    const newModels = checked
      ? [...currentModels, model]
      : currentModels.filter((m) => m !== model);

    onFiltersChange({
      ...filters,
      models: newModels.length > 0 ? newModels : undefined,
    });
  };

  const handleTagToggle = (tag: string, checked: boolean) => {
    const currentTags = filters.tags || [];
    const newTags = checked
      ? [...currentTags, tag]
      : currentTags.filter((t) => t !== tag);

    onFiltersChange({
      ...filters,
      tags: newTags.length > 0 ? newTags : undefined,
    });
  };

  const handleDateRangeChange = () => {
    if (dateFrom && dateTo) {
      onFiltersChange({
        ...filters,
        dateRange: { start: dateFrom, end: dateTo },
      });
    } else {
      onFiltersChange({
        ...filters,
        dateRange: undefined,
      });
      setDateFrom(undefined);
      setDateTo(undefined);
    }
  };

  const handleSortChange = (sortBy: ConversationFilters["sortBy"]) => {
    const newSortOrder =
      filters.sortBy === sortBy && filters.sortOrder === "desc"
        ? "asc"
        : "desc";
    onFiltersChange({
      ...filters,
      sortBy,
      sortOrder: newSortOrder,
    });
  };

  const clearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    onFiltersChange({
      searchQuery: undefined,
      dateRange: undefined,
      models: undefined,
      tags: undefined,
      sortBy: "updated",
      sortOrder: "desc",
    });
  };

  const hasActiveFilters = !!(
    filters.searchQuery ||
    filters.dateRange ||
    (filters.models && filters.models.length > 0) ||
    (filters.tags && filters.tags.length > 0)
  );

  const activeFilterCount = [
    filters.searchQuery,
    filters.dateRange,
    filters.models?.length,
    filters.tags?.length,
  ].filter(Boolean).length;

  const SortIcon = filters.sortOrder === "asc" ? SortAsc : SortDesc;

  return (
    <div className="relative group">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
      <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:border-blue-500/30 transition-colors">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <Search className="h-5 w-5 text-blue-400" />
              </div>
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Search & Filter
              </span>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="text-slate-400 hover:text-white"
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 bg-emerald-600 text-white"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search conversations and messages..."
              value={filters.searchQuery || ""}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-400"
              disabled={isLoading}
            />
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Sort by:</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300"
                >
                  {filters.sortBy === "date"
                    ? "Created"
                    : filters.sortBy === "title"
                    ? "Title"
                    : filters.sortBy === "messages"
                    ? "Messages"
                    : "Updated"}
                  <SortIcon className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="glass-dark border-slate-700">
                <DropdownMenuItem onClick={() => handleSortChange("updated")}>
                  Last Updated
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("date")}>
                  Created Date
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("title")}>
                  Title
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("messages")}>
                  Message Count
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-4 border-t border-slate-700/50"
            >
              {/* Date Range Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Range
                </label>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-700 text-slate-300"
                      >
                        {dateFrom ? dateFrom.toLocaleDateString() : "From"}
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="glass-dark border-slate-700 w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <span className="text-slate-400">to</span>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-700 text-slate-300"
                      >
                        {dateTo ? dateTo.toLocaleDateString() : "To"}
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="glass-dark border-slate-700 w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDateRangeChange}
                    disabled={!dateFrom || !dateTo}
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    Apply
                  </Button>
                </div>
              </div>

              {/* Model Filter */}
              {availableModels.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    AI Models
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableModels.map((model) => {
                      const isSelected =
                        filters.models?.includes(model) || false;
                      return (
                        <div
                          key={model}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`model-${model}`}
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleModelToggle(model, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={`model-${model}`}
                            className="text-sm text-slate-300 cursor-pointer"
                          >
                            {model}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tag Filter */}
              {availableTags.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => {
                      const isSelected = filters.tags?.includes(tag) || false;
                      return (
                        <div key={tag} className="flex items-center space-x-2">
                          <Checkbox
                            id={`tag-${tag}`}
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleTagToggle(tag, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={`tag-${tag}`}
                            className="text-sm text-slate-300 cursor-pointer"
                          >
                            {tag}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700/50">
              {filters.searchQuery && (
                <Badge
                  variant="secondary"
                  className="bg-emerald-600/20 text-emerald-300"
                >
                  Search: "{filters.searchQuery}"
                </Badge>
              )}
              {filters.dateRange && (
                <Badge
                  variant="secondary"
                  className="bg-blue-600/20 text-blue-300"
                >
                  {filters.dateRange.start.toLocaleDateString()} -{" "}
                  {filters.dateRange.end.toLocaleDateString()}
                </Badge>
              )}
              {filters.models?.map((model) => (
                <Badge
                  key={model}
                  variant="secondary"
                  className="bg-purple-600/20 text-purple-300"
                >
                  Model: {model}
                </Badge>
              ))}
              {filters.tags?.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-amber-600/20 text-amber-300"
                >
                  Tag: {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
