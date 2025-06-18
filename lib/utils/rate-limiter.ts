import { createKeyAuditLog } from "./encryption";

// In-memory rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const suspiciousActivity = new Map<
  string,
  { attempts: number; lastAttempt: number }
>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs: number;
  maxFailures?: number; // For failed attempts tracking
}

// Default configurations for different operations
const RATE_LIMIT_CONFIGS = {
  apiKeyTest: {
    maxRequests: 5, // 5 tests per hour per user
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 15 * 60 * 1000, // 15 minute block
    maxFailures: 10, // Suspend after 10 failed attempts
  },
  apiKeyCreate: {
    maxRequests: 10, // 10 keys per day per user
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    blockDurationMs: 60 * 60 * 1000, // 1 hour block
    maxFailures: 15, // More lenient for key creation
  },
  apiKeyValidateAll: {
    maxRequests: 3, // 3 bulk validations per hour
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 30 * 60 * 1000, // 30 minute block
    maxFailures: 8, // Fewer failures allowed for bulk operations
  },
  keyExport: {
    maxRequests: 2, // 2 exports per day per user
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    blockDurationMs: 2 * 60 * 60 * 1000, // 2 hour block
    maxFailures: 5, // Very strict for export operations
  },
} as const;

export type RateLimitOperation = keyof typeof RATE_LIMIT_CONFIGS;

/**
 * Advanced rate limiter with suspicious activity detection
 * Prevents abuse of sensitive operations like API key testing
 */
export function checkRateLimit(
  userId: string,
  operation: RateLimitOperation,
  customConfig?: Partial<RateLimitConfig>
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  reason?: string;
  severity?: "warning" | "critical";
} {
  const config = { ...RATE_LIMIT_CONFIGS[operation], ...customConfig };
  const key = `${userId}:${operation}`;
  const now = Date.now();

  // Check for suspicious activity first
  const suspicious = suspiciousActivity.get(userId);
  if (suspicious && suspicious.attempts >= (config.maxFailures || 20)) {
    const timeSinceLastAttempt = now - suspicious.lastAttempt;
    if (timeSinceLastAttempt < config.blockDurationMs) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: suspicious.lastAttempt + config.blockDurationMs,
        reason: "Account temporarily suspended due to suspicious activity",
        severity: "critical",
      };
    } else {
      // Reset suspicious activity after block duration
      suspiciousActivity.delete(userId);
    }
  }

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetTime) {
    // Create new window
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      reason: `Rate limit exceeded for ${operation}. Try again later.`,
      severity: "warning",
    };
  }

  // Increment and store
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Record a failed operation attempt
 * Used to track suspicious activity and potential abuse
 */
export function recordFailedAttempt(
  userId: string,
  operation: RateLimitOperation,
  reason: string
): void {
  const now = Date.now();
  let suspicious = suspiciousActivity.get(userId);

  if (!suspicious) {
    suspicious = { attempts: 0, lastAttempt: 0 };
  }

  // Reset if it's been more than 24 hours since last attempt
  if (now - suspicious.lastAttempt > 24 * 60 * 60 * 1000) {
    suspicious.attempts = 0;
  }

  suspicious.attempts++;
  suspicious.lastAttempt = now;
  suspiciousActivity.set(userId, suspicious);

  // Create audit log for failed attempts
  const auditLog = createKeyAuditLog(userId, "test", "unknown", {
    failed: true,
    reason,
    suspiciousAttempts: suspicious.attempts,
  });
  auditLog.success = false;

  // Log suspicious activity (in production, send to monitoring system)
  if (suspicious.attempts >= 5) {
    console.warn(
      `🚨 Suspicious activity detected for user ${userId.substring(0, 8)}...: ${
        suspicious.attempts
      } failed attempts`
    );
  }
}

/**
 * Clean up expired rate limit entries
 * Call this periodically to prevent memory leaks
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }

  // Clean up old suspicious activity (older than 7 days)
  for (const [userId, suspicious] of suspiciousActivity.entries()) {
    if (now - suspicious.lastAttempt > 7 * 24 * 60 * 60 * 1000) {
      suspiciousActivity.delete(userId);
    }
  }
}

/**
 * Get rate limit status for a user without incrementing
 * Useful for displaying rate limit info in UI
 */
export function getRateLimitStatus(
  userId: string,
  operation: RateLimitOperation
): {
  remaining: number;
  resetTime: number;
  isBlocked: boolean;
  blockReason?: string;
} {
  const config = RATE_LIMIT_CONFIGS[operation];
  const key = `${userId}:${operation}`;
  const now = Date.now();

  // Check for suspicious activity block
  const suspicious = suspiciousActivity.get(userId);
  if (suspicious && suspicious.attempts >= (config.maxFailures || 20)) {
    const timeSinceLastAttempt = now - suspicious.lastAttempt;
    if (timeSinceLastAttempt < config.blockDurationMs) {
      return {
        remaining: 0,
        resetTime: suspicious.lastAttempt + config.blockDurationMs,
        isBlocked: true,
        blockReason: "Account suspended due to suspicious activity",
      };
    }
  }

  const entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetTime) {
    return {
      remaining: config.maxRequests,
      resetTime: now + config.windowMs,
      isBlocked: false,
    };
  }

  return {
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
    isBlocked: entry.count >= config.maxRequests,
    blockReason:
      entry.count >= config.maxRequests ? "Rate limit exceeded" : undefined,
  };
}

/**
 * Security headers for rate-limited endpoints
 * Returns headers to include in API responses
 */
export function getRateLimitHeaders(
  userId: string,
  operation: RateLimitOperation
): Record<string, string> {
  const status = getRateLimitStatus(userId, operation);

  return {
    "X-RateLimit-Limit": RATE_LIMIT_CONFIGS[operation].maxRequests.toString(),
    "X-RateLimit-Remaining": status.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(status.resetTime / 1000).toString(),
    "X-RateLimit-Policy": `${RATE_LIMIT_CONFIGS[operation].maxRequests};w=${
      RATE_LIMIT_CONFIGS[operation].windowMs / 1000
    }`,
  };
}

// Set up cleanup interval (run every hour)
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredEntries, 60 * 60 * 1000);
}
