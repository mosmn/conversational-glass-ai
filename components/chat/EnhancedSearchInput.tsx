import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Clock,
  TrendingUp,
  X,
  ArrowRight,
  Sparkles,
  History,
  Lightbulb,
} from "lucide-react";
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
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Combine all suggestions
  const allSuggestions = [
    ...recentSearches.slice(0, 3),
    ...suggestions.slice(0, 5),
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < allSuggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0) {
            const suggestion = allSuggestions[selectedIndex];
            onChange(suggestion.query);
            onSearch(suggestion.query);
            setIsOpen(false);
            setSelectedIndex(-1);
          } else if (value.trim()) {
            onSearch(value.trim());
            setIsOpen(false);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setSelectedIndex(-1);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, allSuggestions, value, onChange, onSearch]);

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    setSelectedIndex(-1);
    if (newValue.trim() && !isOpen) {
      setIsOpen(true);
    } else if (!newValue.trim()) {
      setIsOpen(false);
    }
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    onChange(suggestion.query);
    onSearch(suggestion.query);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const getSuggestionIcon = (type: SearchSuggestion["type"]) => {
    switch (type) {
      case "history":
        return <History className="h-4 w-4 text-slate-400" />;
      case "trending":
        return <TrendingUp className="h-4 w-4 text-orange-400" />;
      case "suggestion":
        return <Lightbulb className="h-4 w-4 text-blue-400" />;
      default:
        return <Search className="h-4 w-4 text-slate-400" />;
    }
  };

  const getSuggestionLabel = (type: SearchSuggestion["type"]) => {
    switch (type) {
      case "history":
        return "Recent";
      case "trending":
        return "Trending";
      case "suggestion":
        return "Suggested";
      default:
        return "";
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => {
                if (value.trim() || allSuggestions.length > 0) {
                  setIsOpen(true);
                }
              }}
              placeholder={placeholder}
              className="pl-10 pr-20 bg-slate-700/30 border-slate-600/50 focus:border-blue-500/50 focus:bg-slate-700/50 transition-all duration-300"
              disabled={isLoading}
            />

            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {value && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onChange("");
                    onClear();
                    setIsOpen(false);
                  }}
                  className="h-6 w-6 p-0 hover:bg-slate-600/50"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (value.trim()) {
                    onSearch(value.trim());
                    setIsOpen(false);
                  }
                }}
                disabled={!value.trim() || isLoading}
                className="h-6 w-6 p-0 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-400 border-t-transparent" />
                ) : (
                  <ArrowRight className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="w-[400px] p-0 bg-slate-800/95 border-slate-700/50 backdrop-blur-sm"
          align="start"
          side="bottom"
        >
          <Command className="bg-transparent">
            <CommandList>
              {allSuggestions.length === 0 ? (
                <CommandEmpty className="py-6 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <Sparkles className="h-8 w-8 text-slate-500" />
                    <p>No suggestions available</p>
                    <p className="text-xs">Start typing to search the web</p>
                  </div>
                </CommandEmpty>
              ) : (
                <>
                  {recentSearches.length > 0 && (
                    <CommandGroup heading="Recent Searches">
                      {recentSearches.slice(0, 3).map((suggestion, index) => (
                        <CommandItem
                          key={suggestion.id}
                          value={suggestion.query}
                          onSelect={() => handleSuggestionSelect(suggestion)}
                          className={cn(
                            "flex items-center justify-between p-3 cursor-pointer",
                            selectedIndex === index && "bg-slate-700/50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {getSuggestionIcon(suggestion.type)}
                            <div className="flex-1">
                              <span className="text-slate-200">
                                {suggestion.query}
                              </span>
                              {suggestion.timestamp && (
                                <div className="text-xs text-slate-400 mt-0.5">
                                  {new Date(
                                    suggestion.timestamp
                                  ).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-xs px-2 py-1"
                          >
                            {getSuggestionLabel(suggestion.type)}
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {suggestions.length > 0 && (
                    <CommandGroup heading="Suggestions">
                      {suggestions.slice(0, 5).map((suggestion, index) => {
                        const adjustedIndex =
                          index + recentSearches.slice(0, 3).length;
                        return (
                          <CommandItem
                            key={suggestion.id}
                            value={suggestion.query}
                            onSelect={() => handleSuggestionSelect(suggestion)}
                            className={cn(
                              "flex items-center justify-between p-3 cursor-pointer",
                              selectedIndex === adjustedIndex &&
                                "bg-slate-700/50"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              {getSuggestionIcon(suggestion.type)}
                              <span className="text-slate-200">
                                {suggestion.query}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {suggestion.count && (
                                <span className="text-xs text-slate-400">
                                  {suggestion.count} results
                                </span>
                              )}
                              <Badge
                                variant="outline"
                                className="text-xs px-2 py-1"
                              >
                                {getSuggestionLabel(suggestion.type)}
                              </Badge>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>

          {/* Quick Actions */}
          <div className="border-t border-slate-700/50 p-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Press Enter to search</span>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-slate-700/50 rounded text-xs">
                  ↑↓
                </kbd>
                <span>navigate</span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
