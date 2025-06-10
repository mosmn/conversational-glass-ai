import { db } from "@/lib/db/connection";
import { userApiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decryptApiKey } from "@/lib/utils/encryption";
import { getAuthenticatedUserId } from "@/lib/utils/auth";

export interface BYOKConfig {
  provider: string;
  apiKey: string;
  metadata?: Record<string, any>;
}

/**
 * BYOK Manager - Handles retrieving and using user's stored API keys
 */
export class BYOKManager {
  private static keyCache = new Map<string, BYOKConfig>();
  private static cacheTimestamp = new Map<string, number>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get user's API key for a specific provider
   * @param provider - The AI provider name (openai, claude, etc.)
   * @param userId - Optional user ID (will get from auth if not provided)
   * @returns BYOKConfig if user has a key, null if they should use default/env keys
   */
  static async getUserApiKey(
    provider: string,
    userId?: string
  ): Promise<BYOKConfig | null> {
    try {
      let internalUserId = userId;

      // Get authenticated user ID if not provided
      if (!internalUserId) {
        const authResult = await getAuthenticatedUserId();
        if (!authResult.success) {
          // No authenticated user - use default keys
          return null;
        }
        internalUserId = authResult.userId!;
      }

      // Validate that we have a proper UUID, not "system" or other invalid values
      if (
        !internalUserId ||
        internalUserId === "system" ||
        internalUserId.length < 10
      ) {
        console.warn(`Invalid user ID for BYOK: ${internalUserId}`);
        return null;
      }

      const cacheKey = `${internalUserId}:${provider}`;

      // Check cache first
      const cached = this.getCachedKey(cacheKey);
      if (cached) {
        return cached;
      }

      // Query database for user's API key
      const userKeys = await db
        .select({
          id: userApiKeys.id,
          provider: userApiKeys.provider,
          encryptedKey: userApiKeys.encryptedKey,
          status: userApiKeys.status,
          metadata: userApiKeys.metadata,
        })
        .from(userApiKeys)
        .where(
          and(
            eq(userApiKeys.userId, internalUserId),
            eq(userApiKeys.provider, provider),
            eq(userApiKeys.status, "valid") // Only use valid keys
          )
        )
        .orderBy(userApiKeys.createdAt) // Use the first valid key
        .limit(1);

      if (userKeys.length === 0) {
        // User doesn't have a valid key for this provider
        return null;
      }

      const userKey = userKeys[0];

      // Decrypt the API key
      const decryptedKey = decryptApiKey(userKey.encryptedKey, internalUserId);

      const config: BYOKConfig = {
        provider: userKey.provider,
        apiKey: decryptedKey,
        metadata: userKey.metadata || {},
      };

      // Cache the result
      this.setCachedKey(cacheKey, config);

      return config;
    } catch (error) {
      console.error(`Error getting BYOK key for ${provider}:`, error);
      return null;
    }
  }

  /**
   * Get API key with fallback to environment variables
   * @param provider - The AI provider name
   * @param envVarName - The environment variable name to fall back to
   * @param userId - Optional user ID
   */
  static async getApiKeyWithFallback(
    provider: string,
    envVarName: string,
    userId?: string
  ): Promise<{
    apiKey: string;
    isUserKey: boolean;
    metadata?: Record<string, any>;
  } | null> {
    // First try to get user's BYOK key
    const userKey = await this.getUserApiKey(provider, userId);

    if (userKey) {
      return {
        apiKey: userKey.apiKey,
        isUserKey: true,
        metadata: userKey.metadata,
      };
    }

    // Fall back to environment variable
    const envKey = process.env[envVarName];
    if (envKey) {
      return {
        apiKey: envKey,
        isUserKey: false,
      };
    }

    // No key available
    return null;
  }

  /**
   * Check if user has any valid keys for a provider
   */
  static async hasValidKey(
    provider: string,
    userId?: string
  ): Promise<boolean> {
    const key = await this.getUserApiKey(provider, userId);
    return key !== null;
  }

  /**
   * Get all user's API keys with their status
   */
  static async getUserKeys(userId?: string): Promise<
    Array<{
      provider: string;
      status: string;
      hasValidKey: boolean;
    }>
  > {
    try {
      let internalUserId = userId;

      if (!internalUserId) {
        const authResult = await getAuthenticatedUserId();
        if (!authResult.success) {
          return [];
        }
        internalUserId = authResult.userId!;
      }

      const keys = await db
        .select({
          provider: userApiKeys.provider,
          status: userApiKeys.status,
        })
        .from(userApiKeys)
        .where(eq(userApiKeys.userId, internalUserId));

      // Group by provider and get the best status for each
      const providerStatus = new Map<string, string>();

      for (const key of keys) {
        const currentStatus = providerStatus.get(key.provider);

        // Priority: valid > pending > others
        if (
          !currentStatus ||
          key.status === "valid" ||
          (key.status === "pending" && currentStatus !== "valid")
        ) {
          providerStatus.set(key.provider, key.status);
        }
      }

      return Array.from(providerStatus.entries()).map(([provider, status]) => ({
        provider,
        status,
        hasValidKey: status === "valid",
      }));
    } catch (error) {
      console.error("Error getting user keys:", error);
      return [];
    }
  }

  /**
   * Clear cache for a specific user or provider
   */
  static clearCache(userId?: string, provider?: string) {
    if (userId && provider) {
      const cacheKey = `${userId}:${provider}`;
      this.keyCache.delete(cacheKey);
      this.cacheTimestamp.delete(cacheKey);
    } else if (userId) {
      // Clear all keys for this user
      for (const key of this.keyCache.keys()) {
        if (key.startsWith(`${userId}:`)) {
          this.keyCache.delete(key);
          this.cacheTimestamp.delete(key);
        }
      }
    } else {
      // Clear entire cache
      this.keyCache.clear();
      this.cacheTimestamp.clear();
    }
  }

  private static getCachedKey(cacheKey: string): BYOKConfig | null {
    const cached = this.keyCache.get(cacheKey);
    const timestamp = this.cacheTimestamp.get(cacheKey);

    if (cached && timestamp && Date.now() - timestamp < this.CACHE_TTL) {
      return cached;
    }

    // Cache expired, remove it
    this.keyCache.delete(cacheKey);
    this.cacheTimestamp.delete(cacheKey);
    return null;
  }

  private static setCachedKey(cacheKey: string, config: BYOKConfig) {
    this.keyCache.set(cacheKey, config);
    this.cacheTimestamp.set(cacheKey, Date.now());
  }
}

/**
 * Helper function for providers to get API key with BYOK support
 */
export async function getProviderApiKey(
  provider: string,
  envVarName: string,
  userId?: string
): Promise<string | null> {
  const result = await BYOKManager.getApiKeyWithFallback(
    provider,
    envVarName,
    userId
  );

  return result?.apiKey || null;
}

/**
 * Check if the current request is using user's own API key
 */
export async function isUsingUserKey(
  provider: string,
  userId?: string
): Promise<boolean> {
  const result = await BYOKManager.getApiKeyWithFallback(
    provider,
    "dummy", // We don't care about env fallback for this check
    userId
  );

  return result?.isUserKey || false;
}
