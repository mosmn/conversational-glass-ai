"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GitBranch, Plus, ChevronRight, ChevronDown, Zap } from "lucide-react";

interface BranchingIndicatorProps {
  messageId: string;
  hasChildren: boolean;
  childrenCount: number;
  hasAlternatives: boolean;
  alternativesCount: number;
  canBranch: boolean;
  onCreateBranch: () => void;
  onViewBranches: () => void;
  className?: string;
}

export function BranchingIndicator({
  messageId,
  hasChildren,
  childrenCount,
  hasAlternatives,
  alternativesCount,
  canBranch,
  onCreateBranch,
  onViewBranches,
  className = "",
}: BranchingIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const hasBranches = hasChildren || hasAlternatives;
  const totalBranches = childrenCount + alternativesCount;

  if (!hasBranches && !canBranch) {
    return null;
  }

  return (
    <TooltipProvider>
      <div
        className={`inline-flex items-center space-x-2 ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Main branching indicator */}
        {hasBranches && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsExpanded(!isExpanded);
                    onViewBranches();
                  }}
                  className="h-6 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-full transition-all duration-200"
                >
                  <GitBranch className="h-3 w-3 text-emerald-400 mr-1" />
                  <span className="text-xs text-emerald-300">
                    {totalBranches}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 ml-1 text-emerald-400" />
                  ) : (
                    <ChevronRight className="h-3 w-3 ml-1 text-emerald-400" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-1">
                  <p className="font-medium">Conversation Branches</p>
                  {hasChildren && (
                    <p>
                      • {childrenCount} continuation
                      {childrenCount !== 1 ? "s" : ""}
                    </p>
                  )}
                  {hasAlternatives && (
                    <p>
                      • {alternativesCount} alternative
                      {alternativesCount !== 1 ? "s" : ""}
                    </p>
                  )}
                  <p className="text-slate-400">Click to explore branches</p>
                </div>
              </TooltipContent>
            </Tooltip>

            {/* Branching details when expanded */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-8 left-0 z-10 bg-slate-800/90 backdrop-blur-sm border border-slate-700/50 rounded-lg p-3 min-w-48 shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-slate-300 border-b border-slate-700/50 pb-1">
                      Branch Information
                    </div>

                    {hasChildren && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          Continuations:
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30"
                        >
                          {childrenCount}
                        </Badge>
                      </div>
                    )}

                    {hasAlternatives && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          Alternatives:
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30"
                        >
                          {alternativesCount}
                        </Badge>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Create branch button */}
        <AnimatePresence>
          {canBranch && (isHovered || !hasBranches) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCreateBranch}
                    className="h-6 px-2 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 rounded-full transition-all duration-200 group"
                  >
                    <Plus className="h-3 w-3 text-teal-400 mr-1 group-hover:rotate-90 transition-transform duration-200" />
                    <Zap className="h-3 w-3 text-teal-300" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs space-y-1">
                    <p className="font-medium">Create Branch</p>
                    <p className="text-slate-400">
                      Explore alternative conversation paths
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Visual connection line when there are branches */}
        {hasBranches && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 0.3 }}
            className="absolute left-full ml-2 w-4 h-px bg-gradient-to-r from-emerald-400 to-transparent origin-left"
          />
        )}
      </div>
    </TooltipProvider>
  );
}
