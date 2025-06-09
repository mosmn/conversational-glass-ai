"use client";

import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  Check,
  ExternalLink,
  Globe,
  MessageCircle,
  Zap,
  User,
  Bot,
  Eye,
  Home,
  Calendar,
  Clock,
  Share,
  Download,
  MoreVertical,
} from "lucide-react";
import { MessageContent } from "./MessageContent";
import ConversationalGlassLogo from "@/components/ConversationalGlassLogo";
import Link from "next/link";

interface PublicConversationData {
  conversation: {
    id: string;
    title: string;
    model: string;
    createdAt: string;
    updatedAt: string;
    metadata: {
      totalMessages: number;
      lastModel: string;
      tags: string[];
      sentiment: "positive" | "neutral" | "negative" | null;
      summary: string | null;
    };
    creator: {
      name: string;
      avatar: string | null;
    };
  };
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    model: string | null;
    timestamp: string;
    tokenCount: number;
    metadata: {
      streamingComplete?: boolean;
      processingTime?: number;
    };
  }>;
  stats: {
    messageCount: number;
    userMessages: number;
    assistantMessages: number;
    modelsUsed: string[];
    totalTokens: number;
    createdAt: string;
    lastActivity: string;
  };
  shareInfo: {
    shareId: string;
    isPublic: boolean;
    sharedAt: string;
  };
}

interface PublicConversationViewProps {
  shareId: string;
  initialData: PublicConversationData;
}

export function PublicConversationView({
  shareId,
  initialData,
}: PublicConversationViewProps) {
  const [copied, setCopied] = useState(false);
  const { conversation, messages, stats } = initialData;

  const copyShareUrl = async () => {
    const shareUrl = window.location.href;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy error:", error);
    }
  };

  const exportConversation = async (format: "markdown" | "json" | "pdf") => {
    try {
      const response = await fetch(`/api/shared/${shareId}/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format,
          includeMetadata: true,
          includeTimestamps: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Export failed: ${response.statusText}`);
      }

      // Get filename from content-disposition header
      const contentDisposition = response.headers.get("content-disposition");
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] || `conversation.${format}`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      // You could show a toast notification here if available
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-800/30 backdrop-blur-xl border-b border-slate-700/50">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-300 hover:text-white"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Home
                  </Button>
                </Link>
                <Separator
                  orientation="vertical"
                  className="h-6 bg-slate-600"
                />
                <ConversationalGlassLogo
                  size="sm"
                  animated={false}
                  showText={true}
                  className="mr-4"
                />
                <div>
                  <h1 className="text-xl font-semibold text-white">
                    {conversation.title}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className="border-emerald-500 text-emerald-400 text-xs"
                    >
                      <Globe className="h-3 w-3 mr-1" />
                      Shared
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-slate-600 text-slate-300 text-xs"
                    >
                      {conversation.model}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={copyShareUrl}
                      size="sm"
                      variant="ghost"
                      className="text-slate-300 hover:text-white"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {copied ? "Copied!" : "Copy link"}
                  </TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-slate-300 hover:text-white"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 glass-dark border-slate-700/50"
                  >
                    <DropdownMenuItem
                      onClick={() => exportConversation("markdown")}
                      className="cursor-pointer hover:bg-slate-700/50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export as Markdown
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => exportConversation("json")}
                      className="cursor-pointer hover:bg-slate-700/50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled
                      className="cursor-not-allowed opacity-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export as PDF (Soon)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() =>
                        window.open(window.location.href, "_blank")
                      }
                      size="sm"
                      variant="ghost"
                      className="text-slate-300 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open in new tab</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Messages - Main Column */}
            <div className="lg:col-span-3">
              {/* Conversation Header */}
              <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6 mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={conversation.creator.avatar || undefined}
                      />
                      <AvatarFallback className="bg-emerald-600 text-white">
                        {conversation.creator.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-lg font-semibold text-white mb-1">
                        {conversation.creator.name}
                      </h2>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(conversation.createdAt)}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {stats.messageCount} messages
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {stats.totalTokens.toLocaleString()} tokens
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-400">Public</span>
                  </div>
                </div>
              </div>

              {/* Messages Container */}
              <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg overflow-hidden">
                <ScrollArea className="h-[600px]">
                  <div className="p-6 space-y-6">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.role === "assistant"
                            ? "justify-start"
                            : "justify-end"
                        } group`}
                      >
                        <div
                          className={`max-w-[80%] ${
                            message.role === "user" ? "order-2" : "order-1"
                          }`}
                        >
                          <div
                            className={`flex items-start space-x-3 ${
                              message.role === "user"
                                ? "flex-row-reverse space-x-reverse"
                                : ""
                            }`}
                          >
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarFallback
                                className={`${
                                  message.role === "user"
                                    ? "bg-emerald-600"
                                    : "bg-blue-600"
                                }`}
                              >
                                {message.role === "user" ? (
                                  <User className="h-4 w-4" />
                                ) : (
                                  <Bot className="h-4 w-4" />
                                )}
                              </AvatarFallback>
                            </Avatar>

                            <div
                              className={`flex-1 ${
                                message.role === "user"
                                  ? "text-right"
                                  : "text-left"
                              }`}
                            >
                              <div
                                className={`inline-block p-4 rounded-2xl ${
                                  message.role === "user"
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm text-slate-100"
                                }`}
                              >
                                <MessageContent
                                  content={message.content}
                                  isStreaming={false}
                                  isUser={message.role === "user"}
                                  showLineNumbers={false}
                                  maxCodeBlockHeight="300px"
                                  allowHtml={false}
                                />
                              </div>

                              <div
                                className={`flex items-center justify-between mt-2 text-xs text-slate-400 ${
                                  message.role === "user"
                                    ? "flex-row-reverse"
                                    : "flex-row"
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <span>{formatTime(message.timestamp)}</span>
                                  <span
                                    className="text-emerald-400"
                                    title="Delivered"
                                  >
                                    ✓
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2">
                                  {message.metadata?.processingTime && (
                                    <span
                                      title={`Processing time: ${message.metadata.processingTime}s`}
                                    >
                                      ⚡{" "}
                                      {(
                                        message.metadata.processingTime / 1000
                                      ).toFixed(1)}
                                      s
                                    </span>
                                  )}
                                  {message.model && (
                                    <span>• {message.model}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Stats Card */}
              <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Statistics
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Messages</span>
                    <span className="text-white font-medium">
                      {stats.messageCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">User</span>
                    <span className="text-white font-medium">
                      {stats.userMessages}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Assistant</span>
                    <span className="text-white font-medium">
                      {stats.assistantMessages}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Tokens</span>
                    <span className="text-white font-medium">
                      {stats.totalTokens.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Duration</span>
                    <span className="text-white font-medium">
                      {Math.ceil(
                        (new Date(stats.lastActivity).getTime() -
                          new Date(stats.createdAt).getTime()) /
                          (1000 * 60)
                      )}
                      m
                    </span>
                  </div>
                </div>
              </div>

              {/* Models Used */}
              <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  AI Models
                </h3>
                <div className="space-y-2">
                  {stats.modelsUsed.map((model) => (
                    <Badge
                      key={model}
                      variant="outline"
                      className="border-slate-600 text-slate-300 w-full justify-center"
                    >
                      {model}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Share Info */}
              <div className="bg-emerald-600/10 backdrop-blur-sm border border-emerald-500/30 rounded-lg p-6">
                <div className="text-center space-y-3">
                  <Share className="h-8 w-8 text-emerald-400 mx-auto" />
                  <h3 className="text-lg font-semibold text-emerald-300">
                    Shared Conversation
                  </h3>
                  <p className="text-sm text-emerald-200/80">
                    This conversation is publicly accessible via a unique link
                  </p>
                  <div className="pt-2">
                    <Button
                      onClick={copyShareUrl}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-2" />
                          Copy Link
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Timeline
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <div>
                      <div className="text-white">Created</div>
                      <div className="text-slate-400">
                        {formatDate(conversation.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <div>
                      <div className="text-white">Last Activity</div>
                      <div className="text-slate-400">
                        {formatDate(stats.lastActivity)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                    <div>
                      <div className="text-white">Shared</div>
                      <div className="text-slate-400">
                        {formatDate(initialData.shareInfo.sharedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
