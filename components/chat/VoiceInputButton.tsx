import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Mic, StopCircle } from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useToast } from "@/hooks/use-toast";
import { VoiceVisualizerCircle } from "./VoiceVisualizer";

interface VoiceInputButtonProps {
  onTranscription: (text: string) => void;
  language?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outline" | "secondary" | "default";
  disabled?: boolean;
  standalone?: boolean; // If true, wraps with TooltipProvider
}

export function VoiceInputButton({
  onTranscription,
  language = "en",
  className = "",
  size = "sm",
  variant = "ghost",
  disabled = false,
  standalone = false,
}: VoiceInputButtonProps) {
  const { toast } = useToast();

  const {
    isRecording,
    isTranscribing,
    formattedDuration,
    isSupported: isVoiceSupported,
    toggleRecording,
    error: voiceError,
    volume,
  } = useVoiceInput({
    onTranscription: (text: string) => {
      onTranscription(text);
      toast({
        title: "Voice transcribed",
        description: "Your speech has been converted to text successfully.",
      });
    },
    onError: (error: string) => {
      toast({
        title: "Voice input failed",
        description: error,
        variant: "destructive",
      });
    },
    language,
  });

  const isBusy = isRecording || isTranscribing;
  const isDisabled = disabled || !isVoiceSupported;

  const getButtonStyles = () => {
    if (isRecording) {
      return "text-red-400 bg-red-500/10 border-red-500/30 animate-pulse hover:bg-red-500/20";
    }
    if (isTranscribing) {
      return "text-blue-400 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20";
    }
    if (!isVoiceSupported) {
      return "text-slate-600 cursor-not-allowed opacity-50";
    }
    return "text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 border-slate-700/30 hover:border-blue-500/30";
  };

  const getTooltipText = () => {
    if (!isVoiceSupported) {
      // Check if we're in an insecure context
      if (
        typeof window !== "undefined" &&
        !window.isSecureContext &&
        window.location.protocol !== "http:"
      ) {
        return "🔒 Voice input requires HTTPS. Please use https:// or localhost";
      }
      if (typeof window !== "undefined" && !window.MediaRecorder) {
        return "🚫 Voice input not supported in this browser. Try Chrome, Firefox, or Safari";
      }
      return "🚫 Voice input not supported in this browser";
    }
    if (isRecording)
      return `🔴 Recording... ${formattedDuration} (click to stop)`;
    if (isTranscribing) return "🤖 Converting speech to text...";
    return "🎤 Click to start voice input";
  };

  const getButtonSize = () => {
    switch (size) {
      case "lg":
        return "h-12 w-12 p-0";
      case "md":
        return "h-10 w-10 p-0";
      case "sm":
      default:
        return "h-8 w-8 p-0";
    }
  };

  const getIconSize = () => {
    switch (size) {
      case "lg":
        return "h-6 w-6";
      case "md":
        return "h-5 w-5";
      case "sm":
      default:
        return "h-4 w-4";
    }
  };

  const buttonContent = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size={size === "md" ? "sm" : size === "lg" ? "lg" : "sm"}
          variant={variant}
          className={`${getButtonSize()} rounded-xl transition-all duration-300 backdrop-blur-sm border ${getButtonStyles()} ${className}`}
          onClick={toggleRecording}
          disabled={isDisabled || disabled}
        >
          {isRecording ? (
            <div className="relative">
              <VoiceVisualizerCircle
                volume={volume}
                isActive={isRecording}
                size={size === "lg" ? "lg" : size === "md" ? "md" : "sm"}
                className="absolute inset-0"
              />
              <StopCircle className={`${getIconSize()} relative z-10`} />
            </div>
          ) : isTranscribing ? (
            <div
              className={`animate-spin rounded-full border-2 border-blue-400 border-t-transparent ${getIconSize()}`}
            />
          ) : (
            <Mic className={getIconSize()} />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getTooltipText()}</p>
        {isRecording && (
          <p className="text-xs text-slate-400 mt-1">
            Press space or click to stop
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );

  if (standalone) {
    return <TooltipProvider>{buttonContent}</TooltipProvider>;
  }

  return buttonContent;
}

// Voice Recording Status Indicator Component
interface VoiceStatusProps {
  isRecording: boolean;
  isTranscribing: boolean;
  formattedDuration: string;
  className?: string;
}

export function VoiceStatus({
  isRecording,
  isTranscribing,
  formattedDuration,
  className = "",
}: VoiceStatusProps) {
  if (!isRecording && !isTranscribing) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {isRecording && (
        <span className="text-red-400 flex items-center gap-1">
          <div className="animate-pulse w-2 h-2 bg-red-400 rounded-full" />
          Recording... {formattedDuration}
        </span>
      )}
      {isTranscribing && (
        <span className="text-blue-400 flex items-center gap-1">
          <div className="animate-spin rounded-full h-3 w-3 border border-blue-400 border-t-transparent" />
          Converting speech to text...
        </span>
      )}
    </div>
  );
}
