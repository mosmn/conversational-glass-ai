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
      const response = await fetch(
        `/api/conversations/${conversationId}/share`
      );

      if (response.ok) {
        const data = await response.json();
        setSharingStatus(data.sharing);
      } else {
        toast({
          title: "Error",
          description: "Failed to load sharing status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Load sharing status error:", error);
      toast({
        title: "Error",
        description: "Failed to load sharing status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSharing = async (enabled: boolean) => {
    try {
      setLoading(true);
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

      if (response.ok) {
        const data = await response.json();
        setSharingStatus(data.sharing);

        toast({
          title: enabled ? "Sharing enabled" : "Sharing disabled",
          description: enabled
            ? "Your conversation is now publicly accessible"
            : "Your conversation is no longer shared",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update sharing settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Toggle sharing error:", error);
      toast({
        title: "Error",
        description: "Failed to update sharing settings",
        variant: "destructive",
      });
    } finally {
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

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md glass-dark border-slate-700/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share className="h-5 w-5 text-emerald-400" />
              Share Conversation
            </DialogTitle>
            <DialogDescription>
              Share "{conversationTitle}" with others or export the
              conversation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Sharing Toggle */}
            <Card className="glass-dark border-slate-700/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-emerald-400" />
                    <CardTitle className="text-sm">Public Sharing</CardTitle>
                  </div>
                  <Switch
                    checked={sharingStatus.enabled}
                    onCheckedChange={toggleSharing}
                    disabled={loading}
                  />
                </div>
                <CardDescription>
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
                        className="bg-slate-800/50 border-slate-600 text-sm"
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={copyShareUrl}
                            size="sm"
                            variant="outline"
                            className="shrink-0"
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
                            className="shrink-0"
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
              <Card className="glass-dark border-amber-500/30 bg-amber-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-200/80">
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

            <Separator className="bg-slate-700/50" />

            {/* Export Options */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Download className="h-4 w-4 text-emerald-400" />
                Export Options
              </Label>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  disabled={true} // TODO: Implement export functionality
                >
                  <Download className="h-3 w-3 mr-2" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  disabled={true} // TODO: Implement export functionality
                >
                  <Download className="h-3 w-3 mr-2" />
                  Markdown
                </Button>
              </div>

              <p className="text-xs text-slate-500">
                Export functionality coming soon
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={onClose} variant="outline" size="sm">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
