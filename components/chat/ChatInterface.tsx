"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConversations } from "@/hooks/useConversations";
import { useHierarchicalConversations } from "@/hooks/useHierarchicalConversations";
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
  chatId?: string; // Make chatId optional
}

export function ChatInterface({ chatId }: ChatInterfaceProps) {
  const router = useRouter();
  const { user } = useUser();
  const personalization = usePersonalization();
  const visualPrefs = useVisualPreferences();
  const [selectedModel, setSelectedModel] = useState<string>("");
  const { toast } = useToast();

  // Optimistic chat ID state for smoother transitions
  const [optimisticChatId, setOptimisticChatId] = useState<string | undefined>(
    chatId
  );

  // Custom hooks for state management
  const chatState = useChatState({
    chatId: optimisticChatId || "temp",
    selectedModel,
    setSelectedModel,
  });

  // Update optimistic chat ID when prop changes
  useEffect(() => {
    console.log("ChatInterface: chatId changed to:", chatId);
    setOptimisticChatId(chatId);
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
    updateConversation,
    refetchConversations,
  } = useConversations();

  // Hierarchical conversations for sidebar updates
  const {
    updateConversation: updateHierarchicalConversation,
    refetchConversations: refetchHierarchical,
  } = useHierarchicalConversations();
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
  } = useChat(optimisticChatId || ""); // Use optimistic chat ID for smoother transitions
  const { models, loading: modelsLoading, getModelById } = useModels();
  const { enabledModels } = useEnabledModels();

  // Auto-select a valid model if none is selected or current selection is invalid
  useEffect(() => {
    if (!modelsLoading && models.length > 0 && enabledModels.length > 0) {
      if (!selectedModel) {
        // No model selected - pick the first enabled model
        const firstEnabledModel = enabledModels.find((m) => m.isEnabled);
        if (firstEnabledModel) {
          console.log(
            `🔄 Auto-selecting first enabled model: ${firstEnabledModel.id}`
          );
          setSelectedModel(firstEnabledModel.id);
        }
      } else {
        // Check if current selection is still valid
        const currentModelValid = enabledModels.find(
          (m) => m.id === selectedModel && m.isEnabled
        );
        if (!currentModelValid) {
          const fallbackModel = enabledModels.find((m) => m.isEnabled);
          if (fallbackModel) {
            console.warn(
              `⚠️ Current model '${selectedModel}' invalid, switching to: ${fallbackModel.id}`
            );
            setSelectedModel(fallbackModel.id);
            toast({
              title: "Model Updated",
              description: `Previous model no longer available. Switched to ${fallbackModel.name}.`,
              variant: "default",
            });
          }
        }
      }
    }
  }, [
    selectedModel,
    models,
    enabledModels,
    modelsLoading,
    setSelectedModel,
    toast,
  ]);

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

  // Message handling hook - always call but pass chatId (can be undefined)
  const messageHandling = useMessageHandling({
    chatId: optimisticChatId || "", // Pass empty string when no chatId
    selectedModel,
    sendMessage,
  });

  // Modified message handling for initial chat creation
  const handleSendMessageWithCreation = async (
    inputValue: string,
    attachments: any[],
    searchEnabled: boolean,
    setIsSearching: (searching: boolean) => void,
    resetInput: () => void
  ) => {
    if (!inputValue.trim() && attachments.length === 0) return;

    // If no chatId, create a new conversation and send the message directly
    if (!optimisticChatId) {
      try {
        // Validate the selected model before creating conversation
        let modelToUse = selectedModel;

        if (!modelToUse) {
          // If no model selected, use the first available enabled model
          const enabledModelsList = enabledModels.filter((m) => m.isEnabled);
          modelToUse =
            enabledModelsList.length > 0
              ? enabledModelsList[0].id
              : "llama-3.1-8b-instant";
          console.log(`🔄 No model selected, using fallback: ${modelToUse}`);
        } else {
          // Check if the selected model is available and enabled
          const selectedModelData = models.find((m) => m.id === selectedModel);
          const enabledModelsList = enabledModels.find(
            (m) => m.id === selectedModel && m.isEnabled
          );

          if (!selectedModelData || !enabledModelsList) {
            const fallbackModel = enabledModels.find((m) => m.isEnabled);
            modelToUse = fallbackModel
              ? fallbackModel.id
              : "llama-3.1-8b-instant";
            console.warn(
              `⚠️ Selected model '${selectedModel}' not available/enabled, using fallback: ${modelToUse}`
            );

            toast({
              title: "Model Updated",
              description: `Selected model not available. Using ${
                fallbackModel?.name || modelToUse
              } instead.`,
              variant: "default",
            });
          }
        }

        // CRITICAL FIX: Create conversation without initialMessage, then send message normally
        // This avoids the issue of creating duplicate user messages
        const newConversation = await createConversation({
          title: "New Chat",
          model: modelToUse,
          // Don't include initialMessage - we'll send it manually
        });

        if (newConversation) {
          console.log(`✅ Created conversation:`, newConversation);

          // Update the selected model to match what was actually used
          if (modelToUse !== selectedModel) {
            setSelectedModel(modelToUse);
          }

          // Optimistically update the chat ID for immediate UI response
          setOptimisticChatId(newConversation.id);

          // Navigate to the new chat using the unified route structure
          router.push(`/chat/${newConversation.id}`);

          // CRITICAL FIX: Now send the message normally using the chat send API
          // This will create both user message and AI response
          try {
            console.log(
              `🤖 Sending initial message to conversation ${newConversation.id}`
            );

            const sendResponse = await fetch("/api/chat/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                conversationId: newConversation.id,
                content: inputValue,
                model: modelToUse,
                attachments: attachments || [],
              }),
            });

            if (!sendResponse.ok) {
              console.error(
                "Failed to send initial message:",
                await sendResponse.text()
              );
              toast({
                title: "Warning",
                description: "Message sent but AI response may have failed",
                variant: "default",
              });
            } else {
              console.log("✅ Successfully sent initial message to AI");
            }
          } catch (error) {
            console.error("Error sending initial message:", error);
            toast({
              title: "Warning",
              description: "Message sent but AI response may have failed",
              variant: "default",
            });
          }

          // Clear the input after everything is done
          resetInput();
          return;
        } else {
          toast({
            title: "Error",
            description: "Failed to create new conversation",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        console.error("Failed to create conversation:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to create new conversation";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
    }

    // If we have a chatId, use the normal message handling
    if (optimisticChatId) {
      await messageHandling.handleSendMessage(
        inputValue,
        attachments,
        searchEnabled,
        setIsSearching,
        resetInput
      );
    }
  };

  // Clean up any old pending messages (no longer needed)
  useEffect(() => {
    if (optimisticChatId) {
      localStorage.removeItem("pendingMessage");
    }
  }, [optimisticChatId]);

  // Stream recovery hook
  const {
    recoverableStreams,
    isLoading: isRecoveryLoading,
    resumeStream: handleResumeStream,
    discardStream,
    discardAllStreams,
    triggerDetection,
  } = useStreamRecovery({
    conversationId: optimisticChatId,
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

  // Update conversation in place when title changes (no refetch needed)
  useEffect(() => {
    const currentChatId = optimisticChatId || chatId;
    if (
      conversation?.title &&
      conversation.title !== "New Chat" &&
      !conversation.title.startsWith("New Chat") &&
      conversation.title !== chatState.lastRefreshedTitle &&
      currentChatId
    ) {
      // Update both conversation stores without refetching
      updateConversation(currentChatId, {
        title: conversation.title,
        updatedAt: new Date().toISOString(),
      });

      updateHierarchicalConversation(currentChatId, {
        title: conversation.title,
        updatedAt: new Date().toISOString(),
      });

      // Also trigger a sidebar refresh as a fallback to ensure the title update is visible
      refetchConversations();
      refetchHierarchical();

      chatState.setLastRefreshedTitle(conversation.title);
      console.log(
        "🔄 Updated conversation title in both sidebar stores and triggered refresh:",
        conversation.title,
        "for chatId:",
        currentChatId
      );
    }
  }, [
    conversation?.title,
    updateConversation,
    updateHierarchicalConversation,
    refetchConversations,
    refetchHierarchical,
    optimisticChatId,
    chatId,
    chatState.lastRefreshedTitle,
    chatState.setLastRefreshedTitle,
  ]);

  // Create new chat function
  const handleCreateNewChat = async () => {
    router.push("/chat");
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
      handleSendMessageWithCreation(
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
          currentChatId={optimisticChatId || ""}
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
                      conversationId={optimisticChatId || ""}
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
              handleSendMessageWithCreation(
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
            onPauseStream={() => {
              if (optimisticChatId) {
                messageHandling.handlePauseStream(
                  isStreaming,
                  canPauseStream,
                  chatState.isSearching,
                  pauseStream,
                  chatState.setIsSearching,
                  triggerDetection
                );
              }
            }}
            conversationId={optimisticChatId || ""}
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
        parentConversationId={optimisticChatId || ""}
        parentConversationTitle={conversation?.title || "New Conversation"}
        branchFromMessage={chatState.branchingFromMessage}
      />
    </TooltipProvider>
  );
}
