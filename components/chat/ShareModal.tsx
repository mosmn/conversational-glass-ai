"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Share,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Link,
  Eye,
  Shield,
  AlertTriangle,
  Download,
  Users,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  conversationTitle: string;
}

interface SharingStatus {
  enabled: boolean;
  shareId: string | null;
  shareUrl: string | null;
}

export function ShareModal({
  isOpen,
  onClose,
  conversationId,
  conversationTitle,
}: ShareModalProps) {
  const [sharingStatus, setSharingStatus] = useState<SharingStatus>({
    enabled: false,
    shareId: null,
    shareUrl: null,
  });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Load current sharing status when modal opens
  useEffect(() => {
    if (isOpen && conversationId) {
      loadSharingStatus();
    }
  }, [isOpen, conversationId]);

  const loadSharingStatus = async () => {
    try {
      setLoading(true);
      console.log(
        "🔄 Loading sharing status for conversation:",
        conversationId
      );

      const response = await fetch(
        `/api/conversations/${conversationId}/share`
      );

      console.log("📡 Sharing status response:", {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Sharing status data:", data);
        setSharingStatus(
          data.sharing || {
            enabled: false,
            shareId: null,
            shareUrl: null,
          }
        );
      } else if (response.status === 404) {
        console.log(
          "📭 Conversation not found or sharing not set up yet - this is normal"
        );
        setSharingStatus({
          enabled: false,
          shareId: null,
          shareUrl: null,
        });
      } else {
        const errorText = await response.text();
        console.error(
          "❌ Failed to load sharing status:",
          response.status,
          errorText
        );
        setSharingStatus({
          enabled: false,
          shareId: null,
          shareUrl: null,
        });
      }
    } catch (error) {
      console.error("💥 Load sharing status error:", error);
      setSharingStatus({
        enabled: false,
        shareId: null,
        shareUrl: null,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSharing = async (enabled: boolean) => {
    console.log("🔄 Toggling sharing:", {
      enabled,
      conversationId,
      currentLoading: loading,
    });

    if (loading) {
      console.log("⏸️ Already loading, preventing double-click");
      return;
    }

    try {
      setLoading(true);
      console.log("📡 Sending sharing toggle request...");

      const response = await fetch(
        `/api/conversations/${conversationId}/share`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ enabled }),
        }
      );

      console.log("📡 Toggle sharing response:", {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Toggle sharing success:", data);
        setSharingStatus(
          data.sharing || {
            enabled: false,
            shareId: null,
            shareUrl: null,
          }
        );

        toast({
          title: enabled ? "Sharing enabled" : "Sharing disabled",
          description: enabled
            ? "Your conversation is now publicly accessible"
            : "Your conversation is no longer shared",
        });
      } else {
        const errorText = await response.text();
        console.error("❌ Toggle sharing failed:", response.status, errorText);

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }

        toast({
          title: "Error",
          description:
            errorData.error ||
            `Failed to ${enabled ? "enable" : "disable"} sharing`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("💥 Toggle sharing error:", error);
      toast({
        title: "Error",
        description: `Failed to ${
          enabled ? "enable" : "disable"
        } sharing. Please try again.`,
        variant: "destructive",
      });
    } finally {
      console.log("🏁 Toggle sharing finished, setting loading to false");
      setLoading(false);
    }
  };

  const copyShareUrl = async () => {
    if (!sharingStatus.shareUrl) return;

    try {
      await navigator.clipboard.writeText(sharingStatus.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      toast({
        title: "Link copied",
        description: "Share URL has been copied to clipboard",
      });
    } catch (error) {
      console.error("Copy error:", error);
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const openSharedConversation = () => {
    if (sharingStatus.shareUrl) {
      window.open(sharingStatus.shareUrl, "_blank");
    }
  };

  const exportConversation = async (format: "markdown" | "json" | "pdf") => {
    try {
      const endpoint =
        sharingStatus.enabled && sharingStatus.shareId
          ? `/api/shared/${sharingStatus.shareId}/export`
          : `/api/conversations/${conversationId}/export`;

      const response = await fetch(endpoint, {
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

      toast({
        title: "Export successful",
        description: `Conversation exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to export conversation",
        variant: "destructive",
      });
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Share className="h-5 w-5 text-emerald-400" />
              Share Conversation
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              Share "{conversationTitle}" with others or export the
              conversation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Sharing Toggle */}
            <Card className="bg-slate-700/50 border-slate-600 text-white">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-emerald-400" />
                    <CardTitle className="text-sm text-white">
                      Public Sharing
                    </CardTitle>
                  </div>
                  <Switch
                    checked={sharingStatus.enabled}
                    onCheckedChange={toggleSharing}
                    disabled={loading}
                  />
                </div>
                <CardDescription className="text-slate-300">
                  {sharingStatus.enabled
                    ? "Your conversation is publicly accessible via a unique link"
                    : "Enable sharing to create a public link to this conversation"}
                </CardDescription>
              </CardHeader>

              {sharingStatus.enabled && sharingStatus.shareUrl && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={sharingStatus.shareUrl}
                        readOnly
                        className="bg-slate-800 border-slate-600 text-slate-200"
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={copyShareUrl}
                            size="sm"
                            variant="outline"
                            className="shrink-0 border-slate-600 text-slate-200 hover:bg-slate-600"
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={openSharedConversation}
                            size="sm"
                            variant="outline"
                            className="shrink-0 border-slate-600 text-slate-200 hover:bg-slate-600"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Open shared conversation
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Eye className="h-3 w-3" />
                      <span>
                        Anyone with this link can view the conversation
                      </span>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Privacy Notice */}
            {sharingStatus.enabled && (
              <Card className="bg-amber-500/10 border-amber-500/30">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-200">
                      <p className="font-medium mb-1">Privacy Notice</p>
                      <p>
                        This conversation will be publicly viewable by anyone
                        with the link. Make sure it doesn't contain sensitive
                        information.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator className="bg-slate-600" />

            {/* Export Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2 text-white">
                <Download className="h-4 w-4 text-emerald-400" />
                Export Options
              </Label>

              <div className="grid grid-cols-3 gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start border-slate-600 text-slate-200 hover:bg-slate-600"
                      onClick={() => exportConversation("markdown")}
                    >
                      <Download className="h-3 w-3 mr-2" />
                      MD
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export as Markdown</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start border-slate-600 text-slate-200 hover:bg-slate-600"
                      onClick={() => exportConversation("json")}
                    >
                      <Download className="h-3 w-3 mr-2" />
                      JSON
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export as JSON</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start border-slate-600 text-slate-400"
                      onClick={() => exportConversation("pdf")}
                      disabled={true} // PDF coming in Phase 3
                    >
                      <Download className="h-3 w-3 mr-2" />
                      PDF
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>PDF export coming soon</TooltipContent>
                </Tooltip>
              </div>

              <p className="text-xs text-slate-400">
                Download conversation in your preferred format
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-200 hover:bg-slate-600"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
