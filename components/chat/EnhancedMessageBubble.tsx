"use client";

import React, { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { MessageContent } from "./MessageContent";
import { MessageAttachments } from "./MessageAttachments";
import { InlineImageGeneration } from "./InlineImageGeneration";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  User,
  Bot,
  Copy,
  Share,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  MoreHorizontal,
  Sparkles,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Clock,
  DollarSign,
  Palette,
  Eye,
  Heart,
  Bookmark,
  Edit3,
  Wand2,
} from "lucide-react";

interface GeneratedImageData {
  id: string;
  url: string;
  prompt: string;
  revisedPrompt?: string;
  provider: string;
  model: string;
  generationSettings: {
    size: string;
    quality: string;
    style: string;
  };
  dimensions: {
    width: number;
    height: number;
  };
  metadata: {
    generationTime: number;
    estimatedCost: number;
    format: string;
  };
  createdAt: string;
}

interface MessageMetadata {
  streamingComplete?: boolean;
  processingTime?: number;
  regenerated?: boolean;
  provider?: string;
  error?: boolean;
  generatedImage?: GeneratedImageData;
  attachments?: Array<{
    type: "image" | "pdf" | "text";
    url: string;
    filename: string;
    size: number;
    extractedText?: string;
    thumbnailUrl?: string;
    metadata?: {
      width?: number;
      height?: number;
      pages?: number;
      wordCount?: number;
    };
  }>;
  // New image generation metadata
  imageGenerationDetected?: boolean;
  suggestedImagePrompts?: string[];
  conversationArtifacts?: {
    images: GeneratedImageData[];
    totalGenerated: number;
    totalCost: number;
  };
}

interface EnhancedMessageBubbleProps {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  isStreaming?: boolean;
  timestamp: string | Date;
  model?: string;
  metadata?: MessageMetadata;
  error?: string;
  conversationId: string;
  onImageGenerated?: (result: any) => void;
  onRegenerateMessage?: () => void;
  className?: string;
  showInlineImageGeneration?: boolean;
}

// Image generation prompt detection patterns
const IMAGE_PROMPT_PATTERNS = [
  /(?:^|\s)(?:generate|create|make|draw|design|produce)\s+(?:an?\s+)?image/i,
  /(?:^|\s)(?:image|picture|photo|drawing|artwork|illustration)\s+of/i,
  /(?:^|\s)(?:show|visualize|display)\s+(?:me\s+)?(?:an?\s+)?(?:image|picture)/i,
  /(?:^|\s)dall[\-\s]?e/i,
  /(?:^|\s)stable[\-\s]?diffusion/i,
  /(?:^|\s)midjourney/i,
];

function detectImageGenerationPrompt(text: string): boolean {
  if (text.length < 5) return false;
  return IMAGE_PROMPT_PATTERNS.some((pattern) => pattern.test(text));
}

export const EnhancedMessageBubble: React.FC<EnhancedMessageBubbleProps> = ({
  id,
  content,
  role,
  isStreaming = false,
  timestamp,
  model,
  metadata,
  error,
  conversationId,
  onImageGenerated,
  onRegenerateMessage,
  className,
  showInlineImageGeneration = true,
}) => {
  const [showImageGeneration, setShowImageGeneration] = useState(false);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);

  const isUser = role === "user";
  const isAssistant = role === "assistant";
  const hasError = metadata?.error || error;
  const hasGeneratedImage = metadata?.generatedImage;
  const hasAttachments =
    metadata?.attachments && metadata.attachments.length > 0;

  // Auto-detect image generation prompts in user messages
  const shouldShowImageGeneration = useMemo(() => {
    return (
      showInlineImageGeneration &&
      isUser &&
      !isStreaming &&
      !hasError &&
      detectImageGenerationPrompt(content)
    );
  }, [showInlineImageGeneration, isUser, isStreaming, hasError, content]);

  useEffect(() => {
    if (shouldShowImageGeneration) {
      // Small delay to show after message appears
      const timer = setTimeout(() => {
        setShowImageGeneration(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldShowImageGeneration]);

  // Format timestamp
  const formattedTime = useMemo(() => {
    const date =
      typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [timestamp]);

  // Copy message content
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // Handle image generation
  const handleImageGenerated = (result: any) => {
    setShowImageGeneration(false);
    onImageGenerated?.(result);
  };

  // Get model info for display
  const modelInfo = useMemo(() => {
    if (!model) return null;

    // Extract provider and model name from full model string
    if (model.includes("gpt"))
      return { provider: "OpenAI", name: model.toUpperCase() };
    if (model.includes("claude"))
      return { provider: "Anthropic", name: "Claude" };
    if (model.includes("gemini")) return { provider: "Google", name: "Gemini" };
    if (model.includes("llama")) return { provider: "Meta", name: "Llama" };

    return { provider: "AI", name: model };
  }, [model]);

  return (
    <TooltipProvider>
      <div className={cn("group relative", className)}>
        <div
          className={cn(
            "flex gap-3 max-w-4xl",
            isUser ? "ml-auto flex-row-reverse" : "mr-auto"
          )}
        >
          {/* Avatar */}
          <div className="flex-shrink-0">
            <Avatar
              className={cn(
                "h-8 w-8 border",
                hasError
                  ? "border-red-500"
                  : isUser
                  ? "border-emerald-500"
                  : "border-blue-500"
              )}
            >
              <AvatarFallback
                className={cn(
                  "text-white text-sm font-medium",
                  hasError
                    ? "bg-red-600"
                    : isUser
                    ? "bg-emerald-600"
                    : "bg-blue-600"
                )}
              >
                {isUser ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Message Content */}
          <div
            className={cn(
              "flex-1 space-y-2",
              isUser ? "text-right" : "text-left"
            )}
          >
            {/* Message Header */}
            <div
              className={cn(
                "flex items-center gap-2 text-xs text-muted-foreground",
                isUser ? "justify-end" : "justify-start"
              )}
            >
              <span className="font-medium">
                {isUser ? "You" : modelInfo?.name || "Assistant"}
              </span>
              {modelInfo && !isUser && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                  {modelInfo.provider}
                </Badge>
              )}
              <span>{formattedTime}</span>
              {metadata?.processingTime && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge
                      variant="secondary"
                      className="text-xs px-1.5 py-0.5"
                    >
                      {metadata.processingTime.toFixed(1)}s
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Processing time: {metadata.processingTime.toFixed(2)}{" "}
                    seconds
                  </TooltipContent>
                </Tooltip>
              )}
              {metadata?.regenerated && (
                <Badge
                  variant="outline"
                  className="text-xs px-1.5 py-0.5 text-amber-600"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerated
                </Badge>
              )}
            </div>

            {/* Message Bubble */}
            <div
              className={cn(
                "relative rounded-2xl px-4 py-3 shadow-sm",
                hasError
                  ? "bg-red-500/10 border border-red-500/20 text-red-400"
                  : isUser
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm text-slate-100",
                "transition-all duration-200 hover:shadow-md"
              )}
            >
              {/* Error content */}
              {hasError ? (
                <div className="flex items-center gap-2">
                  <span className="text-red-400">⚠️</span>
                  <span>{error || "Failed to process message"}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Main content */}
                  <MessageContent
                    content={content}
                    isStreaming={isStreaming}
                    isUser={isUser}
                    className={cn(
                      "prose prose-sm max-w-none",
                      isUser ? "prose-invert" : "prose-slate"
                    )}
                  />

                  {/* Generated Image Display */}
                  {hasGeneratedImage && (
                    <Card className="border-0 bg-slate-900/50 backdrop-blur-sm">
                      <CardContent className="p-3">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4 text-blue-400" />
                              <span className="text-sm font-medium text-slate-200">
                                Generated Image
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {metadata.generatedImage.provider}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {metadata.generatedImage.metadata.generationTime.toFixed(
                                1
                              )}
                              s
                              <DollarSign className="h-3 w-3 ml-2" />$
                              {metadata.generatedImage.metadata.estimatedCost.toFixed(
                                3
                              )}
                            </div>
                          </div>

                          <div className="relative group/image">
                            <img
                              src={metadata.generatedImage.url}
                              alt={metadata.generatedImage.prompt}
                              className="w-full rounded-lg"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/image:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                              <Button size="sm" variant="secondary">
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                              <Button size="sm" variant="secondary">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Open
                              </Button>
                              <Button size="sm" variant="secondary">
                                <Wand2 className="h-3 w-3 mr-1" />
                                Variations
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>
                              <span className="font-medium">Model:</span>{" "}
                              {metadata.generatedImage.model}
                            </div>
                            <div>
                              <span className="font-medium">Size:</span>{" "}
                              {metadata.generatedImage.generationSettings.size}
                            </div>
                            <div>
                              <span className="font-medium">Style:</span>{" "}
                              {metadata.generatedImage.generationSettings.style}
                            </div>
                            <div>
                              <span className="font-medium">Quality:</span>{" "}
                              {
                                metadata.generatedImage.generationSettings
                                  .quality
                              }
                            </div>
                          </div>

                          {metadata.generatedImage.revisedPrompt &&
                            metadata.generatedImage.revisedPrompt !==
                              metadata.generatedImage.prompt && (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-slate-300">
                                  Revised Prompt:
                                </div>
                                <div className="text-xs text-muted-foreground italic">
                                  "{metadata.generatedImage.revisedPrompt}"
                                </div>
                              </div>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Attachments */}
                  {hasAttachments && (
                    <MessageAttachments
                      attachments={metadata.attachments}
                      className="mt-3"
                    />
                  )}
                </div>
              )}

              {/* Message Actions (hover overlay) */}
              <div
                className={cn(
                  "absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity",
                  isUser ? "left-2" : "right-2"
                )}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 bg-black/20 hover:bg-black/40 backdrop-blur-sm"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={isUser ? "end" : "start"}>
                    <DropdownMenuItem onClick={handleCopy}>
                      <Copy className="h-3 w-3 mr-2" />
                      {copied ? "Copied!" : "Copy"}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Share className="h-3 w-3 mr-2" />
                      Share
                    </DropdownMenuItem>
                    {isAssistant && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setLiked(liked === true ? null : true)}
                        >
                          <ThumbsUp
                            className={cn(
                              "h-3 w-3 mr-2",
                              liked === true && "text-green-500"
                            )}
                          />
                          {liked === true ? "Liked" : "Like"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            setLiked(liked === false ? null : false)
                          }
                        >
                          <ThumbsDown
                            className={cn(
                              "h-3 w-3 mr-2",
                              liked === false && "text-red-500"
                            )}
                          />
                          {liked === false ? "Disliked" : "Dislike"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onRegenerateMessage}>
                          <RefreshCw className="h-3 w-3 mr-2" />
                          Regenerate
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Inline Image Generation */}
            {showImageGeneration && (
              <InlineImageGeneration
                prompt={content}
                conversationId={conversationId}
                messageId={id}
                onImageGenerated={handleImageGenerated}
                onDismiss={() => setShowImageGeneration(false)}
                className="mt-3"
              />
            )}
          </div>
        </div>

        {/* Streaming indicator */}
        {isStreaming && !hasError && (
          <div
            className={cn(
              "flex items-center gap-2 text-xs text-muted-foreground mt-1",
              isUser ? "justify-end mr-11" : "justify-start ml-11"
            )}
          >
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" />
              <div
                className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              />
              <div
                className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
            </div>
            <span>AI is thinking...</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
