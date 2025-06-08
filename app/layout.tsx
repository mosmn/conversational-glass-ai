import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conversational Glass AI - Revolutionary Chat Experience",
  description:
    "Where conversations float in space, with depth and layers that feel almost physical. Experience the future of AI chat with glassmorphic design and intelligent model switching.",
  keywords:
    "AI chat, glassmorphism, conversation, artificial intelligence, chat interface, T3 stack",
  authors: [{ name: "Conversational Glass AI Team" }],
  creator: "T3 ChatCloneathon Entry",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
