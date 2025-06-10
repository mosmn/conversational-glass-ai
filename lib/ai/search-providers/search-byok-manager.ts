// Search Provider BYOK Manager
// Manages API keys for search providers with the same pattern as AI providers

import { z } from "zod";
import { SearchProviderId, SearchProviderError } from "./types";

// Environment validation
const searchEnvSchema = z.object({
  TAVILY_API_KEY: z.string().optional(),
  SERPER_API_KEY: z.string().optional(),
  BRAVE_API_KEY: z.string().optional(),
});

// API key configuration type
export interface SearchApiKeyConfig {
  apiKey: string;
  isUserKey: boolean; // true if from user's BYOK, false if from environment
  provider: SearchProviderId;
  lastValidated?: string;
  quotaInfo?: {
    used: number;
    limit: number;
    resetTime?: string;
  };
}

// Search provider environment variable mapping
const SEARCH_ENV_MAPPING: Record<SearchProviderId, string> = {
  tavily: "TAVILY_API_KEY",
  serper: "SERPER_API_KEY",
  brave: "BRAVE_API_KEY",
};

// Key format validation patterns
const KEY_PATTERNS: Record<SearchProviderId, RegExp> = {
  tavily: /^tvly-[a-zA-Z0-9_-]+$/,
  serper: /^[a-f0-9]{32,64}$/,
  brave: /^BSA[a-zA-Z0-9_-]+$/,
};

export class SearchBYOKManager {
  // Get user's API key from database
  static async getUserApiKey(
    provider: SearchProviderId,
    userId?: string
  ): Promise<SearchApiKeyConfig | null> {
    if (!userId) {
      return null;
    }

    try {
      // Import dynamically to avoid circular dependencies
      const { db } = await import("@/lib/db");
      const { userApiKeys } = await import("@/lib/db/schema");
      const { eq, and } = await import("drizzle-orm");

      const [apiKeyRecord] = await db
        .select()
        .from(userApiKeys)
        .where(
          and(
            eq(userApiKeys.userId, userId),
            eq(userApiKeys.provider, `search_${provider}` as any),
            eq(userApiKeys.status, "valid")
          )
        )
        .limit(1);

      if (!apiKeyRecord) {
        return null;
      }

      // Decrypt the API key
      const { decryptApiKey } = await import("@/lib/utils/encryption");
      const decryptedKey = decryptApiKey(apiKeyRecord.encryptedKey, userId);

      return {
        apiKey: decryptedKey,
        isUserKey: true,
        provider,
        lastValidated: apiKeyRecord.lastValidated?.toISOString(),
        quotaInfo: apiKeyRecord.quotaInfo as any,
      };
    } catch (error) {
      console.warn(`Failed to get user search API key for ${provider}:`, error);
      return null;
    }
  }

  // Get API key with fallback to environment variables
  static async getApiKeyWithFallback(
    provider: SearchProviderId,
    envVarName: string,
    userId?: string
  ): Promise<SearchApiKeyConfig | null> {
    // First try to get user's BYOK key
    const userKey = await this.getUserApiKey(provider, userId);
    if (userKey) {
      return userKey;
    }

    // Fallback to environment variable
    const envKey = process.env[envVarName];
    if (envKey) {
      return {
        apiKey: envKey,
        isUserKey: false,
        provider,
      };
    }

    return null;
  }

  // Validate API key format
  static validateKeyFormat(
    provider: SearchProviderId,
    apiKey: string
  ): boolean {
    const pattern = KEY_PATTERNS[provider];
    if (!pattern) {
      console.warn(`No validation pattern for search provider: ${provider}`);
      return true; // Allow if no pattern defined
    }
    return pattern.test(apiKey);
  }

  // Test API key by making a test search
  static async testApiKey(
    provider: SearchProviderId,
    apiKey: string
  ): Promise<{ valid: boolean; error?: string; quota?: any }> {
    try {
      // Validate format first
      if (!this.validateKeyFormat(provider, apiKey)) {
        return {
          valid: false,
          error: `Invalid API key format for ${provider}`,
        };
      }

      // Test with a simple search query
      const testQuery = "test";
      let response: Response;

      switch (provider) {
        case "tavily":
          response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              api_key: apiKey,
              query: testQuery,
              max_results: 1,
              include_answer: false,
            }),
          });
          break;

        case "serper":
          response = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
              "X-API-KEY": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              q: testQuery,
              num: 1,
            }),
          });
          break;

        case "brave":
          response = await fetch(
            `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
              testQuery
            )}&count=1`,
            {
              headers: {
                "X-Subscription-Token": apiKey,
                Accept: "application/json",
              },
            }
          );
          break;

        default:
          return {
            valid: false,
            error: `Unknown search provider: ${provider}`,
          };
      }

      if (!response.ok) {
        const errorText = await response.text();
        return {
          valid: false,
          error: `API request failed: ${response.status} ${errorText}`,
        };
      }

      const data = await response.json();

      // Extract quota information if available
      let quota;
      if (provider === "tavily" && data.quota) {
        quota = data.quota;
      } else if (
        provider === "serper" &&
        response.headers.get("x-ratelimit-remaining")
      ) {
        quota = {
          remaining: parseInt(
            response.headers.get("x-ratelimit-remaining") || "0"
          ),
          limit: parseInt(response.headers.get("x-ratelimit-limit") || "0"),
        };
      }

      return {
        valid: true,
        quota,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Store or update user's API key
  static async storeUserApiKey(
    provider: SearchProviderId,
    apiKey: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Validate the key first
      const testResult = await this.testApiKey(provider, apiKey);
      if (!testResult.valid) {
        throw new SearchProviderError(
          provider,
          "invalid_key",
          testResult.error || "Invalid API key"
        );
      }

      // Import database dependencies
      const { db } = await import("@/lib/db");
      const { userApiKeys } = await import("@/lib/db/schema");
      const { eq, and } = await import("drizzle-orm");
      const { encryptApiKey, hashApiKey } = await import(
        "@/lib/utils/encryption"
      );

      // Encrypt and hash the API key
      const encryptedKey = encryptApiKey(apiKey, userId);
      const keyHash = hashApiKey(apiKey);

      // Check if key already exists for this user and provider
      const [existingKey] = await db
        .select()
        .from(userApiKeys)
        .where(
          and(
            eq(userApiKeys.userId, userId),
            eq(userApiKeys.provider, `search_${provider}` as any)
          )
        )
        .limit(1);

      const keyData = {
        encryptedKey,
        keyHash,
        lastValidated: new Date(),
        status: "valid" as const,
        quotaInfo: testResult.quota || {},
        metadata: metadata || {},
      };

      if (existingKey) {
        // Update existing key
        await db
          .update(userApiKeys)
          .set(keyData)
          .where(eq(userApiKeys.id, existingKey.id));
      } else {
        // Insert new key
        await db.insert(userApiKeys).values({
          userId,
          provider: `search_${provider}` as any,
          keyName: `Search ${
            provider.charAt(0).toUpperCase() + provider.slice(1)
          }`,
          ...keyData,
        });
      }
    } catch (error) {
      if (error instanceof SearchProviderError) {
        throw error;
      }
      throw new SearchProviderError(
        provider,
        "api_error",
        `Failed to store API key: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Remove user's API key
  static async removeUserApiKey(
    provider: SearchProviderId,
    userId: string
  ): Promise<void> {
    try {
      const { db } = await import("@/lib/db");
      const { userApiKeys } = await import("@/lib/db/schema");
      const { eq, and } = await import("drizzle-orm");

      await db
        .update(userApiKeys)
        .set({ status: "invalid" })
        .where(
          and(
            eq(userApiKeys.userId, userId),
            eq(userApiKeys.provider, `search_${provider}` as any)
          )
        );
    } catch (error) {
      console.warn(`Failed to remove search API key for ${provider}:`, error);
      throw new SearchProviderError(
        provider,
        "api_error",
        `Failed to remove API key: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Get all user's search API keys
  static async getUserSearchKeys(userId: string): Promise<
    Array<{
      provider: SearchProviderId;
      isValid: boolean;
      lastValidated?: string;
      quota?: any;
    }>
  > {
    try {
      const { db } = await import("@/lib/db");
      const { userApiKeys } = await import("@/lib/db/schema");
      const { eq, and, like } = await import("drizzle-orm");

      const keys = await db
        .select()
        .from(userApiKeys)
        .where(
          and(
            eq(userApiKeys.userId, userId),
            like(userApiKeys.provider, "search_%"),
            eq(userApiKeys.status, "valid")
          )
        );

      return keys.map((key) => ({
        provider: key.provider.replace("search_", "") as SearchProviderId,
        isValid: !!key.lastValidated,
        lastValidated: key.lastValidated?.toISOString(),
        quota: key.quotaInfo,
      }));
    } catch (error) {
      console.warn("Failed to get user search keys:", error);
      return [];
    }
  }
}
