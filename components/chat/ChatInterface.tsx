"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConversations } from "@/hooks/useConversations";
import { useChat } from "@/hooks/useChat";
import { useModels } from "@/hooks/useModels";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/nextjs";
import {
  usePersonalization,
  useVisualPreferences,
} from "@/hooks/useUserPreferences";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Code, BarChart3, GraduationCap, Clock } from "lucide-react";
import { ShareModal } from "./ShareModal";
import { ChatSidebar } from "./ChatSidebar";
import { useStreamRecovery } from "@/hooks/useStreamRecovery";
import { ConversationBranchModal } from "./ConversationBranchModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Extracted components
import { WelcomeInterface } from "./WelcomeInterface";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";

// Custom hooks
import { useChatState } from "@/hooks/useChatState";
import { useMessageHandling } from "@/hooks/useMessageHandling";
import { useEnabledModels } from "@/hooks/useEnabledModels";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: Date | string;
  model?: string;
  isLoading?: boolean;
  error?: string;
  metadata?: {
    streamingComplete?: boolean;
    processingTime?: number;
    regenerated?: boolean;
    provider?: string;
    error?: boolean;
    attachments?: Array<{
      type: "image" | "pdf" | "text";
      url: string;
      filename: string;
      size: number;
      extractedText?: string;
      thumbnailUrl?: string;
      metadata?: {
        width?: number;
        height?: number;
        pages?: number;
        wordCount?: number;
      };
    }>;
    // Enhanced for image generation integration
    generatedImage?: {
      id: string;
      url: string;
      prompt: string;
      revisedPrompt?: string;
      provider: string;
      model: string;
      generationSettings: {
        size: string;
        quality: string;
        style: string;
      };
      dimensions: {
        width: number;
        height: number;
      };
      metadata: {
        generationTime: number;
        estimatedCost: number;
        format: string;
      };
      createdAt: string;
    };
    imageGenerationDetected?: boolean;
    suggestedImagePrompts?: string[];
    // Branching metadata
    branchingMetadata?: {
      branchId?: string;
      branchName?: string;
      hasChildren?: boolean;
      childrenCount?: number;
      isAlternative?: boolean;
      alternatives?: Array<{
        id: string;
        name: string;
        messageCount: number;
      }>;
    };
  };
}

interface ChatInterfaceProps {
  chatId: string;
}

export function ChatInterface({ chatId }: ChatInterfaceProps) {
  const router = useRouter();
  const { user } = useUser();
  const personalization = usePersonalization();
  const visualPrefs = useVisualPreferences();
  const [selectedModel, setSelectedModel] = useState<string>("");
  const { toast } = useToast();

  // Custom hooks for state management
  const chatState = useChatState({ chatId, selectedModel, setSelectedModel });

  // Debug logging (reduced noise)
  useEffect(() => {
    console.log("ChatInterface: chatId changed to:", chatId);
  }, [chatId]);

  // CRITICAL DEBUG: Track selectedModel changes
  useEffect(() => {
    console.log("🤖 ChatInterface: selectedModel changed to:", selectedModel);
  }, [selectedModel]);

  // API hooks
  const {
    conversations,
    loading: conversationsLoading,
    createConversation,
    refetchConversations,
  } = useConversations();
  const {
    messages,
    conversation,
    loading: messagesLoading,
    error: chatError,
    isStreaming,
    hasMore,
    sendMessage,
    loadMoreMessages,
    lastSyncTime,
    syncMessages,
    currentStreamId,
    streamProgress,
    canPauseStream,
    pauseStream,
    resumeStream,
  } = useChat(chatId);
  const { models, loading: modelsLoading, getModelById } = useModels();
  const { enabledModels } = useEnabledModels();

  // CRITICAL DEBUG: Track conversation changes
  useEffect(() => {
    if (conversation) {
      console.log("💬 ChatInterface: conversation loaded:", {
        id: conversation.id,
        title: conversation.title,
        model: conversation.model,
        currentSelectedModel: selectedModel,
      });
    }
  }, [conversation, selectedModel]);

  // Message handling hook
  const { handleSendMessage, handlePauseStream } = useMessageHandling({
    chatId,
    selectedModel,
    sendMessage,
  });

  // Stream recovery hook
  const {
    recoverableStreams,
    isLoading: isRecoveryLoading,
    resumeStream: handleResumeStream,
    discardStream,
    discardAllStreams,
    triggerDetection,
  } = useStreamRecovery({
    conversationId: chatId,
    autoDetect: true,
    showNotifications: true,
  });

  // Show toast notification for chat errors
  useEffect(() => {
    if (chatError) {
      toast({
        variant: "destructive",
        title: "Chat Error",
        description: chatError,
      });
    }
  }, [chatError, toast]);

  // Refresh conversations when conversation title changes
  useEffect(() => {
    if (
      conversation?.title &&
      conversation.title !== "New Chat" &&
      !conversation.title.startsWith("New Chat") &&
      conversation.title !== chatState.lastRefreshedTitleRef.current
    ) {
      const timeoutId = setTimeout(() => {
        refetchConversations();
        chatState.lastRefreshedTitleRef.current = conversation.title;
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [
    conversation?.title,
    refetchConversations,
    chatState.lastRefreshedTitleRef,
  ]);

  // Create new chat function
  const handleCreateNewChat = async () => {
    const conversation = await createConversation({
      title: "New Chat",
      model: selectedModel,
    });

    if (conversation) {
      router.push(`/chat/${conversation.id}`);
    }
  };

  // Quick actions for welcome screen
  const quickActions = [
    {
      icon: Sparkles,
      title: "Create",
      description: "Generate content, write, brainstorm",
      color: "emerald",
    },
    {
      icon: Code,
      title: "Code",
      description: "Debug, explain, write code",
      color: "blue",
    },
    {
      icon: BarChart3,
      title: "Analyze",
      description: "Research, analyze data, summarize",
      color: "purple",
    },
    {
      icon: GraduationCap,
      title: "Learn",
      description: "Explain concepts, tutorials",
      color: "amber",
    },
  ];

  const suggestedPrompts = [
    "Help me debug this React component",
    "Explain quantum computing in simple terms",
    "Write a professional email to my client",
    "Create a meal plan for this week",
    "Review my code for best practices",
  ];

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(
        chatState.inputValue,
        chatState.attachments,
        chatState.searchEnabled,
        chatState.setIsSearching,
        chatState.resetInput
      );
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        {/* ChatSidebar Component */}
        <ChatSidebar
          isCollapsed={chatState.sidebarCollapsed}
          onToggleCollapse={() =>
            chatState.setSidebarCollapsed(!chatState.sidebarCollapsed)
          }
          currentChatId={chatId}
          selectedModel={selectedModel}
          onCreateNewChat={handleCreateNewChat}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-transparent to-slate-800/50" />
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

          {/* Header */}
          <ChatHeader
            conversationTitle={
              conversation?.title ||
              (messages.length > 0 ? "🔥 Chat Session" : "✨ New Conversation")
            }
            conversationModel={conversation?.model}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            lastSyncTime={lastSyncTime || undefined}
            onShareClick={() => chatState.setShowShareModal(true)}
            hasConversation={!!conversation || messages.length > 0}
          />

          {/* Messages Area */}
          <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-800/10 to-transparent" />
            <div className="absolute left-1/2 top-0 w-px h-full bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent transform -translate-x-1/2" />

            <ScrollArea className="h-full px-6 py-8 relative z-10">
              {messagesLoading ? (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="space-y-4">
                      <div className="flex justify-end">
                        <div className="bg-slate-700/30 rounded-lg p-4 max-w-xs animate-pulse">
                          <div className="h-4 bg-slate-600 rounded mb-2"></div>
                          <div className="h-4 bg-slate-600 rounded w-3/4"></div>
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-slate-800/30 rounded-lg p-4 max-w-xs animate-pulse">
                          <div className="h-4 bg-slate-600 rounded mb-2"></div>
                          <div className="h-4 bg-slate-600 rounded w-2/3"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <WelcomeInterface
                  quickActions={quickActions}
                  suggestedPrompts={suggestedPrompts}
                  onPromptSelect={chatState.setInputValue}
                />
              ) : (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {hasMore && (
                    <div className="flex justify-center">
                      <Button
                        variant="outline"
                        onClick={loadMoreMessages}
                        disabled={messagesLoading}
                        className="bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/50"
                      >
                        {messagesLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-transparent mr-2" />
                        ) : (
                          <Clock className="h-4 w-4 mr-2" />
                        )}
                        Load older messages
                      </Button>
                    </div>
                  )}

                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      user={user}
                      conversationId={chatId}
                      onImageGenerated={chatState.handleImageGenerated}
                      showInlineImageGeneration={
                        chatState.showInlineImageGeneration
                      }
                      recoverableStreams={recoverableStreams}
                      onResumeStream={handleResumeStream}
                      onDiscardStream={discardStream}
                      isRecoveryLoading={isRecoveryLoading}
                      onCreateBranch={chatState.handleCreateBranch}
                      onViewBranches={chatState.handleViewBranches}
                    />
                  ))}

                  {isStreaming && <TypingIndicator />}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Floating Artifacts Button */}
          {/* <div className="absolute top-4 right-4 z-10">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-slate-800/90 backdrop-blur-sm border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-700/90"
                  onClick={() => {
                    toast({
                      title: "Coming Soon",
                      description: "Conversation artifacts view will open here",
                    });
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Artifacts (
                  {
                    messages.filter((m) => (m.metadata as any)?.generatedImage)
                      .length
                  }
                  )
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View conversation artifacts and generated images</p>
              </TooltipContent>
            </Tooltip>
          </div> */}

          {/* Input Area */}
          <ChatInput
            inputValue={chatState.inputValue}
            onInputChange={chatState.setInputValue}
            onSendMessage={() =>
              handleSendMessage(
                chatState.inputValue,
                chatState.attachments,
                chatState.searchEnabled,
                chatState.setIsSearching,
                chatState.resetInput
              )
            }
            onKeyPress={handleKeyPress}
            attachments={chatState.attachments}
            onAttachmentsChange={chatState.setAttachments}
            showAttachments={chatState.showAttachments}
            onToggleAttachments={() =>
              chatState.setShowAttachments(!chatState.showAttachments)
            }
            searchEnabled={chatState.searchEnabled}
            onToggleSearch={() =>
              chatState.setSearchEnabled(!chatState.searchEnabled)
            }
            isSearching={chatState.isSearching}
            isStreaming={isStreaming}
            onPauseStream={() =>
              handlePauseStream(
                isStreaming,
                canPauseStream,
                chatState.isSearching,
                pauseStream,
                chatState.setIsSearching,
                triggerDetection
              )
            }
            conversationId={chatId}
            selectedModel={selectedModel}
            textareaRef={chatState.textareaRef}
            modelName={models.find((m) => m.id === selectedModel)?.name}
          />
        </div>
      </div>

      {/* Share Modal */}
      {conversation && (
        <ShareModal
          isOpen={chatState.showShareModal}
          onClose={() => chatState.setShowShareModal(false)}
          conversationId={conversation.id}
          conversationTitle={conversation.title}
        />
      )}

      {/* Conversation Branch Modal */}
      <ConversationBranchModal
        isOpen={chatState.showCreateBranchModal}
        onClose={chatState.clearBranchingModal}
        parentConversationId={chatId}
        parentConversationTitle={conversation?.title || "New Conversation"}
        branchFromMessage={chatState.branchingFromMessage}
      />
    </TooltipProvider>
  );
}
