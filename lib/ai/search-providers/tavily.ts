// Tavily Search Provider Implementation
// https://docs.tavily.com/

import {
  SearchProvider,
  SearchOptions,
  SearchResponse,
  SearchResult,
  SearchProviderError,
  SearchProviderCapabilities,
} from "./types";
import { SearchBYOKManager } from "./search-byok-manager";
import { nanoid } from "nanoid";

// Tavily API configuration
const TAVILY_CONFIG = {
  baseUrl: "https://api.tavily.com",
  defaultMaxResults: 10,
  maxResults: 20,
  timeout: 30000, // 30 seconds
  supportedLanguages: [
    "en",
    "es",
    "fr",
    "de",
    "it",
    "pt",
    "nl",
    "ja",
    "ko",
    "zh",
  ],
  supportedRegions: [
    "us",
    "uk",
    "ca",
    "au",
    "in",
    "de",
    "fr",
    "es",
    "it",
    "nl",
    "br",
    "jp",
    "kr",
    "cn",
  ],
};

// Tavily API types
interface TavilySearchRequest {
  api_key: string;
  query: string;
  search_depth?: "basic" | "advanced";
  include_answer?: boolean;
  include_raw_content?: boolean;
  max_results?: number;
  include_domains?: string[];
  exclude_domains?: string[];
  include_images?: boolean;
  format?: "json" | "markdown";
  days?: number; // Recent results filter
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  raw_content?: string;
  score: number;
  published_date?: string;
}

interface TavilySearchResponse {
  query: string;
  follow_up_questions?: string[];
  answer?: string;
  images?: string[];
  results: TavilySearchResult[];
  response_time: number;
}

// Provider capabilities
export const tavilyCapabilities: SearchProviderCapabilities = {
  maxResults: TAVILY_CONFIG.maxResults,
  supportedLanguages: TAVILY_CONFIG.supportedLanguages,
  supportedRegions: TAVILY_CONFIG.supportedRegions,
  features: {
    realTimeResults: true,
    imageSearch: true,
    videoSearch: false,
    newsSearch: true,
    academicSearch: true,
    safeSearch: true,
    dateFiltering: true,
    domainFiltering: true,
  },
  rateLimits: {
    requestsPerMinute: 100,
    requestsPerDay: 1000,
    maxQueryLength: 400,
  },
  pricing: {
    freeQuota: 1000,
    costPerQuery: 0.001,
    currency: "USD",
  },
};

// Format Tavily results to our standard format
function formatTavilyResults(
  tavilyResults: TavilySearchResult[],
  query: string
): SearchResult[] {
  return tavilyResults.map((result, index) => {
    const domain = extractDomain(result.url);

    return {
      id: `tavily_${nanoid(8)}`,
      title: result.title || "Untitled",
      url: result.url,
      snippet: truncateSnippet(result.content, 300),
      domain,
      publishedDate: result.published_date,
      score: result.score,
      provider: "tavily", // Add provider field directly to satisfy chat API schema
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      metadata: {
        provider: "tavily",
        position: index + 1,
        hasRawContent: !!result.raw_content,
        language: detectLanguage(result.content),
      },
    };
  });
}

// Utility functions
function extractDomain(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function truncateSnippet(content: string, maxLength: number): string {
  if (!content) return "";

  if (content.length <= maxLength) return content;

  // Try to truncate at a sentence boundary
  const truncated = content.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf(". ");

  if (lastSentence > maxLength * 0.6) {
    return truncated.substring(0, lastSentence + 1);
  }

  // Fallback to word boundary
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + "...";
  }

  return truncated + "...";
}

function detectLanguage(content: string): string {
  // Simple language detection - in production, you might want to use a proper library
  const sampleText = content.substring(0, 100).toLowerCase();

  if (/[一-龯]/.test(sampleText)) return "zh";
  if (/[ひらがなカタカナ]/.test(sampleText)) return "ja";
  if (/[한글]/.test(sampleText)) return "ko";
  if (/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüý]/.test(sampleText)) return "es";
  if (/[àâäæçéèêëïîôùûüÿñ]/.test(sampleText)) return "fr";
  if (/[äöüß]/.test(sampleText)) return "de";
  if (/[àáâãçéêíóôõú]/.test(sampleText)) return "pt";
  if (/[àáèéìíîòóùú]/.test(sampleText)) return "it";
  if (/[äöü]/.test(sampleText)) return "nl";

  return "en"; // default
}

function mapDateFilter(filter?: string): number | undefined {
  switch (filter) {
    case "day":
      return 1;
    case "week":
      return 7;
    case "month":
      return 30;
    case "year":
      return 365;
    default:
      return undefined;
  }
}

// Main search function
async function searchTavily(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const startTime = Date.now();

  try {
    // Get API key using BYOK manager
    const keyConfig = await SearchBYOKManager.getApiKeyWithFallback(
      "tavily",
      "TAVILY_API_KEY",
      options.userId
    );

    if (!keyConfig) {
      throw new SearchProviderError(
        "tavily",
        "invalid_key",
        "Tavily API key not found. Please add your Tavily API key in Settings > API Keys or configure TAVILY_API_KEY environment variable."
      );
    }

    // Prepare request
    const requestBody: TavilySearchRequest = {
      api_key: keyConfig.apiKey,
      query: query.trim(),
      search_depth: "advanced",
      include_answer: false,
      include_raw_content: false,
      max_results: Math.min(
        options.maxResults || TAVILY_CONFIG.defaultMaxResults,
        TAVILY_CONFIG.maxResults
      ),
      include_images: options.includeImages || false,
      format: "json",
    };

    // Add date filtering
    const days = mapDateFilter(options.dateFilter);
    if (days) {
      requestBody.days = days;
    }

    // Make API request
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeoutMs || TAVILY_CONFIG.timeout
    );

    const response = await fetch(`${TAVILY_CONFIG.baseUrl}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "ConversationalGlassAI/1.0",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      let errorType: SearchProviderError["type"] = "api_error";

      if (response.status === 401) {
        errorType = "invalid_key";
      } else if (response.status === 429) {
        errorType = "rate_limit";
      }

      throw new SearchProviderError(
        "tavily",
        errorType,
        `Tavily API error: ${response.status} ${errorText}`,
        response.status
      );
    }

    const data: TavilySearchResponse = await response.json();
    const processingTime = Date.now() - startTime;

    // Format results
    const formattedResults = formatTavilyResults(data.results, query);

    const searchResponse: SearchResponse = {
      results: formattedResults,
      query: data.query,
      provider: "tavily",
      totalResults: data.results.length,
      processingTime,
      cached: false,
      suggestions: data.follow_up_questions?.slice(0, 3),
      relatedQueries: data.follow_up_questions?.slice(3, 6),
      metadata: {
        searchId: nanoid(),
        timestamp: new Date().toISOString(),
        cost:
          formattedResults.length * tavilyCapabilities.pricing!.costPerQuery,
        quota: keyConfig.quotaInfo,
      },
    };

    return searchResponse;
  } catch (error) {
    const processingTime = Date.now() - startTime;

    if (error instanceof SearchProviderError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new SearchProviderError(
          "tavily",
          "timeout",
          `Search request timed out after ${
            options.timeoutMs || TAVILY_CONFIG.timeout
          }ms`
        );
      }

      throw new SearchProviderError(
        "tavily",
        "network_error",
        `Network error: ${error.message}`
      );
    }

    throw new SearchProviderError(
      "tavily",
      "api_error",
      "Unknown error occurred during search"
    );
  }
}

// Test connection function
async function testTavilyConnection(apiKey?: string): Promise<boolean> {
  try {
    const testResponse = await searchTavily("test search", {
      maxResults: 1,
      userId: apiKey ? undefined : "test",
    });

    return testResponse.results.length >= 0; // Even 0 results is a successful connection
  } catch (error) {
    console.warn("Tavily connection test failed:", error);
    return false;
  }
}

// Export the provider
export const tavilyProvider: SearchProvider = {
  name: "tavily",
  displayName: "Tavily Search",
  search: searchTavily,
  isConfigured: true, // Always true to allow BYOK
  testConnection: testTavilyConnection,
};

// Export utilities for use by other modules
export {
  formatTavilyResults,
  extractDomain,
  truncateSnippet,
  detectLanguage,
  TAVILY_CONFIG,
};
