"use client";

import { useEffect, useState } from "react";
import { ChatInterface } from "@/components/chat/ChatInterface";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
  const [chatId, setChatId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Resolve params
  useEffect(() => {
    params.then(({ id }) => {
      setChatId(id);
      setIsLoading(false);
    });
  }, [params]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-slate-900 text-white items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mx-auto"></div>
          <p className="text-slate-400">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return <ChatInterface chatId={chatId} />;
}
