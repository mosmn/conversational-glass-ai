"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { useConversations } from "@/hooks/useConversations";
import { useHierarchicalConversations } from "@/hooks/useHierarchicalConversations";
import { useChat } from "@/hooks/useChat";
import { useModels } from "@/hooks/useModels";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@clerk/nextjs";
import {
  useChatErrorHandling,
  useAPIErrorHandling,
} from "@/hooks/useChatErrorHandling";
import { ChatErrorBoundary } from "./ChatErrorBoundary";
import { ErrorCategory } from "@/lib/utils/chat-error-handler";
import {
  usePersonalization,
  useVisualPreferences,
  useUserPreferences,
} from "@/hooks/useUserPreferences";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Code,
  BarChart3,
  GraduationCap,
  Clock,
  ChevronDown,
} from "lucide-react";
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
import { FailedMessageRetryBanner } from "./FailedMessageRetryBanner";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { FloatingMobileActions } from "./FloatingMobileActions";

// Custom hooks
import { useChatState } from "@/hooks/useChatState";
import { useMessageHandling } from "@/hooks/useMessageHandling";
import { useEnabledModels } from "@/hooks/useEnabledModels";
import { useResponsive } from "@/hooks/useResponsive";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { usePersistentModel } from "@/hooks/usePersistentModel";

// Performance optimization constants
const MESSAGE_RENDER_BATCH_SIZE = 10;
const SCROLL_DEBOUNCE_MS = 100;
const RESIZE_DEBOUNCE_MS = 250;

// Helper for debouncing to prevent excessive re-renders
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Performance optimization helper for batched operations
const batchUpdates = (callback: () => void) => {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(callback, { timeout: 100 });
  } else {
    setTimeout(callback, 0);
  }
};

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
  const { preferences } = useUserPreferences();
  const {
    selectedModel,
    setSelectedModel,
    isInitialized: modelInitialized,
  } = usePersistentModel();
  const { toast } = useToast();
  const { isMobile } = useResponsive();

  // Standardized error handling
  const { handleError: handleChatError } = useChatErrorHandling({
    conversationId: chatId,
    userId: user?.id,
  });

  const { handleError: handleAPIError } = useAPIErrorHandling(
    "/api/chat/send",
    {
      conversationId: chatId,
    }
  );

  // Auto-scroll refs
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track if user is at the bottom of scroll
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  // Track when a message was just sent to force auto-scroll
  const [justSentMessage, setJustSentMessage] = useState(false);

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

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      chatState.setSidebarCollapsed(true);
    }
  }, [isMobile, chatState.setSidebarCollapsed]);

  // Check if user is at bottom of scroll
  const checkIfAtBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (viewport) {
        const { scrollTop, scrollHeight, clientHeight } = viewport;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50; // 50px threshold
        const wasAtBottom = isAtBottom;
        setIsAtBottom(isNearBottom);

        // If user scrolled away from bottom, disable auto-scroll
        if (wasAtBottom && !isNearBottom) {
          setShouldAutoScroll(false);
        }
        // If user scrolled back to bottom, re-enable auto-scroll
        else if (!wasAtBottom && isNearBottom) {
          setShouldAutoScroll(true);
        }

        return isNearBottom;
      }
    }
    return true;
  }, [isAtBottom]);

  // Auto-scroll function with better user intent detection
  const scrollToBottomViewport = useCallback(
    (smooth = true, force = false) => {
      if (
        scrollAreaRef.current &&
        (force || (isAtBottom && shouldAutoScroll) || justSentMessage)
      ) {
        const viewport = scrollAreaRef.current.querySelector(
          "[data-radix-scroll-area-viewport]"
        );
        if (viewport) {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: smooth ? "smooth" : "auto",
          });
          setIsAtBottom(true);
        }
      }
    },
    [isAtBottom, shouldAutoScroll, justSentMessage]
  );

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
    isRecovering,
  } = useChat(optimisticChatId || ""); // Use optimistic chat ID for smoother transitions
  const { models, loading: modelsLoading, getModelById } = useModels();
  const { enabledModels } = useEnabledModels();

  // Auto-scroll when NEW messages are added (only if user is at bottom or auto-scroll is enabled)
  const previousMessageCount = useRef(0);
  useEffect(() => {
    if (messages.length > previousMessageCount.current && messages.length > 0) {
      // Check if the newest message is from the user (just sent)
      const newestMessage = messages[messages.length - 1];
      const isUserMessage = newestMessage && newestMessage.role === "user";

      // Always auto-scroll if:
      // 1. User just sent a message (regardless of scroll position)
      // 2. User is at bottom and auto-scroll is enabled
      // 3. It's the first message
      const shouldScroll =
        isUserMessage ||
        isAtBottom ||
        shouldAutoScroll ||
        previousMessageCount.current === 0 ||
        justSentMessage;

      if (shouldScroll) {
        // Use a small delay to ensure the message is rendered
        const timeoutId = setTimeout(() => {
          scrollToBottomViewport(true);
          // Reset the just sent message flag after scrolling
          if (justSentMessage) {
            setJustSentMessage(false);
          }
        }, 100);

        // Update the previous count after attempting to scroll
        previousMessageCount.current = messages.length;
        return () => clearTimeout(timeoutId);
      } else {
        // Just update the count without scrolling
        previousMessageCount.current = messages.length;
      }
    } else {
      // Update count for any other changes (like message content updates)
      previousMessageCount.current = messages.length;
    }
  }, [
    messages.length,
    scrollToBottomViewport,
    isAtBottom,
    shouldAutoScroll,
    justSentMessage,
  ]);

  // Auto-scroll when streaming starts (only if user is at bottom)
  useEffect(() => {
    if (isStreaming && (isAtBottom || shouldAutoScroll || justSentMessage)) {
      // Scroll immediately when streaming starts, but only if user is at bottom or just sent a message
      scrollToBottomViewport(true);
    }
  }, [
    isStreaming,
    scrollToBottomViewport,
    isAtBottom,
    shouldAutoScroll,
    justSentMessage,
  ]);

  // Auto-scroll during streaming (for content updates) - only if user is at bottom
  const lastMessageContentRef = useRef("");
  useEffect(() => {
    if (
      isStreaming &&
      messages.length > 0 &&
      (isAtBottom || shouldAutoScroll || justSentMessage)
    ) {
      // Get the last message content to detect content changes
      const lastMessage = messages[messages.length - 1];
      if (
        lastMessage &&
        lastMessage.role === "assistant" &&
        lastMessage.content !== lastMessageContentRef.current
      ) {
        lastMessageContentRef.current = lastMessage.content;
        // Scroll during streaming content updates, but less frequently
        const timeoutId = setTimeout(() => {
          scrollToBottomViewport(false); // Use instant scroll during streaming for better UX
        }, 100); // Increased delay to reduce frequency
        return () => clearTimeout(timeoutId);
      }
    }
  }, [
    messages,
    isStreaming,
    scrollToBottomViewport,
    isAtBottom,
    shouldAutoScroll,
    justSentMessage,
  ]);

  // Set up scroll event listener to track user scroll position
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (viewport) {
        const handleScroll = () => {
          checkIfAtBottom();
        };

        viewport.addEventListener("scroll", handleScroll, { passive: true });
        return () => viewport.removeEventListener("scroll", handleScroll);
      }
    }
  }, [checkIfAtBottom]);

  // Reset auto-scroll state when chat changes
  useEffect(() => {
    setShouldAutoScroll(true);
    setIsAtBottom(true);
    // Reset refs when chat changes
    previousMessageCount.current = 0;
    lastMessageContentRef.current = "";
    // Reset message sent flag
    setJustSentMessage(false);
  }, [optimisticChatId]);

  // Model selection is now handled by usePersistentModel hook

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
    messages, // Pass current messages for conversation context
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

    // Set flag to indicate message is being sent
    setJustSentMessage(true);

    // If no chatId, create a new conversation first, then redirect and send normally
    if (!optimisticChatId) {
      try {
        // Validate the selected model before creating conversation
        let modelToUse = selectedModel;

        if (!modelToUse) {
          // If no model selected, use the first available enabled model
          const enabledModelsList = enabledModels.filter((m) => m.isEnabled);
          if (enabledModelsList.length > 0) {
            modelToUse = enabledModelsList[0].id;
            console.log(
              `🔄 No model selected, using first enabled model: ${modelToUse}`
            );
          } else {
            // Only use hardcoded fallback if no models are enabled at all
            modelToUse = "llama-3.1-8b-instant";
            console.warn(
              `⚠️ No enabled models found, using hardcoded fallback: ${modelToUse}`
            );
          }
        } else {
          // Check if the selected model is available and enabled
          const selectedModelData = models.find((m) => m.id === selectedModel);
          const enabledModelData = enabledModels.find(
            (m) => m.id === selectedModel
          );

          console.log(`🔍 Model validation:`, {
            selectedModel,
            selectedModelData: !!selectedModelData,
            enabledModelData: !!enabledModelData,
            totalModels: models.length,
            totalEnabledModels: enabledModels.length,
          });

          if (!selectedModelData || !enabledModelData) {
            // Use the first enabled model as fallback, not hardcoded default
            if (enabledModels.length > 0) {
              modelToUse = enabledModels[0].id;
              console.warn(
                `⚠️ Selected model '${selectedModel}' not available/enabled, using first enabled model: ${modelToUse}`
              );
            } else {
              // Only use hardcoded fallback if no models are enabled at all
              modelToUse = "llama-3.1-8b-instant";
              console.warn(
                `⚠️ Selected model '${selectedModel}' not available and no enabled models found, using hardcoded fallback: ${modelToUse}`
              );
            }
          } else {
            // The selected model is valid - use it!
            console.log(`✅ Using user's selected model: ${modelToUse}`);
          }
        }

        // Simple: Create conversation without any message
        const newConversation = await createConversation({
          title: "New Chat",
          model: modelToUse,
        });

        if (newConversation) {
          console.log(
            `✅ Created conversation ${newConversation.id} with model ${modelToUse}`
          );

          // Update the selected model to match what was actually used
          if (modelToUse !== selectedModel) {
            setSelectedModel(modelToUse);
          }

          // Store the message content temporarily so we can send it after redirect
          sessionStorage.setItem(
            "pendingMessage",
            JSON.stringify({
              content: inputValue,
              attachments: attachments || [],
              searchEnabled,
              modelToUse,
            })
          );

          // Navigate to the new chat
          router.push(`/chat/${newConversation.id}`);

          // Clear the input immediately
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
        await handleAPIError(error, async () => {
          // Retry conversation creation
          return handleCreateNewChat();
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

  // Handle pending message after redirect to new chat
  useEffect(() => {
    if (optimisticChatId && !messagesLoading) {
      const pendingMessage = sessionStorage.getItem("pendingMessage");
      if (pendingMessage) {
        try {
          const { content, attachments, searchEnabled, modelToUse } =
            JSON.parse(pendingMessage);
          sessionStorage.removeItem("pendingMessage");

          console.log(
            `🤖 Sending pending message to conversation ${optimisticChatId}`
          );

          // Send the message using normal flow
          messageHandling.handleSendMessage(
            content,
            attachments,
            searchEnabled,
            () => {}, // setIsSearching - not needed for pending messages
            () => {} // resetInput - already cleared
          );
        } catch (error) {
          console.error("Error sending pending message:", error);
          sessionStorage.removeItem("pendingMessage");
        }
      }
    }
  }, [optimisticChatId, messagesLoading, messageHandling]);

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
      console.log("🔄 Title update detected:", {
        currentTitle: conversation.title,
        lastRefreshedTitle: chatState.lastRefreshedTitle,
        chatId: currentChatId,
      });

      // Set the last refreshed title FIRST to prevent loops
      chatState.setLastRefreshedTitle(conversation.title);

      // Update both conversation stores
      const titleUpdate = {
        title: conversation.title,
        updatedAt: new Date().toISOString(),
      };

      // Update regular conversations list
      updateConversation(currentChatId, titleUpdate);

      // Update hierarchical conversations list (if the conversation exists there)
      updateHierarchicalConversation(currentChatId, titleUpdate);

      console.log(
        "✅ Updated conversation title in local state:",
        conversation.title,
        "for chatId:",
        currentChatId
      );

      // Trigger sidebar refresh to ensure the title update is visible
      // Use a small delay to ensure the local state updates are processed first
      const timeoutId = setTimeout(async () => {
        console.log("🔄 Triggering sidebar refresh for title update");
        try {
          await Promise.all([refetchConversations(), refetchHierarchical()]);
          console.log("✅ Sidebar refresh completed for title update");
        } catch (error) {
          console.error("❌ Sidebar refresh failed:", error);
        }
      }, 50);

      // Cleanup timeout if effect is unmounted
      return () => clearTimeout(timeoutId);
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

  // Ensure newly created conversations appear in both conversation lists
  useEffect(() => {
    const currentChatId = optimisticChatId || chatId;
    if (conversation && currentChatId && conversations.length > 0) {
      // Check if this conversation exists in the regular conversations list
      const existsInRegular = conversations.some(
        (conv) => conv.id === currentChatId
      );

      if (!existsInRegular) {
        console.log(
          "🔄 New conversation not in regular list, triggering refresh:",
          currentChatId
        );
        refetchConversations();
      }
    }
  }, [
    conversation?.id,
    optimisticChatId,
    chatId,
    conversations,
    refetchConversations,
  ]);

  // Separate effect for hierarchical conversations to avoid conflicts
  useEffect(() => {
    const currentChatId = optimisticChatId || chatId;
    if (conversation && currentChatId) {
      // Use a slight delay to ensure the conversation is in the regular list first
      const timeoutId = setTimeout(() => {
        // Trigger hierarchical refresh to ensure the conversation appears there too
        refetchHierarchical();
        console.log(
          "🔄 Refreshed hierarchical conversations for new conversation:",
          currentChatId
        );
      }, 200);

      return () => clearTimeout(timeoutId);
    }
  }, [conversation?.id, optimisticChatId, chatId, refetchHierarchical]);

  // Create new chat function
  const handleCreateNewChat = async () => {
    router.push("/chat");
  };

  // Keyboard shortcuts integration
  useKeyboardShortcuts({
    onNewChat: handleCreateNewChat,
    onToggleSidebar: () =>
      chatState.setSidebarCollapsed(!chatState.sidebarCollapsed),
    onSendMessage: () => {
      if (chatState.inputValue.trim() || chatState.attachments.length > 0) {
        handleSendMessageWithCreation(
          chatState.inputValue,
          chatState.attachments,
          chatState.searchEnabled,
          chatState.setIsSearching,
          chatState.resetInput
        );
      }
    },
    onClearChat: () => {
      if (optimisticChatId && conversation) {
        // Show confirmation dialog for clearing chat
        if (
          window.confirm("Are you sure you want to clear this conversation?")
        ) {
          router.push("/chat");
        }
      }
    },
    onExportChat: () => {
      if (optimisticChatId && conversation) {
        // Trigger export functionality
        const exportUrl = `/api/conversations/${optimisticChatId}/export`;
        window.open(exportUrl, "_blank");
      }
    },
    onShareChat: () => {
      if (conversation) {
        chatState.setShowShareModal(true);
      }
    },
    onRegenerateResponse: () => {
      if (messages.length > 0 && optimisticChatId) {
        const lastAssistantMessage = messages
          .slice()
          .reverse()
          .find((m) => m.role === "assistant");

        if (lastAssistantMessage) {
          // Use the handleRetryMessage function that's defined in the component
          handleRetryMessage(lastAssistantMessage.id);
        }
      }
    },
    inputRef: chatState.textareaRef as React.RefObject<HTMLTextAreaElement>,
    enabled: preferences?.shortcuts?.enabled ?? true,
  });

  // Handle retry message functionality
  const handleRetryMessage = async (messageId: string) => {
    if (!optimisticChatId) {
      throw new Error("No conversation ID available for retry");
    }

    try {
      console.log("🔄 Retrying message:", {
        messageId,
        conversationId: optimisticChatId,
        currentModel: selectedModel,
      });

      // Use the current selected model
      const modelToUse = selectedModel || "llama-3.1-8b-instant";

      // Send the retry request to the dedicated retry API
      const response = await fetch("/api/chat/retry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: optimisticChatId,
          messageId,
          model: modelToUse,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Retry failed: ${errorData}`);
      }

      console.log("✅ Retry request sent successfully");

      // The API will handle updating the message via streaming,
      // and the UI will automatically update via the existing useChat hook
    } catch (error) {
      const chatError = await handleAPIError(error, async () => {
        // Retry the retry operation
        return handleRetryMessage(messageId);
      });
      throw chatError; // Re-throw standardized error
    }
  };

  // Quick actions for welcome screen
  const quickActions = [
    {
      icon: Sparkles,
      title: "Create",
      description: "Generate content, write, brainstorm",
      color: "emerald",
      prompts: [
        "Write a blog post about AI trends in 2025",
        "Create a marketing strategy for a new product",
        "Generate creative ideas for a team building event",
        "Write a professional bio for my LinkedIn profile",
        "Help me brainstorm startup ideas in AI",
      ],
    },
    {
      icon: Code,
      title: "Code",
      description: "Debug, explain, write code",
      color: "blue",
      prompts: [
        "Help me debug this React component",
        "Explain how async/await works in JavaScript",
        "Write a Python script for data processing",
        "Review my code for best practices",
        "Create a REST API endpoint in Node.js",
      ],
    },
    {
      icon: BarChart3,
      title: "Analyze",
      description: "Research, analyze data, summarize",
      color: "purple",
      prompts: [
        "Analyze this market research data",
        "Summarize the key points from this report",
        "Help me interpret these survey results",
        "Compare these two business strategies",
        "Create a SWOT analysis for my project",
      ],
    },
    {
      icon: GraduationCap,
      title: "Learn",
      description: "Explain concepts, tutorials",
      color: "amber",
      prompts: [
        "Explain quantum computing in simple terms",
        "Teach me the basics of machine learning",
        "Create a study plan for web development",
        "Help me understand blockchain technology",
        "Explain how neural networks work",
      ],
    },
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
    <ChatErrorBoundary
      conversationId={optimisticChatId}
      onError={(error, errorInfo) => {
        handleChatError(error, ErrorCategory.UNKNOWN);
      }}
    >
      <TooltipProvider>
        <div
          className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden"
          style={{
            height: "100vh",
            minHeight: "100vh",
            maxHeight: "100vh",
          }}
        >
          {/* Mobile Sidebar Overlay - only show when sidebar is open on mobile */}
          {!chatState.sidebarCollapsed && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden"
              onClick={() => chatState.setSidebarCollapsed(true)}
            />
          )}

          {/* ChatSidebar Component - Desktop: always visible, Mobile: conditional */}
          <div className="hidden lg:block">
            <ChatSidebar
              isCollapsed={chatState.sidebarCollapsed}
              onToggleCollapse={() =>
                chatState.setSidebarCollapsed(!chatState.sidebarCollapsed)
              }
              currentChatId={optimisticChatId || ""}
              selectedModel={selectedModel}
              onCreateNewChat={handleCreateNewChat}
            />
          </div>

          {/* Mobile Sidebar - Only render when not collapsed */}
          {/* Mobile Sidebar Overlay */}
          {!chatState.sidebarCollapsed && (
            <>
              {/* Backdrop */}
              <div
                className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ease-in-out"
                onClick={() => chatState.setSidebarCollapsed(true)}
              />
              {/* Sidebar */}
              <div className="lg:hidden fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out">
                <ChatSidebar
                  isCollapsed={false}
                  onToggleCollapse={() =>
                    chatState.setSidebarCollapsed(!chatState.sidebarCollapsed)
                  }
                  currentChatId={optimisticChatId || ""}
                  selectedModel={selectedModel}
                  onCreateNewChat={handleCreateNewChat}
                />
              </div>
            </>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col relative min-w-0">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-transparent to-slate-800/50" />
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

            {/* Header - Better mobile positioning */}
            <div
              className="sticky top-0 lg:relative lg:top-auto z-30 
                          bg-slate-900/95 backdrop-blur-xl 
                          lg:bg-transparent lg:backdrop-blur-none
                          shadow-sm lg:shadow-none"
            >
              <ChatHeader
                conversationTitle={
                  conversation?.title ||
                  (messages.length > 0
                    ? "🔥 Chat Session"
                    : "✨ New Conversation")
                }
                conversationModel={conversation?.model}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                lastSyncTime={lastSyncTime || undefined}
                onShareClick={() => chatState.setShowShareModal(true)}
                hasConversation={!!conversation || messages.length > 0}
                onToggleSidebar={() =>
                  chatState.setSidebarCollapsed(!chatState.sidebarCollapsed)
                }
                onNewChat={handleCreateNewChat}
                sidebarCollapsed={chatState.sidebarCollapsed}
              />
            </div>

            {/* Messages Area - Takes remaining space between fixed header and input */}
            <div className="flex-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-800/10 to-transparent" />
              <div className="absolute left-1/2 top-0 w-px h-full bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent transform -translate-x-1/2" />

              <ScrollArea
                className="h-full px-3 sm:px-6 py-4 sm:py-8 pb-6 lg:pb-8 relative z-10"
                ref={scrollAreaRef}
              >
                {messagesLoading ? (
                  <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="space-y-3 sm:space-y-4">
                        <div className="flex justify-end">
                          <div className="bg-slate-700/30 rounded-lg p-3 sm:p-4 max-w-[85%] sm:max-w-xs animate-pulse">
                            <div className="h-4 bg-slate-600 rounded mb-2"></div>
                            <div className="h-4 bg-slate-600 rounded w-3/4"></div>
                          </div>
                        </div>
                        <div className="flex justify-start">
                          <div className="bg-slate-800/30 rounded-lg p-3 sm:p-4 max-w-[85%] sm:max-w-xs animate-pulse">
                            <div className="h-4 bg-slate-600 rounded mb-2"></div>
                            <div className="h-4 bg-slate-600 rounded w-2/3"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !optimisticChatId ? (
                  <WelcomeInterface
                    quickActions={quickActions}
                    onPromptSelect={chatState.setInputValue}
                  />
                ) : (
                  <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
                    {/* Retry banner for failed messages */}
                    {chatError && (
                      <FailedMessageRetryBanner
                        error={chatError}
                        onRetry={() => {
                          // Retry by resending the last user message
                          const lastUserMessage = messages
                            .slice()
                            .reverse()
                            .find((msg) => msg.role === "user");
                          if (lastUserMessage && optimisticChatId) {
                            sendMessage(lastUserMessage.content, selectedModel);
                          }
                        }}
                        onDismiss={() => {
                          // Clear the error - this would need to be implemented in useChat
                          window.location.reload(); // Simple approach for now
                        }}
                        isRetrying={isStreaming}
                      />
                    )}

                    {/* Stream recovery notification */}
                    {isRecovering && (
                      <div className="mb-4 p-4 border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                          <div>
                            <h4 className="font-medium text-blue-800 dark:text-blue-200">
                              Recovering interrupted message...
                            </h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                              We detected an interrupted AI response and are
                              continuing from where it left off.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

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
                        onRetryMessage={handleRetryMessage}
                      />
                    ))}

                    {/* Auto-scroll target */}
                    <div ref={messagesEndRef} className="h-1" />
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Scroll to Bottom Button - Position adjusted for mobile */}
            {!isAtBottom && messages.length > 0 && (
              <div className="absolute bottom-32 sm:bottom-36 lg:bottom-20 right-3 sm:right-6 z-20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => scrollToBottomViewport(true, true)}
                  className="bg-slate-800/90 backdrop-blur-sm border-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-700/90 shadow-lg text-xs sm:text-sm px-2 sm:px-3"
                >
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Scroll to bottom</span>
                  <span className="sm:hidden">Bottom</span>
                </Button>
              </div>
            )}

            {/* Input Area - Fixed on mobile */}
            <div className="sticky bottom-0 lg:relative lg:bottom-auto z-30 bg-slate-900/95 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none">
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
                onSendMessageWithSearch={(content, searchResults) => {
                  if (optimisticChatId) {
                    messageHandling.handleSendMessageWithSearch(
                      content,
                      searchResults,
                      chatState.attachments,
                      chatState.resetInput
                    );
                  }
                }}
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
        </div>

        {/* Floating Mobile Actions */}
        <FloatingMobileActions
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          lastSyncTime={lastSyncTime || undefined}
        />

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
    </ChatErrorBoundary>
  );
}
