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
    icon: "/favicon.ico",
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
        <body suppressHydrationWarning={true}>
          <PreferencesProvider>
            {children}
            <Toaster />
          </PreferencesProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
