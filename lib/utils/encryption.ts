import crypto from "crypto";
import { z } from "zod";

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: "aes-256-gcm" as const,
  keyLength: 32, // 256 bits
  ivLength: 16, // 128 bits
  tagLength: 16, // 128 bits
  saltLength: 32, // 256 bits
} as const;

// Environment validation
const encryptionEnvSchema = z.object({
  ENCRYPTION_SECRET: z
    .string()
    .min(32, "Encryption secret must be at least 32 characters"),
});

let encryptionSecret: string;
try {
  const env = encryptionEnvSchema.parse({
    ENCRYPTION_SECRET:
      process.env.ENCRYPTION_SECRET ||
      "your-super-secret-encryption-key-change-in-production-min-32-chars",
  });
  encryptionSecret = env.ENCRYPTION_SECRET;
} catch (error) {
  console.warn("Using default encryption secret - CHANGE IN PRODUCTION!");
  encryptionSecret =
    "your-super-secret-encryption-key-change-in-production-min-32-chars";
}

/**
 * Generate a user-specific encryption key from their user ID
 * This ensures each user's keys are encrypted with a unique key
 */
export function generateUserEncryptionKey(userId: string): Buffer {
  const userSalt = crypto.pbkdf2Sync(
    userId,
    encryptionSecret,
    100000, // iterations
    ENCRYPTION_CONFIG.keyLength,
    "sha256"
  );
  return userSalt;
}

/**
 * Encrypt an API key using AES-256-GCM
 * Returns base64 encoded string containing IV + encrypted data + auth tag
 */
export function encryptApiKey(apiKey: string, userId: string): string {
  try {
    const key = generateUserEncryptionKey(userId);
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
    const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
    cipher.setAAD(Buffer.from(userId)); // Additional authenticated data

    let encrypted = cipher.update(apiKey, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Combine IV + encrypted data + auth tag
    const combined = Buffer.concat([
      iv,
      Buffer.from(encrypted, "hex"),
      authTag,
    ]);

    return combined.toString("base64");
  } catch (error) {
    throw new Error(
      `Failed to encrypt API key: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Decrypt an API key using AES-256-GCM
 * Takes base64 encoded string and returns the original API key
 */
export function decryptApiKey(encryptedApiKey: string, userId: string): string {
  try {
    const key = generateUserEncryptionKey(userId);
    const combined = Buffer.from(encryptedApiKey, "base64");

    // Extract components
    const iv = combined.subarray(0, ENCRYPTION_CONFIG.ivLength);
    const authTag = combined.subarray(-ENCRYPTION_CONFIG.tagLength);
    const encrypted = combined.subarray(
      ENCRYPTION_CONFIG.ivLength,
      -ENCRYPTION_CONFIG.tagLength
    );

    const decipher = crypto.createDecipheriv(
      ENCRYPTION_CONFIG.algorithm,
      key,
      iv
    );
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from(userId)); // Additional authenticated data

    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(
      `Failed to decrypt API key: ${
        error instanceof Error ? error.message : "Invalid encrypted data"
      }`
    );
  }
}

/**
 * Generate a SHA-256 hash of an API key for duplicate detection
 * This allows us to check for duplicates without storing plaintext keys
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Validate that an encrypted API key can be successfully decrypted
 * Used for integrity checks
 */
export function validateEncryptedKey(
  encryptedApiKey: string,
  userId: string
): boolean {
  try {
    decryptApiKey(encryptedApiKey, userId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Securely compare two API keys without timing attacks
 * Uses constant-time comparison to prevent side-channel attacks
 */
export function secureCompareApiKeys(key1: string, key2: string): boolean {
  if (key1.length !== key2.length) {
    return false;
  }

  const hash1 = crypto.createHash("sha256").update(key1).digest();
  const hash2 = crypto.createHash("sha256").update(key2).digest();

  return crypto.timingSafeEqual(hash1, hash2);
}

/**
 * Generate a secure random string for API key names or identifiers
 */
export function generateSecureId(length: number = 16): string {
  return crypto.randomBytes(length).toString("hex").substring(0, length);
}

/**
 * Mask an API key for display purposes
 * Shows only the first 8 and last 4 characters
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 12) {
    return "*".repeat(apiKey.length);
  }

  const start = apiKey.substring(0, 8);
  const end = apiKey.substring(apiKey.length - 4);
  const middle = "*".repeat(Math.max(4, apiKey.length - 12));

  return `${start}${middle}${end}`;
}

/**
 * Validate API key format for different providers
 */
export function validateApiKeyFormat(
  apiKey: string,
  provider: string
): {
  isValid: boolean;
  error?: string;
} {
  if (!apiKey || typeof apiKey !== "string") {
    return { isValid: false, error: "API key is required" };
  }

  if (apiKey.length < 10) {
    return { isValid: false, error: "API key is too short" };
  }

  if (apiKey.length > 200) {
    return { isValid: false, error: "API key is too long" };
  }

  // Provider-specific validation
  switch (provider.toLowerCase()) {
    case "openai":
      if (!apiKey.startsWith("sk-")) {
        return {
          isValid: false,
          error: "OpenAI API keys should start with 'sk-'",
        };
      }
      break;

    case "claude":
    case "anthropic":
      if (!apiKey.startsWith("sk-ant-")) {
        return {
          isValid: false,
          error: "Anthropic API keys should start with 'sk-ant-'",
        };
      }
      break;

    case "gemini":
    case "google":
      // Google AI Studio keys are typically 39 characters
      if (apiKey.length < 30 || apiKey.length > 50) {
        return {
          isValid: false,
          error: "Google AI API key length seems invalid",
        };
      }
      break;

    case "openrouter":
      if (!apiKey.startsWith("sk-or-")) {
        return {
          isValid: false,
          error: "OpenRouter API keys should start with 'sk-or-'",
        };
      }
      break;

    case "groq":
      if (!apiKey.startsWith("gsk_")) {
        return {
          isValid: false,
          error: "Groq API keys should start with 'gsk_'",
        };
      }
      break;

    default:
      // Generic validation for unknown providers
      break;
  }

  // Check for common invalid patterns
  if (apiKey.includes(" ") || apiKey.includes("\n") || apiKey.includes("\t")) {
    return {
      isValid: false,
      error: "API key contains invalid whitespace characters",
    };
  }

  return { isValid: true };
}

/**
 * Security audit - check if encryption is properly configured
 */
export function auditEncryptionConfig(): {
  isSecure: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Check encryption secret strength
  if (
    encryptionSecret ===
    "your-super-secret-encryption-key-change-in-production-min-32-chars"
  ) {
    warnings.push("Using default encryption secret - CRITICAL SECURITY ISSUE");
    recommendations.push(
      "Set ENCRYPTION_SECRET environment variable to a strong, random 32+ character string"
    );
  }

  if (encryptionSecret.length < 32) {
    warnings.push("Encryption secret is too short");
    recommendations.push(
      "Use at least 32 characters for the encryption secret"
    );
  }

  // Check if we're in production with weak settings
  if (process.env.NODE_ENV === "production" && warnings.length > 0) {
    warnings.push("Production environment detected with security issues");
  }

  return {
    isSecure: warnings.length === 0,
    warnings,
    recommendations,
  };
}
