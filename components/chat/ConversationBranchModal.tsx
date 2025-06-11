"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  GitBranch,
  Sparkles,
  MessageSquare,
  Loader2,
  Lightbulb,
  Zap,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

// Define simplified branch creation response type
interface BranchCreationResponse {
  success: boolean;
  branchConversation: {
    id: string;
    title: string;
    branchName: string;
    parentConversationId?: string;
    branchPointMessageId?: string;
    createdAt: string;
    model: string;
  };
  message: string;
}

interface ConversationBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentConversationId: string;
  parentConversationTitle: string;
  branchFromMessage: {
    id: string;
    content: string;
    role: string;
    model?: string | null;
  } | null;
}

export function ConversationBranchModal({
  isOpen,
  onClose,
  parentConversationId,
  parentConversationTitle,
  branchFromMessage,
}: ConversationBranchModalProps) {
  const [branchName, setBranchName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const branchNameRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Suggested branch names
  const suggestedNames = [
    "Alternative approach",
    "What if scenario",
    "Different perspective",
    "Exploration branch",
    "Quick experiment",
    "Deep dive",
  ];

  // Auto-generate title from branch name
  useEffect(() => {
    if (branchName && !title) {
      setTitle(`${parentConversationTitle} - ${branchName}`);
    }
  }, [branchName, parentConversationTitle, title]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setBranchName("");
      setTitle("");
      setDescription("");
      setIsCreating(false);
      // Focus on branch name input
      setTimeout(() => branchNameRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (!branchName.trim() || !branchFromMessage) {
      return;
    }

    setIsCreating(true);
    try {
      const response = (await apiClient.createBranchConversation(
        parentConversationId,
        {
          messageId: branchFromMessage.id,
          branchName: branchName.trim(),
          title:
            title.trim() || `${parentConversationTitle} - ${branchName.trim()}`,
          description: description.trim() || undefined,
        }
      )) as BranchCreationResponse;

      if (response.success) {
        toast({
          title: "Branch Created!",
          description: `"${branchName}" has been created as a new conversation. You'll be redirected there now.`,
        });

        // Navigate to the new branch conversation
        router.push(`/chat/${response.branchConversation.id}`);
        onClose();
      } else {
        throw new Error(response.message || "Failed to create branch");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Create Branch",
        description:
          error.message ||
          "There was an error creating the branch conversation.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleCreate();
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-slate-900/95 backdrop-blur-xl border-slate-700/50">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center space-x-2 text-xl">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
              <GitBranch className="h-5 w-5 text-emerald-400" />
            </div>
            <span>Create New Conversation Branch</span>
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a new conversation that branches from this point. You can
            continue chatting from where you left off.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Parent context */}
          {branchFromMessage && (
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="p-1.5 bg-slate-700/50 rounded">
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {branchFromMessage.role === "user"
                          ? "You"
                          : "Assistant"}
                      </Badge>
                      {branchFromMessage.model && (
                        <Badge
                          variant="outline"
                          className="text-xs text-blue-400 border-blue-500/30"
                        >
                          {branchFromMessage.model}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {truncateText(branchFromMessage.content, 200)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Branch creation form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="branchName"
                className="text-sm font-medium text-slate-300"
              >
                Branch Name
              </Label>
              <Input
                ref={branchNameRef}
                id="branchName"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter a descriptive name for this branch..."
                className="bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500"
                maxLength={100}
              />
              <div className="text-xs text-slate-500">
                {branchName.length}/100 characters
              </div>
            </div>

            {/* Suggested names */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-400 flex items-center">
                <Lightbulb className="h-3 w-3 mr-1" />
                Quick suggestions
              </Label>
              <div className="flex flex-wrap gap-2">
                {suggestedNames.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    onClick={() => setBranchName(suggestion)}
                    className="h-7 text-xs bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 hover:border-emerald-500/50 hover:text-emerald-400"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="title"
                className="text-sm font-medium text-slate-300"
              >
                Conversation Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Auto-generated from branch name..."
                className="bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="text-sm font-medium text-slate-400"
              >
                Description (optional)
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what you want to explore..."
                className="bg-slate-800/50 border-slate-700/50 text-white placeholder-slate-500"
              />
            </div>

            {/* Branch preview */}
            <Card className="bg-emerald-500/5 border-emerald-500/20">
              <CardContent className="p-3">
                <div className="flex items-start space-x-2">
                  <Zap className="h-4 w-4 text-emerald-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-emerald-400">
                      New Conversation: {branchName || "Branch Name"}
                    </p>
                    <p className="text-xs text-slate-400">
                      This will appear as a separate chat in your sidebar.
                      Continue the conversation naturally from this point.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
          <div></div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isCreating}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>

            <Button
              onClick={handleCreate}
              disabled={!branchName.trim() || isCreating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Branch
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
