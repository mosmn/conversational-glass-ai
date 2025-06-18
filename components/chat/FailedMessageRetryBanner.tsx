"use client";

import React from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FailedMessageRetryBannerProps {
  error: string;
  onRetry: () => void;
  onDismiss: () => void;
  isRetrying?: boolean;
}

export function FailedMessageRetryBanner({
  error,
  onRetry,
  onDismiss,
  isRetrying = false,
}: FailedMessageRetryBannerProps) {
  return (
    <Alert
      variant="destructive"
      className="mb-4 border-red-500/50 bg-red-600/10 backdrop-blur-sm"
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span className="flex-1 mr-4">Message failed to send: {error}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="h-8 px-3 border-red-400/30 hover:border-red-400 hover:bg-red-500/20"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            disabled={isRetrying}
            className="h-8 w-8 p-0 hover:bg-red-500/20"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
