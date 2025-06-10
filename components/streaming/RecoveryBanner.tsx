"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Play,
  Trash2,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
} from "lucide-react";
import { StreamRecoveryData } from "@/lib/streaming/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RecoveryBannerProps {
  streams: StreamRecoveryData[];
  onResumeStream: (streamId: string) => Promise<boolean>;
  onDiscardStream: (streamId: string) => void;
  onDiscardAll: () => void;
  isLoading?: boolean;
  className?: string;
}

export function RecoveryBanner({
  streams,
  onResumeStream,
  onDiscardStream,
  onDiscardAll,
  isLoading = false,
  className = "",
}: RecoveryBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [resumingStreamId, setResumingStreamId] = useState<string | null>(null);

  if (streams.length === 0) return null;

  const handleResumeStream = async (streamId: string) => {
    setResumingStreamId(streamId);
    try {
      await onResumeStream(streamId);
    } finally {
      setResumingStreamId(null);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return "Just now";
  };

  const mostRecentStream = streams[0];

  return (
    <TooltipProvider>
      <Card
        className={`border-amber-500/30 bg-amber-600/10 backdrop-blur-sm ${className}`}
      >
        <CardContent className="p-4">
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-amber-500/20 rounded-lg">
                  <RefreshCw className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-amber-300">
                      Resumable Streams Available
                    </h3>
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 text-amber-400"
                    >
                      {streams.length}
                    </Badge>
                  </div>
                  <p className="text-sm text-amber-200/80">
                    {streams.length === 1
                      ? `1 interrupted stream can be resumed (${formatTimeAgo(
                          mostRecentStream.interruptedAt
                        )})`
                      : `${streams.length} interrupted streams can be resumed`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Quick resume for most recent */}
                {streams.length === 1 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() =>
                          handleResumeStream(mostRecentStream.streamId)
                        }
                        disabled={isLoading || resumingStreamId !== null}
                        className="bg-amber-600/20 text-amber-400 border-amber-500/30 hover:bg-amber-600/30"
                      >
                        {resumingStreamId === mostRecentStream.streamId ? (
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        {resumingStreamId === mostRecentStream.streamId
                          ? "Resuming..."
                          : "Resume"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Resume the most recent interrupted stream</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Expand/collapse toggle */}
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-amber-400 hover:text-amber-300"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>

            {/* Expanded content */}
            <CollapsibleContent className="mt-4">
              <div className="space-y-3">
                {streams.map((stream) => (
                  <StreamItem
                    key={stream.streamId}
                    stream={stream}
                    onResume={() => handleResumeStream(stream.streamId)}
                    onDiscard={() => onDiscardStream(stream.streamId)}
                    isResuming={resumingStreamId === stream.streamId}
                    disabled={isLoading || resumingStreamId !== null}
                  />
                ))}

                {/* Bulk actions */}
                {streams.length > 1 && (
                  <div className="flex items-center justify-between pt-3 border-t border-amber-500/20">
                    <span className="text-sm text-amber-200/80">
                      Bulk actions for all streams
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onDiscardAll}
                        disabled={isLoading}
                        className="border-red-500/30 text-red-400 hover:bg-red-600/10"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Discard All
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

interface StreamItemProps {
  stream: StreamRecoveryData;
  onResume: () => void;
  onDiscard: () => void;
  isResuming: boolean;
  disabled: boolean;
}

function StreamItem({
  stream,
  onResume,
  onDiscard,
  isResuming,
  disabled,
}: StreamItemProps) {
  const timeAgo = (() => {
    const now = Date.now();
    const diff = now - stream.interruptedAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "now";
  })();

  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-amber-500/20">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge
            variant="outline"
            className="border-blue-500/30 text-blue-400 text-xs"
          >
            {stream.provider}
          </Badge>
          <Badge
            variant="outline"
            className="border-purple-500/30 text-purple-400 text-xs"
          >
            {stream.model}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </div>
        </div>

        <div className="space-y-2">
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <Progress value={stream.progress} className="flex-1 h-2" />
            <span className="text-xs text-slate-400 min-w-[40px]">
              {Math.round(stream.progress)}%
            </span>
          </div>

          {/* Content preview */}
          <div className="text-sm text-slate-300 truncate">
            {stream.lastContent.length > 100
              ? `${stream.lastContent.substring(0, 100)}...`
              : stream.lastContent || "No content yet..."}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              onClick={onResume}
              disabled={disabled || !stream.canRecover}
              className="bg-green-600/20 text-green-400 border-green-500/30 hover:bg-green-600/30"
            >
              {isResuming ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Resume this stream</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDiscard}
              disabled={disabled}
              className="text-red-400 hover:text-red-300 hover:bg-red-600/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Discard this stream</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
