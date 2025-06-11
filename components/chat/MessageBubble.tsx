import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Copy,
  ThumbsUp,
  ThumbsDown,
  Share,
  Clock,
  DollarSign,
  Download,
  RefreshCw,
  Play,
  X,
  User,
  Sparkles,
} from "lucide-react";
import { MessageContent } from "./MessageContent";
import { MessageAttachments } from "./MessageAttachments";
import { InlineImageGeneration } from "./InlineImageGeneration";
import { SimpleBranchButton } from "./SimpleBranchButton";
import { ConversationalGlassLogoMini } from "@/components/ConversationalGlassLogo";
import { QuickTTSButton } from "./TextToSpeechButton";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  timestamp: Date | string;
  model?: string;
  isLoading?: boolean;
  error?: string;
  metadata?: {
    streamingComplete?: boolean;
    processingTime?: number;
    regenerated?: boolean;
    provider?: string;
    error?: boolean;
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
    generatedImage?: {
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
    };
    imageGenerationDetected?: boolean;
    suggestedImagePrompts?: string[];
    branchingMetadata?: {
      branchId?: string;
      branchName?: string;
      hasChildren?: boolean;
      childrenCount?: number;
      isAlternative?: boolean;
      alternatives?: Array<{
        id: string;
        name: string;
        messageCount: number;
      }>;
    };
  };
}

interface MessageBubbleProps {
  message: Message;
  user: any;
  conversationId: string;
  onImageGenerated?: (result: any) => void;
  showInlineImageGeneration?: boolean;
  recoverableStreams?: any[];
  onResumeStream?: (streamId: string) => Promise<boolean>;
  onDiscardStream?: (streamId: string) => void;
  isRecoveryLoading?: boolean;
  onCreateBranch?: (message: {
    id: string;
    content: string;
    role: string;
    model?: string | null;
  }) => void;
  onViewBranches?: () => void;
}

export function MessageBubble({
  message,
  user,
  conversationId,
  onImageGenerated,
  showInlineImageGeneration = true,
  recoverableStreams = [],
  onResumeStream,
  onDiscardStream,
  isRecoveryLoading = false,
  onCreateBranch,
  onViewBranches,
}: MessageBubbleProps) {
  const [isResuming, setIsResuming] = useState(false);
  const isUser = message.role === "user";
  const isStreaming = message.metadata?.streamingComplete === false;
  const hasError = message.metadata?.error || message.error;
  const hasAttachments =
    message.metadata?.attachments && message.metadata.attachments.length > 0;
  const hasGeneratedImage = message.metadata?.generatedImage;

  // Simple check: Is this an interrupted assistant message?
  const isInterrupted =
    !isUser &&
    message.metadata?.streamingComplete === false &&
    !isStreaming &&
    !hasError;

  // Find matching recoverable stream for this message
  const recoverableStream = isInterrupted
    ? recoverableStreams.find(
        (stream) =>
          stream.messageId === message.id ||
          (stream.lastContent &&
            message.content &&
            stream.lastContent.includes(message.content.substring(0, 100)))
      )
    : null;

  const canResume = isInterrupted && recoverableStream && onResumeStream;

  // Handle inline resume
  const handleInlineResume = async () => {
    if (!recoverableStream || !onResumeStream) return;

    setIsResuming(true);
    try {
      await onResumeStream(recoverableStream.streamId);
    } finally {
      setIsResuming(false);
    }
  };

  // Debug logging for attachment display
  if (hasAttachments) {
    console.log("🐛 MessageBubble - Displaying attachments:", {
      messageId: message.id,
      role: message.role,
      attachmentCount: message.metadata?.attachments?.length,
      attachments: message.metadata?.attachments?.map((att) => ({
        type: att.type,
        filename: att.filename,
        size: att.size,
        hasExtractedText: !!att.extractedText,
        hasThumbnail: !!att.thumbnailUrl,
        hasMetadata: !!att.metadata,
      })),
    });
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} group`}>
      <div className={`max-w-[80%] ${isUser ? "order-2" : "order-1"}`}>
        <div
          className={`flex items-start space-x-3 ${
            isUser ? "flex-row-reverse space-x-reverse" : ""
          }`}
        >
          <Avatar className="h-8 w-8 flex-shrink-0 ring-2 ring-slate-700/50 transition-all duration-300 hover:ring-emerald-500/50">
            {isUser && user?.imageUrl ? (
              <AvatarImage
                src={user.imageUrl}
                alt={
                  user.fullName ||
                  user.emailAddresses?.[0]?.emailAddress ||
                  "User"
                }
                className="object-cover"
              />
            ) : null}
            <AvatarFallback
              className={`${
                hasError
                  ? "bg-red-600"
                  : isUser
                  ? "bg-emerald-600"
                  : "bg-blue-600"
              } transition-colors duration-300`}
            >
              {isUser ? (
                user?.imageUrl ? (
                  <span className="text-xs font-semibold">
                    {user?.firstName?.[0] ||
                      user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ||
                      "U"}
                  </span>
                ) : (
                  <User className="h-4 w-4" />
                )
              ) : (
                <ConversationalGlassLogoMini className="scale-50" />
              )}
            </AvatarFallback>
          </Avatar>

          <div className={`flex-1 ${isUser ? "text-right" : "text-left"}`}>
            <div
              className={`inline-block p-4 rounded-2xl ${
                hasError
                  ? "bg-red-600/20 border border-red-500/30 text-red-400"
                  : isUser
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm text-slate-100"
              }`}
            >
              {hasError ? (
                <div className="flex items-center text-current">
                  <span className="mr-2">⚠️</span>
                  {message.error || "Failed to generate response"}
                </div>
              ) : (
                <>
                  <MessageContent
                    content={message.content}
                    isStreaming={isStreaming}
                    isUser={isUser}
                    showLineNumbers={false}
                    maxCodeBlockHeight="300px"
                    allowHtml={true}
                  />

                  {/* Display generated image within the message bubble */}
                  {hasGeneratedImage && (
                    <div className="border-t border-white/10 pt-3 mt-3">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-blue-400" />
                            <span className="text-sm font-medium">
                              Generated Image
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {message.metadata?.generatedImage?.provider}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="h-3 w-3" />
                            {message.metadata?.generatedImage?.metadata.generationTime.toFixed(
                              1
                            )}
                            s
                            <DollarSign className="h-3 w-3 ml-2" />$
                            {message.metadata?.generatedImage?.metadata.estimatedCost.toFixed(
                              3
                            )}
                          </div>
                        </div>

                        <div className="relative group/image rounded-lg overflow-hidden">
                          <img
                            src={message.metadata?.generatedImage?.url || ""}
                            alt={
                              message.metadata?.generatedImage?.prompt ||
                              "Generated image"
                            }
                            className="w-full rounded-lg"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="text-xs"
                            >
                              <Share className="h-3 w-3 mr-1" />
                              Share
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                          <div>
                            <span className="font-medium">Model:</span>{" "}
                            {message.metadata?.generatedImage?.model}
                          </div>
                          <div>
                            <span className="font-medium">Size:</span>{" "}
                            {
                              message.metadata?.generatedImage
                                ?.generationSettings?.size
                            }
                          </div>
                          <div>
                            <span className="font-medium">Style:</span>{" "}
                            {
                              message.metadata?.generatedImage
                                ?.generationSettings?.style
                            }
                          </div>
                          <div>
                            <span className="font-medium">Quality:</span>{" "}
                            {
                              message.metadata?.generatedImage
                                ?.generationSettings?.quality
                            }
                          </div>
                        </div>

                        {message.metadata?.generatedImage?.revisedPrompt &&
                          message.metadata.generatedImage.revisedPrompt !==
                            message.metadata.generatedImage.prompt && (
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-slate-300">
                                AI Revised Prompt:
                              </div>
                              <div className="text-xs text-slate-400 italic">
                                "{message.metadata.generatedImage.revisedPrompt}
                                "
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  {/* Display attachments within the message bubble */}
                  {hasAttachments && (
                    <MessageAttachments
                      attachments={message.metadata!.attachments!}
                      isUser={isUser}
                      className={
                        message.content.trim() || hasGeneratedImage
                          ? "border-t border-white/10 pt-3 mt-3"
                          : ""
                      }
                    />
                  )}

                  {/* Inline Resume UI */}
                  {canResume && (
                    <div className="border-t border-amber-500/20 pt-3 mt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                          <span className="text-sm text-amber-300">
                            Stream interrupted
                          </span>
                          <Badge
                            variant="outline"
                            className="border-amber-500/30 text-amber-400 text-xs"
                          >
                            {Math.round(recoverableStream.progress)}% complete
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={handleInlineResume}
                            disabled={isResuming || isRecoveryLoading}
                            className="bg-amber-600/20 text-amber-400 border-amber-500/30 hover:bg-amber-600/30 text-xs"
                          >
                            {isResuming ? (
                              <>
                                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                Resuming...
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 mr-1" />
                                Resume
                              </>
                            )}
                          </Button>
                          {onDiscardStream && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                onDiscardStream(recoverableStream.streamId)
                              }
                              disabled={isResuming || isRecoveryLoading}
                              className="text-red-400 hover:text-red-300 hover:bg-red-600/10 text-xs"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div
              className={`flex items-center justify-between mt-2 text-xs text-slate-400 ${
                isUser ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>{new Date(message.timestamp).toLocaleTimeString()}</span>

                {/* Delivery Status */}
                {message.id.startsWith("temp-") ? (
                  <span className="text-amber-400" title="Sending...">
                    ⏳
                  </span>
                ) : (
                  <span className="text-emerald-400" title="Delivered">
                    ✓
                  </span>
                )}

                {/* Attachment indicator */}
                {hasAttachments && (
                  <span
                    className="text-blue-400"
                    title={`${
                      message.metadata!.attachments!.length
                    } attachment(s)`}
                  >
                    📎 {message.metadata!.attachments!.length}
                  </span>
                )}

                {/* Simple branching button */}
                {!isStreaming && !hasError && onCreateBranch && (
                  <SimpleBranchButton
                    messageId={message.id}
                    messageContent={message.content}
                    messageRole={message.role}
                    messageModel={message.model}
                    onCreateBranch={() =>
                      onCreateBranch({
                        id: message.id,
                        content: message.content,
                        role: message.role,
                        model: message.model,
                      })
                    }
                    className="ml-2"
                  />
                )}
              </div>

              <div className="flex items-center space-x-2">
                {message.metadata?.processingTime && (
                  <span
                    title={`Processing time: ${message.metadata.processingTime}s`}
                  >
                    ⚡ {message.metadata.processingTime.toFixed(1)}s
                  </span>
                )}

                {message.model && <span>• {message.model}</span>}
              </div>

              {!isUser && !hasError && (
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <QuickTTSButton
                    text={message.content}
                    size="sm"
                    className="h-6 w-6 p-0"
                  />
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <ThumbsDown className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Share className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Inline Image Generation Widget */}
            {isUser &&
              showInlineImageGeneration &&
              !isStreaming &&
              !hasError &&
              !hasGeneratedImage && (
                <div className="mt-3">
                  <InlineImageGeneration
                    prompt={message.content}
                    conversationId={conversationId}
                    messageId={message.id}
                    onImageGenerated={onImageGenerated}
                    autoDetect={true}
                    className="max-w-md"
                  />
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
