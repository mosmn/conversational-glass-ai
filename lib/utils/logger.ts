import pino from "pino";

// Determine if we're in development
const isDevelopment = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";

// Create base logger configuration
const baseConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),

  // Disable logging in test environment unless explicitly enabled
  enabled: !isTest || process.env.ENABLE_TEST_LOGGING === "true",

  // Redact sensitive information
  redact: {
    paths: [
      "apiKey",
      "api_key",
      "password",
      "token",
      "authorization",
      "cookie",
      "openai_api_key",
      "anthropic_api_key",
      "google_ai_api_key",
      "groq_api_key",
      "clerk_secret_key",
      "database_url",
      "encryption_secret",
      "*.apiKey",
      "*.api_key",
      "*.password",
      "*.token",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },

  // Custom serializers for common objects
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },

  // Add timestamp in production
  timestamp: isDevelopment ? false : pino.stdTimeFunctions.isoTime,
};

// Development configuration with pretty printing
const developmentConfig: pino.LoggerOptions = {
  ...baseConfig,
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
      singleLine: false,
      hideObject: false,
    },
  },
};

// Production configuration with structured JSON logging
const productionConfig: pino.LoggerOptions = {
  ...baseConfig,
  formatters: {
    level: (label) => {
      return { level: label };
    },
    log: (object) => {
      // Add common fields for structured logging
      return {
        ...object,
        service: "conversational-glass-ai",
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV || "production",
      };
    },
  },
};

// Create the logger instance
const logger = pino(isDevelopment ? developmentConfig : productionConfig);

// Create child loggers for different modules
export const aiLogger = logger.child({ module: "ai" });
export const apiLogger = logger.child({ module: "api" });
export const dbLogger = logger.child({ module: "database" });
export const authLogger = logger.child({ module: "auth" });
export const fileLogger = logger.child({ module: "files" });
export const searchLogger = logger.child({ module: "search" });
export const streamLogger = logger.child({ module: "streaming" });
export const voiceLogger = logger.child({ module: "voice" });
export const storageLogger = logger.child({ module: "storage" });

// Utility functions for common logging patterns
export const loggers = {
  // AI Provider logging
  aiRequest: (provider: string, model: string, userId?: string) =>
    aiLogger.info(
      {
        provider,
        model,
        user: userId,
        event: "ai_request_start",
      },
      `🤖 AI Request: ${provider}/${model}`
    ),

  aiResponse: (
    provider: string,
    model: string,
    tokenCount?: number,
    duration?: number
  ) =>
    aiLogger.info(
      {
        provider,
        model,
        tokenCount,
        duration,
        event: "ai_response_complete",
      },
      `✅ AI Response: ${provider}/${model} (${tokenCount} tokens, ${duration}ms)`
    ),

  aiError: (provider: string, model: string, error: Error | string) =>
    aiLogger.error(
      {
        provider,
        model,
        error: typeof error === "string" ? error : error.message,
        event: "ai_error",
      },
      `❌ AI Error: ${provider}/${model} - ${
        typeof error === "string" ? error : error.message
      }`
    ),

  // API Request logging
  apiRequest: (method: string, path: string, userId?: string) =>
    apiLogger.info(
      {
        method,
        path,
        user: userId,
        event: "api_request",
      },
      `🌐 ${method} ${path}`
    ),

  apiResponse: (
    method: string,
    path: string,
    status: number,
    duration?: number
  ) =>
    apiLogger.info(
      {
        method,
        path,
        status,
        duration,
        event: "api_response",
      },
      `📤 ${method} ${path} - ${status} (${duration}ms)`
    ),

  apiError: (
    method: string,
    path: string,
    error: Error | string,
    status?: number
  ) =>
    apiLogger.error(
      {
        method,
        path,
        error: typeof error === "string" ? error : error.message,
        status,
        event: "api_error",
      },
      `🚨 ${method} ${path} - ${
        typeof error === "string" ? error : error.message
      }`
    ),

  // Database logging
  dbQuery: (operation: string, table: string, duration?: number) =>
    dbLogger.debug(
      {
        operation,
        table,
        duration,
        event: "db_query",
      },
      `🗄️ DB ${operation}: ${table} (${duration}ms)`
    ),

  dbError: (operation: string, table: string, error: Error | string) =>
    dbLogger.error(
      {
        operation,
        table,
        error: typeof error === "string" ? error : error.message,
        event: "db_error",
      },
      `💥 DB Error: ${operation} ${table} - ${
        typeof error === "string" ? error : error.message
      }`
    ),

  // File operations
  fileUpload: (filename: string, size: number, userId: string) =>
    fileLogger.info(
      {
        filename,
        size,
        user: userId,
        event: "file_upload",
      },
      `📤 File Upload: ${filename} (${size} bytes)`
    ),

  fileProcess: (filename: string, type: string, duration?: number) =>
    fileLogger.info(
      {
        filename,
        type,
        duration,
        event: "file_process",
      },
      `⚙️ File Process: ${filename} (${type}, ${duration}ms)`
    ),

  fileError: (filename: string, error: Error | string) =>
    fileLogger.error(
      {
        filename,
        error: typeof error === "string" ? error : error.message,
        event: "file_error",
      },
      `📁❌ File Error: ${filename} - ${
        typeof error === "string" ? error : error.message
      }`
    ),

  // Search operations
  searchRequest: (query: string, provider: string, userId?: string) =>
    searchLogger.info(
      {
        query: query.substring(0, 100), // Truncate long queries
        provider,
        user: userId,
        event: "search_request",
      },
      `🔍 Search: "${query.substring(0, 50)}..." via ${provider}`
    ),

  searchResults: (provider: string, resultCount: number, duration?: number) =>
    searchLogger.info(
      {
        provider,
        resultCount,
        duration,
        event: "search_results",
      },
      `🎯 Search Results: ${resultCount} results from ${provider} (${duration}ms)`
    ),

  // Authentication
  userLogin: (userId: string, method?: string) =>
    authLogger.info(
      {
        user: userId,
        method,
        event: "user_login",
      },
      `🔐 User Login: ${userId}`
    ),

  userLogout: (userId: string) =>
    authLogger.info(
      {
        user: userId,
        event: "user_logout",
      },
      `👋 User Logout: ${userId}`
    ),

  // Performance monitoring
  performance: (
    operation: string,
    duration: number,
    metadata?: Record<string, unknown>
  ) =>
    logger.info(
      {
        operation,
        duration,
        ...metadata,
        event: "performance",
      },
      `⏱️ Performance: ${operation} took ${duration}ms`
    ),

  // Security events
  security: (
    event: string,
    userId?: string,
    details?: Record<string, unknown>
  ) =>
    logger.warn(
      {
        event: "security_event",
        securityEvent: event,
        user: userId,
        ...details,
      },
      `🛡️ Security: ${event}`
    ),
};

// Export the main logger and child loggers
export { logger };
export default logger;

// Helper function to create custom child loggers
export const createLogger = (
  module: string,
  context?: Record<string, unknown>
) => {
  return logger.child({ module, ...context });
};

// Development helper to temporarily enable verbose logging
export const enableVerboseLogging = () => {
  if (isDevelopment) {
    logger.level = "trace";
    logger.info("🔊 Verbose logging enabled");
  }
};

// Helper to log function entry/exit (useful for debugging)
export const withLogging = <T extends (...args: any[]) => any>(
  fn: T,
  context: { module: string; operation: string }
): T => {
  return ((...args: Parameters<T>): ReturnType<T> => {
    const childLogger = logger.child(context);
    const start = Date.now();

    childLogger.debug({ args: args.length }, `🚀 Start: ${context.operation}`);

    try {
      const result = fn(...args);

      // Handle async functions
      if (result instanceof Promise) {
        return result
          .then((resolved) => {
            const duration = Date.now() - start;
            childLogger.debug(
              { duration },
              `✅ Complete: ${context.operation} (${duration}ms)`
            );
            return resolved;
          })
          .catch((error) => {
            const duration = Date.now() - start;
            childLogger.error(
              { error, duration },
              `❌ Error: ${context.operation} (${duration}ms)`
            );
            throw error;
          }) as ReturnType<T>;
      }

      // Handle sync functions
      const duration = Date.now() - start;
      childLogger.debug(
        { duration },
        `✅ Complete: ${context.operation} (${duration}ms)`
      );
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      childLogger.error(
        { error, duration },
        `❌ Error: ${context.operation} (${duration}ms)`
      );
      throw error;
    }
  }) as T;
};
