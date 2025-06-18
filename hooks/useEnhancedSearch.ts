import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface SearchSettings {
  maxResults: number;
  language: string;
  region: string;
  dateFilter: "all" | "day" | "week" | "month" | "year";
  safeSearch: "strict" | "moderate" | "off";
  includeImages: boolean;
  includeVideos: boolean;
  provider: "auto" | "tavily" | "serper" | "brave";
  searchType: "general" | "news" | "academic" | "shopping";
}

interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  domain: string;
  publishedDate?: string;
  score: number;
  favicon?: string;
  metadata?: {
    provider: string;
    position: number;
    language?: string;
  };
}

interface SearchResponse {
  results: SearchResult[];
  query: string;
  provider: string;
  totalResults: number;
  processingTime: number;
  suggestions?: string[];
  relatedQueries?: string[];
}

interface SearchSuggestion {
  id: string;
  query: string;
  type: "history" | "suggestion" | "trending";
  count?: number;
  timestamp?: string;
}

interface UseEnhancedSearchProps {
  onSearchComplete?: (results: SearchResult[], query: string) => void;
  onError?: (error: string) => void;
}

const DEFAULT_SETTINGS: SearchSettings = {
  maxResults: 10,
  language: "en",
  region: "us",
  dateFilter: "all",
  safeSearch: "moderate",
  includeImages: false,
  includeVideos: false,
  provider: "auto",
  searchType: "general",
};

export function useEnhancedSearch({
  onSearchComplete,
  onError,
}: UseEnhancedSearchProps = {}) {
  const { toast } = useToast();

  // State management
  const [settings, setSettings] = useState<SearchSettings>(DEFAULT_SETTINGS);
  const [isSearching, setIsSearching] = useState(false);
  const [currentResults, setCurrentResults] = useState<SearchResult[]>([]);
  const [currentQuery, setCurrentQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<SearchSuggestion[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [availableProviders, setAvailableProviders] = useState<any[]>([]);
  const [showResultsPreview, setShowResultsPreview] = useState(false);

  // Load settings and history from localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem("search-settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }

      const savedHistory = localStorage.getItem("search-history");
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        setSearchHistory(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.warn("Failed to load search settings or history:", error);
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("search-settings", JSON.stringify(settings));
    } catch (error) {
      console.warn("Failed to save search settings:", error);
    }
  }, [settings]);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("search-history", JSON.stringify(searchHistory));
    } catch (error) {
      console.warn("Failed to save search history:", error);
    }
  }, [searchHistory]);

  // Fetch available providers
  useEffect(() => {
    fetchAvailableProviders();
  }, []);

  const fetchAvailableProviders = async () => {
    try {
      const response = await fetch("/api/search?action=providers");
      if (response.ok) {
        const data = await response.json();
        setAvailableProviders(data.data?.providers || []);
      }
    } catch (error) {
      console.warn("Failed to fetch search providers:", error);
      setAvailableProviders([]);
    }
  };

  const performSearch = useCallback(
    async (query: string, customSettings?: Partial<SearchSettings>) => {
      if (!query.trim()) {
        toast({
          title: "Empty Query",
          description: "Please enter a search query.",
          variant: "destructive",
        });
        return;
      }

      const searchSettings = { ...settings, ...customSettings };
      setIsSearching(true);
      setCurrentQuery(query);
      setCurrentResults([]);

      try {
        const searchResponse = await fetch("/api/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: query.trim(),
            maxResults: searchSettings.maxResults,
            language: searchSettings.language,
            region: searchSettings.region,
            dateFilter: searchSettings.dateFilter,
            safeSearch: searchSettings.safeSearch,
            includeImages: searchSettings.includeImages,
            includeVideos: searchSettings.includeVideos,
            provider:
              searchSettings.provider === "auto"
                ? undefined
                : searchSettings.provider,
            searchType: searchSettings.searchType,
          }),
        });

        if (!searchResponse.ok) {
          // Handle rate limiting specifically
          if (searchResponse.status === 429) {
            const errorData = await searchResponse.json();
            const retryAfter = errorData.retryAfter || 60;
            toast({
              title: "Search Rate Limit Exceeded",
              description: `Too many searches. Please wait ${retryAfter} seconds before searching again.`,
              variant: "destructive",
            });
            throw new Error(`Rate limited: ${errorData.message}`);
          }

          throw new Error(
            `Search failed: ${searchResponse.status} ${searchResponse.statusText}`
          );
        }

        const searchData = await searchResponse.json();

        if (searchData.success && searchData.data?.results) {
          const results = searchData.data.results || [];
          setCurrentResults(results);

          if (results.length > 0) {
            setShowResultsPreview(true);

            // Update search history
            const historyEntry: SearchSuggestion = {
              id: `history_${Date.now()}`,
              query: query.trim(),
              type: "history",
              timestamp: new Date().toISOString(),
              count: results.length,
            };

            setSearchHistory((prev) => [
              historyEntry,
              ...prev.filter((item) => item.query !== query.trim()).slice(0, 9),
            ]);

            // Update suggestions if available
            if (searchData.data.suggestions) {
              const newSuggestions = searchData.data.suggestions.map(
                (suggestion: string, index: number) => ({
                  id: `suggestion_${Date.now()}_${index}`,
                  query: suggestion,
                  type: "suggestion" as const,
                })
              );
              setSuggestions(newSuggestions);
            }

            toast({
              title: "🔍 Search Complete",
              description: `Found ${results.length} results for "${query}"`,
            });
          } else {
            toast({
              title: "No Results Found",
              description: "No results found for your search query.",
              variant: "destructive",
            });
            setShowResultsPreview(false);
          }
        } else {
          throw new Error(
            searchData.error || "Search failed - no results returned"
          );
        }
      } catch (error) {
        console.error("Search error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Search failed";

        toast({
          title: "🔍 Search Failed",
          description: errorMessage,
          variant: "destructive",
        });

        if (onError) {
          onError(errorMessage);
        }

        setCurrentResults([]);
        setShowResultsPreview(false);
      } finally {
        setIsSearching(false);
      }
    },
    [settings, toast, onError]
  );

  const updateSettings = useCallback((newSettings: SearchSettings) => {
    setSettings(newSettings);
  }, []);

  const useSelectedResults = useCallback(
    (selectedResults: SearchResult[]) => {
      if (onSearchComplete && selectedResults.length > 0) {
        onSearchComplete(selectedResults, currentQuery);
      }
      setShowResultsPreview(false);
      setCurrentResults([]);
    },
    [onSearchComplete, currentQuery]
  );

  const useAllResults = useCallback(() => {
    if (onSearchComplete && currentResults.length > 0) {
      onSearchComplete(currentResults, currentQuery);
    }
    setShowResultsPreview(false);
    setCurrentResults([]);
  }, [onSearchComplete, currentResults, currentQuery]);

  const cancelSearch = useCallback(() => {
    setIsSearching(false);
    setShowResultsPreview(false);
    setCurrentResults([]);
    setCurrentQuery("");
  }, []);

  const refineSearch = useCallback(
    (newQuery: string) => {
      setShowResultsPreview(false);
      performSearch(newQuery);
    },
    [performSearch]
  );

  return {
    // State
    settings,
    isSearching,
    currentResults,
    currentQuery,
    searchHistory,
    suggestions,
    availableProviders,
    showResultsPreview,

    // Actions
    performSearch,
    updateSettings,
    useSelectedResults,
    useAllResults,
    cancelSearch,
    refineSearch,
  };
}
