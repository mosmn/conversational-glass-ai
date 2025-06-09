"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConversations } from "@/hooks/useConversations";

export default function NewChatPage() {
  const router = useRouter();
  const { createConversation } = useConversations();

  useEffect(() => {
    const createNewChat = async () => {
      try {
        const conversation = await createConversation({
          title: "New Chat",
          model: "gpt-4",
        });

        if (conversation) {
          router.replace(`/chat/${conversation.id}`);
        } else {
          // Fallback to a default chat interface
          router.replace("/chat/temp-new");
        }
      } catch (error) {
        console.error("Failed to create new chat:", error);
        // Fallback to a default chat interface
        router.replace("/chat/temp-new");
      }
    };

    createNewChat();
  }, [createConversation, router]);

  return (
    <div className="flex h-screen bg-slate-900 text-white items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mx-auto"></div>
        <p className="text-slate-400">Creating new conversation...</p>
      </div>
    </div>
  );
}
