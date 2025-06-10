// Serper.dev Search Provider Implementation
// https://serper.dev/

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
import { extractDomain, truncateSnippet, detectLanguage } from "./tavily";

// Serper API configuration
const SERPER_CONFIG = {
  baseUrl: "https://google.serper.dev",
  defaultMaxResults: 10,
  maxResults: 100, // Serper supports up to 100 results
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
    "ru",
    "ar",
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
    "ru",
  ],
};

// Serper API types
interface SerperSearchRequest {
  q: string;
  gl?: string; // country code for geolocation
  hl?: string; // language code
  num?: number; // number of results (1-100)
  page?: number; // page number
  tbs?: string; // time-based search (qdr:d for past day, qdr:w for week, etc.)
  safe?: "active" | "off";
  type?: "search" | "images" | "videos" | "places" | "news";
}

interface SerperSearchResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  date?: string;
  sitelinks?: Array<{
    title: string;
    link: string;
  }>;
}

interface SerperSearchResponse {
  searchParameters: {
    q: string;
    gl: string;
    hl: string;
    num: number;
    type: string;
  };
  organic: SerperSearchResult[];
  peopleAlsoAsk?: Array<{
    question: string;
    snippet: string;
    title: string;
    link: string;
  }>;
  relatedSearches?: Array<{
    query: string;
  }>;
  answerBox?: {
    answer: string;
    title: string;
    link: string;
  };
  knowledgeGraph?: any;
  credits: number;
}

// Provider capabilities
export const serperCapabilities: SearchProviderCapabilities = {
  maxResults: SERPER_CONFIG.maxResults,
  supportedLanguages: SERPER_CONFIG.supportedLanguages,
  supportedRegions: SERPER_CONFIG.supportedRegions,
  features: {
    realTimeResults: true,
    imageSearch: true,
    videoSearch: true,
    newsSearch: true,
    academicSearch: false,
    safeSearch: true,
    dateFiltering: true,
    domainFiltering: false,
  },
  rateLimits: {
    requestsPerMinute: 60,
    requestsPerDay: 2500,
    maxQueryLength: 300,
  },
  pricing: {
    freeQuota: 100,
    costPerQuery: 0.001,
    currency: "USD",
  },
};

// Format Serper results to our standard format
function formatSerperResults(
  serperResults: SerperSearchResult[],
  query: string
): SearchResult[] {
  return serperResults.map((result) => {
    const domain = extractDomain(result.link);

    return {
      id: `serper_${nanoid(8)}`,
      title: result.title || "Untitled",
      url: result.link,
      snippet: truncateSnippet(result.snippet, 300),
      domain,
      publishedDate: result.date,
      score: (100 - result.position) / 100, // Convert position to score (higher position = lower score)
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
      metadata: {
        provider: "serper",
        position: result.position,
        language: detectLanguage(result.snippet),
        sitelinks: result.sitelinks?.length || 0,
      },
    };
  });
}

function mapLanguageCode(language?: string): string {
  const languageMap: Record<string, string> = {
    en: "en",
    es: "es",
    fr: "fr",
    de: "de",
    it: "it",
    pt: "pt",
    nl: "nl",
    ja: "ja",
    ko: "ko",
    zh: "zh-cn",
    ru: "ru",
    ar: "ar",
  };

  return languageMap[language || "en"] || "en";
}

function mapRegionCode(region?: string): string {
  const regionMap: Record<string, string> = {
    us: "us",
    uk: "uk",
    ca: "ca",
    au: "au",
    in: "in",
    de: "de",
    fr: "fr",
    es: "es",
    it: "it",
    nl: "nl",
    br: "br",
    jp: "jp",
    kr: "kr",
    cn: "cn",
    ru: "ru",
  };

  return regionMap[region || "us"] || "us";
}

function mapDateFilter(filter?: string): string | undefined {
  switch (filter) {
    case "day":
      return "qdr:d";
    case "week":
      return "qdr:w";
    case "month":
      return "qdr:m";
    case "year":
      return "qdr:y";
    default:
      return undefined;
  }
}

// Main search function
async function searchSerper(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const startTime = Date.now();

  try {
    // Get API key using BYOK manager
    const keyConfig = await SearchBYOKManager.getApiKeyWithFallback(
      "serper",
      "SERPER_API_KEY",
      options.userId
    );

    if (!keyConfig) {
      throw new SearchProviderError(
        "serper",
        "invalid_key",
        "Serper API key not found. Please add your Serper API key in Settings > API Keys or configure SERPER_API_KEY environment variable."
      );
    }

    // Prepare request
    const requestBody: SerperSearchRequest = {
      q: query.trim(),
      num: Math.min(
        options.maxResults || SERPER_CONFIG.defaultMaxResults,
        SERPER_CONFIG.maxResults
      ),
      gl: mapRegionCode(options.region),
      hl: mapLanguageCode(options.language),
      type: "search",
    };

    // Add date filtering
    const timeFilter = mapDateFilter(options.dateFilter);
    if (timeFilter) {
      requestBody.tbs = timeFilter;
    }

    // Add safe search
    if (options.safeSearch) {
      requestBody.safe = options.safeSearch === "off" ? "off" : "active";
    }

    // Make API request
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeoutMs || SERPER_CONFIG.timeout
    );

    const response = await fetch(`${SERPER_CONFIG.baseUrl}/search`, {
      method: "POST",
      headers: {
        "X-API-KEY": keyConfig.apiKey,
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

      if (response.status === 401 || response.status === 403) {
        errorType = "invalid_key";
      } else if (response.status === 429) {
        errorType = "rate_limit";
      }

      throw new SearchProviderError(
        "serper",
        errorType,
        `Serper API error: ${response.status} ${errorText}`,
        response.status
      );
    }

    const data: SerperSearchResponse = await response.json();
    const processingTime = Date.now() - startTime;

    // Format results
    const formattedResults = formatSerperResults(data.organic || [], query);

    // Extract suggestions from related searches and people also ask
    const suggestions = [
      ...(data.relatedSearches?.slice(0, 3)?.map((rs) => rs.query) || []),
      ...(data.peopleAlsoAsk?.slice(0, 2)?.map((paa) => paa.question) || []),
    ].slice(0, 5);

    const searchResponse: SearchResponse = {
      results: formattedResults,
      query: data.searchParameters.q,
      provider: "serper",
      totalResults: formattedResults.length,
      processingTime,
      cached: false,
      suggestions,
      relatedQueries: data.relatedSearches?.map((rs) => rs.query)?.slice(0, 5),
      metadata: {
        searchId: nanoid(),
        timestamp: new Date().toISOString(),
        cost:
          formattedResults.length * serperCapabilities.pricing!.costPerQuery,
        quota: {
          used: data.credits || 0,
          limit:
            keyConfig.quotaInfo?.limit || serperCapabilities.pricing!.freeQuota,
          resetTime: keyConfig.quotaInfo?.resetDate,
        },
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
          "serper",
          "timeout",
          `Search request timed out after ${
            options.timeoutMs || SERPER_CONFIG.timeout
          }ms`
        );
      }

      throw new SearchProviderError(
        "serper",
        "network_error",
        `Network error: ${error.message}`
      );
    }

    throw new SearchProviderError(
      "serper",
      "api_error",
      "Unknown error occurred during search"
    );
  }
}

// Test connection function
async function testSerperConnection(apiKey?: string): Promise<boolean> {
  try {
    const testResponse = await searchSerper("test search", {
      maxResults: 1,
      userId: apiKey ? undefined : "test",
    });

    return testResponse.results.length >= 0; // Even 0 results is a successful connection
  } catch (error) {
    console.warn("Serper connection test failed:", error);
    return false;
  }
}

// Export the provider
export const serperProvider: SearchProvider = {
  name: "serper",
  displayName: "Serper (Google Search)",
  search: searchSerper,
  isConfigured: true, // Always true to allow BYOK
  testConnection: testSerperConnection,
};

// Export utilities for use by other modules
export {
  formatSerperResults,
  mapLanguageCode,
  mapRegionCode,
  mapDateFilter,
  SERPER_CONFIG,
};
