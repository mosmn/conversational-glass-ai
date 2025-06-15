/**
 * Get the base URL for the application based on environment
 */
export function getBaseUrl(): string {
  // Check if we're in production (Vercel)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Check for explicit NEXT_PUBLIC_APP_URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Check if we're in production environment
  if (process.env.NODE_ENV === "production") {
    return "https://conversational-glass-ai.vercel.app";
  }

  // Development fallback
  return "http://localhost:3000";
}

/**
 * Generate a share URL for a conversation
 */
export function generateShareUrl(shareId: string): string {
  return `${getBaseUrl()}/shared/${shareId}`;
}
