import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/toaster";
import { PreferencesProvider } from "@/hooks/useUserPreferences";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { GlobalKeyboardShortcuts } from "@/components/GlobalKeyboardShortcuts";
import "./globals.css";

// Import storage utilities to make them available globally
import "@/lib/streaming/storage-utils";

export const metadata: Metadata = {
  title: "Conversational Glass AI - Revolutionary Chat Experience",
  description:
    "Where conversations float in space, with depth and layers that feel almost physical. Experience the future of AI chat with glassmorphic design and intelligent model switching.",
  keywords:
    "AI chat, glassmorphism, conversation, artificial intelligence, chat interface, T3 stack",
  authors: [{ name: "Conversational Glass AI Team" }],
  creator: "T3 ChatCloneathon Entry",
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Glass AI",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Conversational Glass AI",
    title: "Revolutionary AI Chat Experience",
    description: "Experience the future of AI chat with glassmorphic design",
  },
  twitter: {
    card: "summary_large_image",
    title: "Conversational Glass AI",
    description: "Revolutionary AI chat with glassmorphic design",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          {/* PWA iOS Compatibility */}
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="black-translucent"
          />
          <meta name="apple-mobile-web-app-title" content="Glass AI" />
          <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
          <link
            rel="apple-touch-startup-image"
            href="/icons/icon-512x512.png"
          />

          {/* PWA Theme Colors */}
          <meta name="theme-color" content="#0f172a" />
          <meta name="msapplication-TileColor" content="#0f172a" />
          <meta name="msapplication-config" content="/browserconfig.xml" />

          {/* Enhanced Mobile Viewport */}
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="application-name" content="Glass AI" />
        </head>
        <body suppressHydrationWarning={true}>
          <PreferencesProvider>
            <GlobalKeyboardShortcuts />
            {children}
            <Toaster />
            <PWAInstallPrompt />
          </PreferencesProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
