// Search Provider Types and Interfaces
// Following the same patterns as AI providers for consistency

export type SearchProviderId = "tavily" | "serper" | "brave";

export interface SearchProvider {
  name: SearchProviderId;
  displayName: string;
  search: (query: string, options?: SearchOptions) => Promise<SearchResponse>;
  isConfigured: boolean;
  testConnection?: (apiKey?: string) => Promise<boolean>;
}

export interface SearchOptions {
  maxResults?: number;
  language?: string;
  region?: string;
  dateFilter?: "day" | "week" | "month" | "year" | "all";
  safeSearch?: "strict" | "moderate" | "off";
  includeImages?: boolean;
  includeVideos?: boolean;
  userId?: string; // For BYOK support
  timeoutMs?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  domain: string;
  publishedDate?: string;
  score?: number;
  favicon?: string;
  images?: string[];
  metadata?: {
    author?: string;
    language?: string;
    category?: string;
    readingTime?: number;
    wordCount?: number;
  };
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  provider: SearchProviderId;
  totalResults?: number;
  processingTime: number;
  cached: boolean;
  suggestions?: string[];
  relatedQueries?: string[];
  metadata?: {
    searchId: string;
    timestamp: string;
    cost?: number;
    quota?: {
      used: number;
      limit: number;
      resetTime?: string;
    };
  };
}

export interface SearchError {
  provider: SearchProviderId;
  type:
    | "api_error"
    | "rate_limit"
    | "invalid_key"
    | "network_error"
    | "timeout";
  message: string;
  code?: string | number;
  retryAfter?: number;
}

export class SearchProviderError extends Error {
  public readonly provider: SearchProviderId;
  public readonly type: SearchError["type"];
  public readonly code?: string | number;
  public readonly retryAfter?: number;

  constructor(
    provider: SearchProviderId,
    type: SearchError["type"],
    message: string,
    code?: string | number,
    retryAfter?: number
  ) {
    super(message);
    this.name = "SearchProviderError";
    this.provider = provider;
    this.type = type;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

// Search result processing and formatting utilities
export interface SearchResultProcessor {
  formatResults: (
    rawResults: Array<{
      title: string;
      url: string;
      snippet: string;
      date?: string;
      score?: number;
      metadata?: Record<string, unknown>;
    }>,
    provider: SearchProviderId
  ) => SearchResult[];
  extractSnippet: (content: string, maxLength?: number) => string;
  validateUrl: (url: string) => boolean;
  extractDomain: (url: string) => string;
  scoreRelevance: (result: SearchResult, query: string) => number;
}

// Search integration with AI chat
export interface SearchIntegrationOptions {
  autoSearch?: boolean;
  searchTriggers?: string[]; // Keywords that trigger search
  maxResultsInContext?: number;
  summaryLength?: "short" | "medium" | "long";
  includeSourceLinks?: boolean;
  confidenceThreshold?: number;
}

export interface SearchContext {
  query: string;
  results: SearchResult[];
  summary?: string;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
    relevanceScore: number;
  }>;
  searchTime: string;
  provider: SearchProviderId;
}

// Search history and caching
export interface SearchHistoryEntry {
  id: string;
  query: string;
  provider: SearchProviderId;
  results: SearchResult[];
  timestamp: string;
  userId?: string;
  conversationId?: string;
  messageId?: string;
  metadata?: {
    cached: boolean;
    processingTime: number;
    totalResults: number;
  };
}

// Provider capabilities
export interface SearchProviderCapabilities {
  maxResults: number;
  supportedLanguages: string[];
  supportedRegions: string[];
  features: {
    realTimeResults: boolean;
    imageSearch: boolean;
    videoSearch: boolean;
    newsSearch: boolean;
    academicSearch: boolean;
    safeSearch: boolean;
    dateFiltering: boolean;
    domainFiltering: boolean;
  };
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
    maxQueryLength: number;
  };
  pricing?: {
    freeQuota: number;
    costPerQuery: number;
    currency: string;
  };
}

// Search analytics
export interface SearchAnalytics {
  totalSearches: number;
  successRate: number;
  averageResponseTime: number;
  topQueries: Array<{
    query: string;
    count: number;
    lastUsed: string;
  }>;
  providerUsage: Record<SearchProviderId, number>;
  errorStats: Record<SearchError["type"], number>;
}
