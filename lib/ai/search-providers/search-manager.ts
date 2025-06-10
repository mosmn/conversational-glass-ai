// Search Manager - Unified interface for all search providers
// Handles provider selection, failover, caching, and result aggregation

import {
  SearchProvider,
  SearchProviderId,
  SearchOptions,
  SearchResponse,
  SearchResult,
  SearchProviderError,
  SearchHistoryEntry,
  SearchContext,
  SearchIntegrationOptions,
} from "./types";

// Import providers
import { tavilyProvider } from "./tavily";
import { serperProvider } from "./serper";

// Provider registry
const SEARCH_PROVIDERS: Record<SearchProviderId, SearchProvider> = {
  tavily: tavilyProvider,
  serper: serperProvider,
  brave: {
    name: "brave",
    displayName: "Brave Search",
    search: async () => {
      throw new Error("Brave Search not implemented yet");
    },
    isConfigured: false,
  },
};

// Provider priority order (first available will be used)
const DEFAULT_PROVIDER_PRIORITY: SearchProviderId[] = [
  "tavily",
  "serper",
  "brave",
];

// Search cache for performance
interface CacheEntry {
  response: SearchResponse;
  timestamp: number;
  expiresAt: number;
}

class SearchCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_SIZE = 100;

  private generateKey(query: string, options?: SearchOptions): string {
    const normalizedQuery = query.toLowerCase().trim();
    const optionsKey = JSON.stringify({
      maxResults: options?.maxResults,
      language: options?.language,
      region: options?.region,
      dateFilter: options?.dateFilter,
      safeSearch: options?.safeSearch,
    });
    return `${normalizedQuery}:${optionsKey}`;
  }

  get(query: string, options?: SearchOptions): SearchResponse | null {
    const key = this.generateKey(query, options);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Mark as cached
    return {
      ...entry.response,
      cached: true,
    };
  }

  set(query: string, response: SearchResponse, options?: SearchOptions): void {
    const key = this.generateKey(query, options);

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.MAX_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      response: { ...response, cached: false },
      timestamp: Date.now(),
      expiresAt: Date.now() + this.TTL,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global search cache instance
const searchCache = new SearchCache();

export class SearchManager {
  // Get available providers based on configuration
  static getAvailableProviders(): SearchProvider[] {
    return Object.values(SEARCH_PROVIDERS).filter(
      (provider) => provider.isConfigured
    );
  }

  // Get provider by ID
  static getProvider(providerId: SearchProviderId): SearchProvider | null {
    return SEARCH_PROVIDERS[providerId] || null;
  }

  // Main search function with provider failover
  static async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResponse> {
    if (!query?.trim()) {
      throw new SearchProviderError(
        "tavily",
        "api_error",
        "Search query cannot be empty"
      );
    }

    // Check cache first
    const cachedResult = searchCache.get(query, options);
    if (cachedResult) {
      return cachedResult;
    }

    // Get the best available provider
    const provider = await this.getBestProvider(options.userId);
    if (!provider) {
      throw new SearchProviderError(
        "tavily",
        "api_error",
        "No search providers are available. Please configure at least one search provider."
      );
    }

    try {
      console.log(`Searching with provider: ${provider.name}`);
      const response = await provider.search(query, options);

      // Cache successful responses
      searchCache.set(query, response, options);

      return response;
    } catch (error) {
      if (error instanceof SearchProviderError) {
        console.error(`Search failed with ${provider.name}:`, error.message);
        throw error;
      }

      throw new SearchProviderError(
        provider.name as SearchProviderId,
        "api_error",
        `Search failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Determine best provider for search
  static async getBestProvider(
    userId?: string
  ): Promise<SearchProvider | null> {
    const providers = this.getAvailableProviders();

    if (providers.length === 0) {
      console.warn("No search providers are configured");
      return null;
    }

    // Try providers in priority order
    for (const providerId of DEFAULT_PROVIDER_PRIORITY) {
      const provider = this.getProvider(providerId);
      if (provider?.isConfigured) {
        return provider;
      }
    }

    // Fallback to first available provider
    return providers[0] || null;
  }

  // Get search history for user
  static async getSearchHistory(
    userId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const { db } = await import("@/lib/db");
      const { searchHistory } = await import("@/lib/db/schema");
      const { eq, desc } = await import("drizzle-orm");

      const history = await db
        .select()
        .from(searchHistory)
        .where(eq(searchHistory.userId, userId))
        .orderBy(desc(searchHistory.timestamp))
        .limit(limit);

      return history;
    } catch (error) {
      console.warn("Failed to get search history:", error);
      return [];
    }
  }

  // Clear search history for user
  static async clearSearchHistory(userId: string): Promise<void> {
    try {
      const { db } = await import("@/lib/db");
      const { searchHistory } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      await db.delete(searchHistory).where(eq(searchHistory.userId, userId));
    } catch (error) {
      console.warn("Failed to clear search history:", error);
      throw new Error("Failed to clear search history");
    }
  }

  // Get provider capabilities
  static async getProviderCapabilities(providerId: SearchProviderId) {
    try {
      switch (providerId) {
        case "tavily":
          const tavily = await import("./tavily");
          return tavily.tavilyCapabilities;
        case "serper":
          const serper = await import("./serper");
          return serper.serperCapabilities;
        default:
          return null;
      }
    } catch (error) {
      console.warn(`Failed to get capabilities for ${providerId}:`, error);
      return null;
    }
  }

  // Cache management
  static clearCache(): void {
    searchCache.clear();
  }

  static getCacheSize(): number {
    return searchCache.size();
  }
}

// Export for external use
export { searchCache, SEARCH_PROVIDERS, DEFAULT_PROVIDER_PRIORITY };
