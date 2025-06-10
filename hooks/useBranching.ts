"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api/client";
import { useToast } from "@/hooks/use-toast";

export interface BranchInfo {
  id: string;
  name: string;
  depth: number;
  messageCount: number;
  lastActivity: string;
  isActive: boolean;
  isDefault: boolean;
}

export interface BranchingState {
  branches: BranchInfo[];
  activeBranchId: string | null;
  defaultBranchId: string | null;
  totalBranches: number;
  loading: boolean;
  error: string | null;
}

export interface MessageBranchInfo {
  messageId: string;
  alternatives: Array<{
    id: string;
    content: string;
    role: string;
    model: string | null;
    branchName: string | null;
    branchOrder: number | null;
    timestamp: string;
  }>;
  children: Array<{
    id: string;
    content: string;
    role: string;
    model: string | null;
    branchName: string | null;
    branchDepth: number | null;
    branchOrder: number | null;
    timestamp: string;
  }>;
  canBranch: boolean;
}

export interface UseBranchingReturn {
  // State
  branchingState: BranchingState;

  // Actions
  loadBranches: () => Promise<void>;
  createBranch: (
    parentMessageId: string,
    branchName: string,
    description?: string
  ) => Promise<boolean>;
  updateBranch: (
    branchId: string,
    updates: {
      branchName?: string;
      setAsActive?: boolean;
      setAsDefault?: boolean;
    }
  ) => Promise<boolean>;
  deleteBranch: (branchId: string) => Promise<boolean>;
  switchToBranch: (branchId: string) => Promise<boolean>;

  // Message-specific branching
  getMessageBranchInfo: (
    messageId: string
  ) => Promise<MessageBranchInfo | null>;
  branchFromMessage: (
    messageId: string,
    branchName: string,
    content: string,
    model: string,
    description?: string
  ) => Promise<boolean>;

  // Utilities
  refreshBranches: () => Promise<void>;
  resetBranchingState: () => void;
}

export function useBranching(conversationId: string): UseBranchingReturn {
  const [branchingState, setBranchingState] = useState<BranchingState>({
    branches: [],
    activeBranchId: null,
    defaultBranchId: null,
    totalBranches: 0,
    loading: false,
    error: null,
  });

  const { toast } = useToast();

  // Load branches for the conversation
  const loadBranches = useCallback(async () => {
    if (!conversationId) return;

    setBranchingState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiClient.getConversationBranches(conversationId);

      setBranchingState((prev) => ({
        ...prev,
        branches: response.branches || [],
        activeBranchId: response.activeBranchId || null,
        defaultBranchId: response.defaultBranchId || null,
        totalBranches: response.totalBranches || 0,
        loading: false,
      }));
    } catch (error) {
      console.error("Failed to load branches:", error);
      setBranchingState((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load conversation branches",
      }));
    }
  }, [conversationId]);

  // Create a new branch
  const createBranch = useCallback(
    async (
      parentMessageId: string,
      branchName: string,
      description?: string
    ): Promise<boolean> => {
      if (!conversationId) return false;

      try {
        const response = await apiClient.createBranch(
          conversationId,
          parentMessageId,
          branchName,
          description
        );

        if (response.success) {
          toast({
            title: "Branch Created",
            description: `Successfully created branch "${branchName}"`,
          });

          // Refresh branches list
          await loadBranches();
          return true;
        }

        return false;
      } catch (error) {
        console.error("Failed to create branch:", error);
        toast({
          variant: "destructive",
          title: "Failed to Create Branch",
          description:
            "There was an error creating the branch. Please try again.",
        });
        return false;
      }
    },
    [conversationId, loadBranches, toast]
  );

  // Update a branch
  const updateBranch = useCallback(
    async (
      branchId: string,
      updates: {
        branchName?: string;
        setAsActive?: boolean;
        setAsDefault?: boolean;
      }
    ): Promise<boolean> => {
      if (!conversationId) return false;

      try {
        const response = await apiClient.updateBranch(
          conversationId,
          branchId,
          updates
        );

        if (response.success) {
          const updateMessages = [];
          if (updates.branchName)
            updateMessages.push(`Renamed to "${updates.branchName}"`);
          if (updates.setAsActive) updateMessages.push("Set as active branch");
          if (updates.setAsDefault)
            updateMessages.push("Set as default branch");

          toast({
            title: "Branch Updated",
            description: updateMessages.join(", "),
          });

          // Refresh branches list
          await loadBranches();
          return true;
        }

        return false;
      } catch (error) {
        console.error("Failed to update branch:", error);
        toast({
          variant: "destructive",
          title: "Failed to Update Branch",
          description:
            "There was an error updating the branch. Please try again.",
        });
        return false;
      }
    },
    [conversationId, loadBranches, toast]
  );

  // Delete a branch
  const deleteBranch = useCallback(
    async (branchId: string): Promise<boolean> => {
      if (!conversationId) return false;

      try {
        const response = await apiClient.deleteBranch(conversationId, branchId);

        if (response.success) {
          toast({
            title: "Branch Deleted",
            description: "The branch has been successfully deleted",
          });

          // Refresh branches list
          await loadBranches();
          return true;
        }

        return false;
      } catch (error: any) {
        console.error("Failed to delete branch:", error);
        toast({
          variant: "destructive",
          title: "Failed to Delete Branch",
          description:
            error.message || "There was an error deleting the branch.",
        });
        return false;
      }
    },
    [conversationId, loadBranches, toast]
  );

  // Switch to a specific branch
  const switchToBranch = useCallback(
    async (branchId: string): Promise<boolean> => {
      return await updateBranch(branchId, { setAsActive: true });
    },
    [updateBranch]
  );

  // Get message branch information
  const getMessageBranchInfo = useCallback(
    async (messageId: string): Promise<MessageBranchInfo | null> => {
      if (!conversationId) return null;

      try {
        const response = await apiClient.getMessageBranches(
          conversationId,
          messageId
        );
        return response;
      } catch (error) {
        console.error("Failed to get message branch info:", error);
        return null;
      }
    },
    [conversationId]
  );

  // Branch from a specific message
  const branchFromMessage = useCallback(
    async (
      messageId: string,
      branchName: string,
      content: string,
      model: string,
      description?: string
    ): Promise<boolean> => {
      if (!conversationId) return false;

      try {
        const response = await apiClient.branchFromMessage(
          conversationId,
          messageId,
          branchName,
          content,
          model,
          description
        );

        if (response.success) {
          toast({
            title: "Branch Created",
            description: `Successfully created branch "${branchName}" with your message`,
          });

          // Refresh branches list
          await loadBranches();
          return true;
        }

        return false;
      } catch (error) {
        console.error("Failed to branch from message:", error);
        toast({
          variant: "destructive",
          title: "Failed to Create Branch",
          description:
            "There was an error creating the branch from this message.",
        });
        return false;
      }
    },
    [conversationId, loadBranches, toast]
  );

  // Refresh branches (alias for loadBranches)
  const refreshBranches = useCallback(async () => {
    await loadBranches();
  }, [loadBranches]);

  // Reset branching state
  const resetBranchingState = useCallback(() => {
    setBranchingState({
      branches: [],
      activeBranchId: null,
      defaultBranchId: null,
      totalBranches: 0,
      loading: false,
      error: null,
    });
  }, []);

  // Load branches when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadBranches();
    } else {
      resetBranchingState();
    }
  }, [conversationId, loadBranches, resetBranchingState]);

  return {
    branchingState,
    loadBranches,
    createBranch,
    updateBranch,
    deleteBranch,
    switchToBranch,
    getMessageBranchInfo,
    branchFromMessage,
    refreshBranches,
    resetBranchingState,
  };
}
