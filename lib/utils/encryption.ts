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
 * Advanced security audit for encryption configuration
 * Provides comprehensive security analysis and recommendations
 */
export function auditEncryptionConfig(): {
  isSecure: boolean;
  score: number; // 0-100 security score
  warnings: string[];
  recommendations: string[];
  critical: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  const critical: string[] = [];
  let score = 100;

  // Check encryption secret
  const hasCustomSecret =
    process.env.ENCRYPTION_SECRET &&
    process.env.ENCRYPTION_SECRET !==
      "your-super-secret-encryption-key-change-in-production-min-32-chars";

  if (!hasCustomSecret) {
    critical.push("Using default encryption secret - CRITICAL SECURITY RISK");
    score -= 40;
  } else if (process.env.ENCRYPTION_SECRET!.length < 32) {
    critical.push("Encryption secret is too short (minimum 32 characters)");
    score -= 30;
  } else if (process.env.ENCRYPTION_SECRET!.length < 64) {
    warnings.push(
      "Encryption secret should be at least 64 characters for maximum security"
    );
    score -= 10;
  }

  // Check if running in production
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !hasCustomSecret) {
    critical.push(
      "Production environment detected with default encryption secret"
    );
    score -= 20;
  }

  // Check environment variable exposure
  if (process.env.ENCRYPTION_SECRET && typeof window !== "undefined") {
    critical.push("Encryption secret may be exposed to client-side code");
    score -= 50;
  }

  // Security recommendations
  if (score === 100) {
    recommendations.push("Consider implementing key rotation mechanisms");
    recommendations.push(
      "Set up monitoring for encryption/decryption failures"
    );
    recommendations.push("Implement audit logging for key operations");
  }

  if (!process.env.ENCRYPTION_SECRET_BACKUP) {
    recommendations.push(
      "Consider setting up a backup encryption secret for key rotation"
    );
    score -= 5;
  }

  // Check crypto module availability
  try {
    crypto.randomBytes(16);
  } catch {
    critical.push("Crypto module not available - encryption will fail");
    score -= 30;
  }

  return {
    isSecure: critical.length === 0 && score >= 80,
    score: Math.max(0, score),
    warnings,
    recommendations,
    critical,
  };
}

/**
 * Generate a rotation-ready encryption key from user ID and rotation token
 * Allows for seamless key rotation without losing access to existing data
 */
export function generateRotatedUserEncryptionKey(
  userId: string,
  rotationToken?: string
): Buffer {
  const baseKey = userId + (rotationToken || "");
  const rotatedSalt = crypto.pbkdf2Sync(
    baseKey,
    encryptionSecret + (rotationToken || ""),
    100000,
    ENCRYPTION_CONFIG.keyLength,
    "sha256"
  );
  return rotatedSalt;
}

/**
 * Encrypt API key with rotation support
 * Includes rotation metadata for future key migrations
 */
export function encryptApiKeyWithRotation(
  apiKey: string,
  userId: string,
  rotationToken?: string
): string {
  try {
    const key = rotationToken
      ? generateRotatedUserEncryptionKey(userId, rotationToken)
      : generateUserEncryptionKey(userId);

    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);
    const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);
    cipher.setAAD(Buffer.from(userId + (rotationToken || "")));

    let encrypted = cipher.update(apiKey, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Include rotation metadata
    const metadata = {
      v: 2, // version
      r: rotationToken || null, // rotation token
      t: Date.now(), // timestamp
    };

    const metadataBuffer = Buffer.from(JSON.stringify(metadata));
    const metadataLength = Buffer.alloc(2);
    metadataLength.writeUInt16BE(metadataBuffer.length);

    // Structure: [metadata_length][metadata][iv][encrypted_data][auth_tag]
    const combined = Buffer.concat([
      metadataLength,
      metadataBuffer,
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
 * Decrypt API key with rotation support
 * Automatically handles different encryption versions and rotations
 */
export function decryptApiKeyWithRotation(
  encryptedApiKey: string,
  userId: string
): { value: string; rotationToken?: string; version: number } {
  try {
    const combined = Buffer.from(encryptedApiKey, "base64");

    // Check if this is the new format with metadata
    if (combined.length > 2) {
      const metadataLength = combined.readUInt16BE(0);
      if (metadataLength > 0 && metadataLength < 200) {
        // Reasonable metadata size
        try {
          const metadataBuffer = combined.subarray(2, 2 + metadataLength);
          const metadata = JSON.parse(metadataBuffer.toString());

          if (metadata.v === 2) {
            // New format with rotation support
            const dataStart = 2 + metadataLength;
            const iv = combined.subarray(
              dataStart,
              dataStart + ENCRYPTION_CONFIG.ivLength
            );
            const authTag = combined.subarray(-ENCRYPTION_CONFIG.tagLength);
            const encrypted = combined.subarray(
              dataStart + ENCRYPTION_CONFIG.ivLength,
              -ENCRYPTION_CONFIG.tagLength
            );

            const key = metadata.r
              ? generateRotatedUserEncryptionKey(userId, metadata.r)
              : generateUserEncryptionKey(userId);

            const decipher = crypto.createDecipheriv(
              ENCRYPTION_CONFIG.algorithm,
              key,
              iv
            );
            decipher.setAuthTag(authTag);
            decipher.setAAD(Buffer.from(userId + (metadata.r || "")));

            let decrypted = decipher.update(encrypted, undefined, "utf8");
            decrypted += decipher.final("utf8");

            return {
              value: decrypted,
              rotationToken: metadata.r,
              version: metadata.v,
            };
          }
        } catch {
          // Fall through to legacy format
        }
      }
    }

    // Legacy format - use existing decryption
    const value = decryptApiKey(encryptedApiKey, userId);
    return { value, version: 1 };
  } catch (error) {
    throw new Error(
      `Failed to decrypt API key: ${
        error instanceof Error ? error.message : "Invalid encrypted data"
      }`
    );
  }
}

/**
 * Secure key rotation utility
 * Re-encrypts all user keys with a new rotation token
 */
export async function rotateUserKeys(
  userId: string,
  newRotationToken: string,
  encryptedKeys: string[]
): Promise<string[]> {
  const rotatedKeys: string[] = [];

  for (const encryptedKey of encryptedKeys) {
    try {
      // Decrypt with current key
      const { value } = decryptApiKeyWithRotation(encryptedKey, userId);

      // Re-encrypt with new rotation token
      const newEncryptedKey = encryptApiKeyWithRotation(
        value,
        userId,
        newRotationToken
      );
      rotatedKeys.push(newEncryptedKey);
    } catch (error) {
      throw new Error(
        `Failed to rotate key: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  return rotatedKeys;
}

/**
 * Export encrypted keys for backup/migration
 * Creates a secure backup format that can be restored later
 */
export function exportUserKeys(
  userId: string,
  encryptedKeys: {
    id: string;
    provider: string;
    keyName: string;
    encryptedKey: string;
  }[],
  exportPassword: string
): string {
  try {
    // Create export package
    const exportData = {
      version: 1,
      userId: crypto.createHash("sha256").update(userId).digest("hex"), // Hashed for privacy
      timestamp: Date.now(),
      keys: encryptedKeys.map((key) => ({
        id: key.id,
        provider: key.provider,
        keyName: key.keyName,
        encryptedKey: key.encryptedKey, // Already encrypted with user's key
      })),
    };

    // Encrypt the entire export with the user's password
    const exportJson = JSON.stringify(exportData);
    const salt = crypto.randomBytes(32);
    const exportKey = crypto.pbkdf2Sync(
      exportPassword,
      salt,
      100000,
      32,
      "sha256"
    );
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv("aes-256-gcm", exportKey, iv);
    let encrypted = cipher.update(exportJson, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    const exportPackage = {
      version: 1,
      salt: salt.toString("base64"),
      iv: iv.toString("base64"),
      data: encrypted,
      authTag: authTag.toString("base64"),
    };

    return JSON.stringify(exportPackage);
  } catch (error) {
    throw new Error(
      `Failed to export keys: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Audit log entry for key operations
 * Creates structured audit logs without exposing sensitive data
 */
export function createKeyAuditLog(
  userId: string,
  operation: "create" | "test" | "delete" | "rotate" | "export" | "import",
  provider: string,
  metadata?: Record<string, any>
): {
  timestamp: string;
  userId: string;
  operation: string;
  provider: string;
  success: boolean;
  metadata?: Record<string, any>;
  fingerprint: string;
} {
  const timestamp = new Date().toISOString();
  const fingerprint = crypto
    .createHash("sha256")
    .update(`${userId}:${operation}:${provider}:${timestamp}`)
    .digest("hex")
    .substring(0, 16);

  return {
    timestamp,
    userId: crypto
      .createHash("sha256")
      .update(userId)
      .digest("hex")
      .substring(0, 16), // Anonymized
    operation,
    provider,
    success: true, // Will be set by caller
    metadata: metadata || {},
    fingerprint,
  };
}
