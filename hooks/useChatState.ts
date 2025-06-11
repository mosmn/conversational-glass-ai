import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface ChatStateProps {
  chatId: string;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

export function useChatState({
  chatId,
  selectedModel,
  setSelectedModel,
}: ChatStateProps) {
  const router = useRouter();
  const { toast } = useToast();

  // UI State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showInlineImageGeneration, setShowInlineImageGeneration] =
    useState(true);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Branching State
  const [showCreateBranchModal, setShowCreateBranchModal] = useState(false);
  const [branchingFromMessage, setBranchingFromMessage] = useState<{
    id: string;
    content: string;
    role: string;
    model?: string | null;
  } | null>(null);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastRefreshedTitleRef = useRef<string | null>(null);

  // Actions
  const resetInput = () => {
    setInputValue("");
    setAttachments([]);
  };

  const handleImageGenerated = (result: any) => {
    console.log("📸 Image generated:", result);
    toast({
      title: "Image Generated",
      description: `Successfully created image using ${result.provider}`,
    });

    if (result.addedToConversation) {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const handleCreateBranch = (message: {
    id: string;
    content: string;
    role: string;
    model?: string | null;
  }) => {
    setBranchingFromMessage(message);
    setShowCreateBranchModal(true);
  };

  const handleViewBranches = () => {
    // Branch navigation is now handled by the hierarchical sidebar
    toast({
      title: "Branch Navigation",
      description: "Use the sidebar to navigate between conversation branches",
    });
  };

  const clearBranchingModal = () => {
    setShowCreateBranchModal(false);
    setBranchingFromMessage(null);
  };

  return {
    // UI State
    sidebarCollapsed,
    setSidebarCollapsed,
    inputValue,
    setInputValue,
    attachments,
    setAttachments,
    showAttachments,
    setShowAttachments,
    showShareModal,
    setShowShareModal,
    showInlineImageGeneration,
    setShowInlineImageGeneration,
    searchEnabled,
    setSearchEnabled,
    isSearching,
    setIsSearching,

    // Branching State
    showCreateBranchModal,
    setShowCreateBranchModal,
    branchingFromMessage,
    setBranchingFromMessage,

    // Refs
    textareaRef,
    lastRefreshedTitleRef,

    // Actions
    resetInput,
    handleImageGenerated,
    handleCreateBranch,
    handleViewBranches,
    clearBranchingModal,
  };
}
