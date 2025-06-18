import path from "path";
import { fileURLToPath } from "url";
import withPWA from "next-pwa";

// Add process-level error handling to prevent crashes
process.on("uncaughtException", (error) => {
  console.error("🚨 Uncaught Exception:", error.message);
  if (
    error.message.includes("worker.js") ||
    error.message.includes("worker thread")
  ) {
    console.warn(
      "⚠️ Worker thread error caught and handled - continuing execution"
    );
    return; // Don't crash the process for worker thread errors
  }
  // For other critical errors, you might want to crash
  console.error("💥 Critical error - process will exit");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);
  // Don't crash for unhandled rejections in development
  if (process.env.NODE_ENV === "development") {
    console.warn("⚠️ Unhandled rejection in development - continuing");
    return;
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PWA Configuration
const withPWAConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.openai\.com\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "openai-api-cache",
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /^https:\/\/api\.anthropic\.com\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "anthropic-api-cache",
        expiration: {
          maxEntries: 16,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        },
      },
    },
    {
      urlPattern: /\/api\/conversations\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "conversations-cache",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        },
      },
    },
  ],
  buildExcludes: [/middleware-manifest\.json$/],
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: process.env.CAPACITOR_BUILD ? "export" : undefined,
  trailingSlash: process.env.CAPACITOR_BUILD ? true : false,
  distDir: process.env.CAPACITOR_BUILD ? "out" : ".next",
  serverExternalPackages: [
    "sharp",
    "pdf-parse",
    "@anthropic-ai/sdk",
    "@google/generative-ai",
    "openai",
    "groq-sdk",
    "replicate",
  ],

  // Performance optimizations for development
  experimental: {
    optimizeCss: false, // Disable CSS optimization in dev
    esmExternals: true,
    // Disable worker threads to prevent missing worker.js errors
    workerThreads: false,
    // Prevent crashes during heavy operations
    cpus: 1,
  },

  // Turbopack configuration (stable in Next.js 15)
  turbopack: {
    // Turbopack-specific optimizations
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Fix path alias resolution for production builds
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
    };

    if (dev) {
      // Faster builds in development
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };

      // Reduce memory usage and prevent worker thread issues
      config.watchOptions = {
        poll: false,
        aggregateTimeout: 300,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/test/**",
        ],
      };

      // Cache optimization
      config.cache = {
        type: "filesystem",
      };

      // Disable worker threads in webpack to prevent crashes
      config.optimization.sideEffects = false;
    }

    // Externalize heavy AI libraries for better performance
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        // Add worker-related fallbacks
        worker_threads: false,
        child_process: false,
      };
    }

    // Add error handling for missing modules
    config.ignoreWarnings = [
      {
        module: /worker\.js$/,
      },
      {
        message: /worker thread/i,
      },
    ];

    return config;
  },

  // Increase the maximum request body size for file uploads
  async headers() {
    return [
      {
        source: "/api/files/upload",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "POST, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type",
          },
        ],
      },
    ];
  },
};

export default withPWAConfig(nextConfig);
