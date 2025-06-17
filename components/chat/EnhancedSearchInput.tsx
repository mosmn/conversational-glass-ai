import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, X, Clock, TrendingUp, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchSuggestion {
  id: string;
  query: string;
  type: "history" | "suggestion" | "trending";
  count?: number;
  timestamp?: string;
}

interface EnhancedSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  onClear: () => void;
  suggestions?: SearchSuggestion[];
  recentSearches?: SearchSuggestion[];
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export function EnhancedSearchInput({
  value,
  onChange,
  onSearch,
  onClear,
  suggestions = [],
  recentSearches = [],
  isLoading = false,
  placeholder = "Search the web...",
  className,
}: EnhancedSearchInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Combine all suggestions
  const allSuggestions = [
    ...(recentSearches || []).slice(0, 3),
    ...(suggestions || []).slice(0, 5),
  ].filter(Boolean);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (newValue.trim()) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
    setSelectedIndex(-1);
  };

  // Handle search submission
  const handleSearch = (query?: string) => {
    const searchQuery = query || value.trim();
    if (searchQuery) {
      onSearch(searchQuery);
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  // Handle key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || allSuggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < allSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : allSuggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < allSuggestions.length) {
          handleSearch(allSuggestions[selectedIndex].query);
        } else {
          handleSearch();
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onChange(suggestion.query);
    handleSearch(suggestion.query);
  };

  // Clear input
  const handleClear = () => {
    onChange("");
    onClear();
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "history":
        return <Clock className="h-3 w-3 text-slate-500" />;
      case "trending":
        return <TrendingUp className="h-3 w-3 text-blue-400" />;
      default:
        return <Search className="h-3 w-3 text-slate-500" />;
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />

        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (value.trim() || allSuggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          className="pl-10 pr-20 bg-slate-700/30 border-slate-600/50 text-white placeholder-slate-400 focus:border-blue-500/50 focus:bg-slate-700/50"
          disabled={isLoading}
        />

        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {value && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 w-6 p-0 text-slate-400 hover:text-white"
              disabled={isLoading}
            >
              <X className="h-3 w-3" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSearch()}
            className="h-6 w-6 p-0 text-slate-400 hover:text-blue-400"
            disabled={isLoading || !value.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ArrowUp className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && allSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800/95 border border-slate-700/50 rounded-lg shadow-lg backdrop-blur-sm z-50 max-h-60 overflow-hidden">
          <ScrollArea className="max-h-60">
            <div className="p-2">
              {recentSearches.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-slate-400 px-2 py-1 mb-1">
                    Recent Searches
                  </div>
                  {recentSearches.slice(0, 3).map((suggestion, index) => {
                    const globalIndex = index;
                    return (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left rounded transition-colors",
                          selectedIndex === globalIndex
                            ? "bg-blue-500/20 text-blue-300"
                            : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                        )}
                      >
                        {getSuggestionIcon(suggestion.type)}
                        <span className="flex-1 truncate">
                          {suggestion.query}
                        </span>
                        {suggestion.timestamp && (
                          <span className="text-xs text-slate-500">
                            {new Date(
                              suggestion.timestamp
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {suggestions.length > 0 && (
                <div>
                  {recentSearches.length > 0 && (
                    <div className="h-px bg-slate-700/50 my-2" />
                  )}
                  <div className="text-xs font-medium text-slate-400 px-2 py-1 mb-1">
                    Suggestions
                  </div>
                  {suggestions.slice(0, 5).map((suggestion, index) => {
                    const globalIndex = recentSearches.length + index;
                    return (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 text-sm text-left rounded transition-colors",
                          selectedIndex === globalIndex
                            ? "bg-blue-500/20 text-blue-300"
                            : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                        )}
                      >
                        {getSuggestionIcon(suggestion.type)}
                        <span className="flex-1 truncate">
                          {suggestion.query}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
