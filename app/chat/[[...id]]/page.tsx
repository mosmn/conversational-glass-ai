"use client";

import { useEffect, useState } from "react";
import { ChatInterface } from "../../../components/chat/ChatInterface";

interface UnifiedChatPageProps {
  params: Promise<{ id?: string[] }>;
}

export default function UnifiedChatPage({ params }: UnifiedChatPageProps) {
  const [chatId, setChatId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Resolve params
  useEffect(() => {
    params.then(({ id }) => {
      // If id array exists and has a value, use the first one as chatId
      // Otherwise, keep it undefined for the home/welcome state
      const resolvedChatId = id && id.length > 0 ? id[0] : undefined;
      setChatId(resolvedChatId);
      setIsLoading(false);
    });
  }, [params]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mx-auto"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Always render the same ChatInterface component
  // It will handle both welcome state (chatId=undefined) and chat state (chatId=string)
  return <ChatInterface chatId={chatId} />;
}
