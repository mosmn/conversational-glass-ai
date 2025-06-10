import {
  SiOpenai,
  SiAnthropic,
  SiGoogle,
  SiMeta,
  SiApple,
  SiNvidia,
} from "@icons-pack/react-simple-icons";
import { Brain, Zap, Cpu, Sparkles, Rocket, Settings } from "lucide-react";
import React, { ComponentType } from "react";

// Type for icon components (compatible with both Simple Icons and Lucide)
type IconComponent = ComponentType<{
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}>;

// Provider to logo mapping
export const providerLogos: Record<string, IconComponent> = {
  openai: SiOpenai,
  anthropic: SiAnthropic,
  claude: SiAnthropic, // Claude is made by Anthropic
  google: SiGoogle,
  gemini: SiGoogle, // Gemini is made by Google
  groq: ({ className, size = 16 }) => (
    // Groq doesn't have a logo in Simple Icons yet, so we'll use a custom SVG
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  meta: SiMeta,
  apple: SiApple,
  nvidia: SiNvidia,
  microsoft: ({ className, size = 16 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M2 2h9v9H2V2zm11 0h9v9h-9V2zM2 13h9v9H2v-9zm11 0h9v9h-9v-9z" />
    </svg>
  ),
  amazon: ({ className, size = 16 }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M15.93 17.09c-.39.37-.96.37-1.35 0L12 14.2l-2.58 2.89c-.39.37-.96.37-1.35 0-.37-.39-.37-.96 0-1.35L10.65 13 8.07 10.26c-.37-.39-.37-.96 0-1.35.39-.37.96-.37 1.35 0L12 11.8l2.58-2.89c.39-.37.96-.37 1.35 0 .37.39.37.96 0 1.35L13.35 13l2.58 2.74c.37.39.37.96 0 1.35z" />
    </svg>
  ),
  openrouter: ({ className, size = 16 }) => (
    // OpenRouter custom icon
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2L22 8.5v7L12 22l-10-6.5v-7L12 2zm0 2.5L4.5 9.25v5.5L12 19.25l7.5-4.5v-5.5L12 4.5z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  // Fallback icons for unknown providers
  default: Brain,
};

// Get provider icon component
export const getProviderIcon = (provider: string): IconComponent => {
  const normalizedProvider = provider.toLowerCase().trim();
  return providerLogos[normalizedProvider] || providerLogos.default;
};

// Get model-specific icon based on model characteristics
export const getModelIcon = (
  modelName: string,
  provider: string
): IconComponent => {
  const normalizedProvider = provider.toLowerCase();
  const normalizedName = modelName.toLowerCase();

  // Special cases for specific models
  if (normalizedProvider === "groq") {
    if (normalizedName.includes("70b") || normalizedName.includes("large")) {
      return ({ className, size = 16 }) => (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          className={className}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    }
    if (normalizedName.includes("guard") || normalizedName.includes("tool")) {
      return Settings;
    }
  }

  if (normalizedProvider === "openai") {
    if (normalizedName.includes("gpt-4") || normalizedName.includes("4o")) {
      return SiOpenai;
    }
    if (normalizedName.includes("gpt-3.5") || normalizedName.includes("3.5")) {
      return Rocket;
    }
  }

  // Default to provider icon
  return getProviderIcon(provider);
};

// Provider color mapping for consistent theming
export const providerColors: Record<string, string> = {
  openai: "#10A37F", // OpenAI green
  anthropic: "#D4A574", // Anthropic orange
  claude: "#D4A574", // Same as Anthropic
  google: "#4285F4", // Google blue
  gemini: "#4285F4", // Same as Google
  groq: "#F55036", // Groq orange/red
  microsoft: "#0078D4", // Microsoft blue
  meta: "#1877F2", // Meta blue
  apple: "#000000", // Apple black
  amazon: "#FF9900", // Amazon orange
  nvidia: "#76B900", // NVIDIA green
  openrouter: "#8B5CF6", // Purple
  default: "#6B7280", // Gray
};

// Get provider color
export const getProviderColor = (provider: string): string => {
  const normalizedProvider = provider.toLowerCase().trim();
  return providerColors[normalizedProvider] || providerColors.default;
};

// Provider display names
export const providerDisplayNames: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  claude: "Anthropic",
  google: "Google",
  gemini: "Google",
  groq: "Groq",
  microsoft: "Microsoft",
  meta: "Meta",
  apple: "Apple",
  amazon: "Amazon",
  nvidia: "NVIDIA",
  openrouter: "OpenRouter",
};

// Get provider display name
export const getProviderDisplayName = (provider: string): string => {
  const normalizedProvider = provider.toLowerCase().trim();
  return providerDisplayNames[normalizedProvider] || provider;
};
