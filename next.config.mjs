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
  },

  // Turbopack configuration (stable in Next.js 15)
  turbopack: {
    // Turbopack-specific optimizations
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Faster builds in development
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };

      // Reduce memory usage
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
    }

    // Externalize heavy AI libraries for better performance
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

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

export default nextConfig;
