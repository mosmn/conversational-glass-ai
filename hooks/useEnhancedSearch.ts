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
    const savedSettings = localStorage.getItem("search-settings");
    if (savedSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      } catch (error) {
        console.warn("Failed to load search settings:", error);
      }
    }

    const savedHistory = localStorage.getItem("search-history");
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.warn("Failed to load search history:", error);
      }
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem("search-settings", JSON.stringify(settings));
  }, [settings]);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem("search-history", JSON.stringify(searchHistory));
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
    }
  };

  const performSearch = useCallback(
    async (query: string, customSettings?: Partial<SearchSettings>) => {
      if (!query.trim()) return;

      const searchSettings = { ...settings, ...customSettings };
      setIsSearching(true);
      setCurrentQuery(query);

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

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();

          if (searchData.success && searchData.data?.results) {
            const results = searchData.data.results;
            setCurrentResults(results);
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

            return {
              results,
              query: searchData.data.query,
              provider: searchData.data.provider,
              totalResults: results.length,
              processingTime: searchData.data.metadata?.totalRequestTime || 0,
              suggestions: searchData.data.suggestions,
              relatedQueries: searchData.data.relatedQueries,
            };
          } else {
            throw new Error("No results found");
          }
        } else {
          const errorData = await searchResponse.json();
          throw new Error(errorData.error || "Search failed");
        }
      } catch (error) {
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

        throw error;
      } finally {
        setIsSearching(false);
      }
    },
    [settings, toast, onError]
  );

  const useSelectedResults = useCallback(
    (selectedResults: SearchResult[]) => {
      if (onSearchComplete) {
        onSearchComplete(selectedResults, currentQuery);
      }
      setShowResultsPreview(false);

      toast({
        title: "✅ Results Selected",
        description: `Using ${selectedResults.length} search results`,
      });
    },
    [onSearchComplete, currentQuery, toast]
  );

  const useAllResults = useCallback(() => {
    useSelectedResults(currentResults);
  }, [currentResults, useSelectedResults]);

  const cancelSearch = useCallback(() => {
    setShowResultsPreview(false);
    setCurrentResults([]);
    setCurrentQuery("");
  }, []);

  const refineSearch = useCallback(
    async (newQuery: string) => {
      setShowResultsPreview(false);
      await performSearch(newQuery);
    },
    [performSearch]
  );

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    toast({
      title: "🗑️ History Cleared",
      description: "Search history has been cleared",
    });
  }, [toast]);

  const updateSettings = useCallback((newSettings: SearchSettings) => {
    setSettings(newSettings);
  }, []);

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
    useSelectedResults,
    useAllResults,
    cancelSearch,
    refineSearch,
    clearSearchHistory,
    updateSettings,

    // Computed values
    hasResults: currentResults.length > 0,
    isConfigured: availableProviders.some((p) => p.isConfigured),
  };
}
