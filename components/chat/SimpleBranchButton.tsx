"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GitBranch, Plus } from "lucide-react";

interface SimpleBranchButtonProps {
  messageId: string;
  messageContent: string;
  messageRole: string;
  messageModel?: string | null;
  onCreateBranch: () => void;
  className?: string;
}

export function SimpleBranchButton({
  messageId,
  messageContent,
  messageRole,
  messageModel,
  onCreateBranch,
  className = "",
}: SimpleBranchButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <TooltipProvider>
      <motion.div
        className={`inline-flex items-center ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: isHovered ? 1 : 0.7, scale: 1 }}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCreateBranch}
              className="h-8 px-3 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-full transition-all duration-200 group"
            >
              <GitBranch className="h-3.5 w-3.5 text-teal-400 mr-1.5" />
              <Plus className="h-3 w-3 text-teal-300 group-hover:rotate-90 transition-transform duration-200" />
              <span className="text-xs text-teal-300 ml-1 hidden group-hover:inline">
                Branch
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p className="font-medium">Create Conversation Branch</p>
              <p className="text-slate-400">
                Start a new conversation from this point
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </motion.div>
    </TooltipProvider>
  );
}
