"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GitBranch,
  Star,
  Play,
  MoreVertical,
  Clock,
  MessageSquare,
  Edit3,
  Trash2,
  Check,
  ChevronRight,
  Zap,
} from "lucide-react";
import { BranchInfo } from "@/hooks/useBranching";
import { formatDistanceToNow } from "date-fns";

interface BranchNavigatorProps {
  branches: BranchInfo[];
  activeBranchId: string | null;
  defaultBranchId: string | null;
  isLoading?: boolean;
  onSwitchBranch: (branchId: string) => void;
  onSetAsDefault: (branchId: string) => void;
  onRenameBranch: (branchId: string, newName: string) => void;
  onDeleteBranch: (branchId: string) => void;
  className?: string;
}

export function BranchNavigator({
  branches,
  activeBranchId,
  defaultBranchId,
  isLoading = false,
  onSwitchBranch,
  onSetAsDefault,
  onRenameBranch,
  onDeleteBranch,
  className = "",
}: BranchNavigatorProps) {
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const startEditing = (branch: BranchInfo) => {
    setEditingBranch(branch.id);
    setEditingName(branch.name);
  };

  const saveEdit = () => {
    if (editingBranch && editingName.trim()) {
      onRenameBranch(editingBranch, editingName.trim());
    }
    setEditingBranch(null);
    setEditingName("");
  };

  const cancelEdit = () => {
    setEditingBranch(null);
    setEditingName("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  if (isLoading) {
    return (
      <Card className={`bg-slate-800/50 border-slate-700/50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-4">
            <GitBranch className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span className="text-sm font-medium text-slate-300">
              Loading branches...
            </span>
          </div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-12 bg-slate-700/30 rounded-lg animate-pulse"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (branches.length === 0) {
    return (
      <Card className={`bg-slate-800/50 border-slate-700/50 ${className}`}>
        <CardContent className="p-4 text-center">
          <GitBranch className="h-8 w-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No branches yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Create branches to explore different conversation paths
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={`bg-slate-800/50 border-slate-700/50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <GitBranch className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-slate-300">
                Conversation Branches
              </span>
              <Badge
                variant="outline"
                className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              >
                {branches.length}
              </Badge>
            </div>
          </div>

          <ScrollArea className="max-h-80">
            <div className="space-y-2">
              {branches.map((branch) => {
                const isActive = branch.id === activeBranchId;
                const isDefault = branch.id === defaultBranchId;
                const isEditing = editingBranch === branch.id;

                return (
                  <motion.div
                    key={branch.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative group p-3 rounded-lg border transition-all duration-200 ${
                      isActive
                        ? "bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                        : "bg-slate-700/30 border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/50"
                    }`}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-r"
                      />
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={handleKeyPress}
                              onBlur={saveEdit}
                              className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-emerald-500"
                              autoFocus
                            />
                          ) : (
                            <h3
                              className={`font-medium text-sm truncate ${
                                isActive ? "text-emerald-300" : "text-slate-200"
                              }`}
                            >
                              {branch.name}
                            </h3>
                          )}

                          {/* Branch badges */}
                          <div className="flex items-center space-x-1">
                            {isDefault && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Star className="h-3 w-3 text-amber-400 fill-current" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Default branch</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {isActive && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Currently active</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 text-xs text-slate-400">
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>{branch.messageCount} messages</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(
                                new Date(branch.lastActivity),
                                { addSuffix: true }
                              )}
                            </span>
                          </div>
                          {branch.depth > 0 && (
                            <Badge
                              variant="outline"
                              className="text-xs h-4 px-1"
                            >
                              Depth {branch.depth}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isActive && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onSwitchBranch(branch.id)}
                                className="h-7 w-7 p-0 hover:bg-emerald-500/20 hover:text-emerald-400"
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Switch to this branch</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-slate-600/50"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-slate-800 border-slate-700"
                          >
                            <DropdownMenuItem
                              onClick={() => startEditing(branch)}
                              className="hover:bg-slate-700"
                            >
                              <Edit3 className="h-3 w-3 mr-2" />
                              Rename branch
                            </DropdownMenuItem>

                            {!isDefault && (
                              <DropdownMenuItem
                                onClick={() => onSetAsDefault(branch.id)}
                                className="hover:bg-slate-700"
                              >
                                <Star className="h-3 w-3 mr-2" />
                                Set as default
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator className="bg-slate-700" />

                            {!isDefault && !isActive && (
                              <DropdownMenuItem
                                onClick={() => onDeleteBranch(branch.id)}
                                className="hover:bg-red-500/20 text-red-400"
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                Delete branch
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Quick switch indicator */}
                    {!isActive && (
                      <motion.div
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity"
                        whileHover={{ x: 2 }}
                      >
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Branch statistics */}
          <div className="mt-4 pt-3 border-t border-slate-700/50">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                Total:{" "}
                {branches.reduce((sum, branch) => sum + branch.messageCount, 0)}{" "}
                messages
              </span>
              <div className="flex items-center space-x-1">
                <Zap className="h-3 w-3" />
                <span>
                  {branches.filter((b) => b.depth > 0).length} branch
                  {branches.filter((b) => b.depth > 0).length !== 1 ? "es" : ""}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
