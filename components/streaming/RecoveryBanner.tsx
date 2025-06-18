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
  CheckCircle,
  XCircle,
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
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RecoveryBannerProps {
  streams: StreamRecoveryData[];
  onResumeStream: (streamId: string) => Promise<boolean>;
  onDiscardStream: (streamId: string) => void;
  onDiscardAll: () => void;
  isLoading?: boolean;
  className?: string;
  isRecovering: boolean;
  isResuming: boolean;
  wasResumed: boolean;
  recoveryFailed: boolean;
  recoveryError?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function RecoveryBanner({
  streams,
  onResumeStream,
  onDiscardStream,
  onDiscardAll,
  isLoading = false,
  className = "",
  isRecovering,
  isResuming,
  wasResumed,
  recoveryFailed,
  recoveryError,
  onRetry,
  onDismiss,
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

  if (!isRecovering && !isResuming && !wasResumed && !recoveryFailed) {
    return null;
  }

  // Recovery in progress
  if (isRecovering) {
    return (
      <Alert className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <RefreshCw className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <span className="font-medium">Recovering interrupted message...</span>
          <br />
          <span className="text-sm opacity-80">
            We detected an interrupted AI response and are preparing to continue
            from where it left off.
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  // Stream resumption in progress
  if (isResuming) {
    return (
      <Alert className="mb-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <RefreshCw className="h-4 w-4 animate-spin text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <span className="font-medium">Resuming AI response...</span>
          <br />
          <span className="text-sm opacity-80">
            Continuing the AI response from where it was interrupted. You'll
            receive the complete answer.
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  // Recovery failed
  if (recoveryFailed) {
    return (
      <Alert className="mb-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <span className="font-medium">Recovery failed</span>
              <br />
              <span className="text-sm opacity-80">
                Unable to recover the interrupted message. The response may be
                incomplete.
                {recoveryError && (
                  <>
                    <br />
                    <span className="font-mono text-xs">{recoveryError}</span>
                  </>
                )}
              </span>
            </div>
            <div className="flex gap-2 ml-4">
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900"
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Successfully resumed
  if (wasResumed) {
    return (
      <Alert className="mb-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <span className="font-medium">
                Message recovered successfully!
              </span>
              <br />
              <span className="text-sm opacity-80">
                The AI response was automatically continued after the
                interruption. You now have the complete answer.
              </span>
            </div>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-green-700 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900 ml-4"
              >
                Dismiss
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

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

// Hook to extract recovery state from messages
export function useRecoveryState(messages: any[]) {
  const recoveryMessage = messages.find(
    (msg) =>
      msg.metadata?.isRecovering ||
      msg.metadata?.isResuming ||
      msg.metadata?.wasResumed ||
      msg.metadata?.recoveryFailed
  );

  if (!recoveryMessage) {
    return {
      isRecovering: false,
      isResuming: false,
      wasResumed: false,
      recoveryFailed: false,
      recoveryError: undefined,
    };
  }

  return {
    isRecovering: recoveryMessage.metadata?.isRecovering || false,
    isResuming: recoveryMessage.metadata?.isResuming || false,
    wasResumed: recoveryMessage.metadata?.wasResumed || false,
    recoveryFailed: recoveryMessage.metadata?.recoveryFailed || false,
    recoveryError: recoveryMessage.metadata?.recoveryError,
  };
}
