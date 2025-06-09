import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/toaster";
import { PreferencesProvider } from "@/hooks/useUserPreferences";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conversational Glass AI - Revolutionary Chat Experience",
  description:
    "Where conversations float in space, with depth and layers that feel almost physical. Experience the future of AI chat with glassmorphic design and intelligent model switching.",
  keywords:
    "AI chat, glassmorphism, conversation, artificial intelligence, chat interface, T3 stack",
  authors: [{ name: "Conversational Glass AI Team" }],
  creator: "T3 ChatCloneathon Entry",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <PreferencesProvider>
            {children}
            <Toaster />
          </PreferencesProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
