"use client";

import React, { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Image as ImageIcon,
  FileText,
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  Download,
  Share2,
  Eye,
  Filter,
  Grid3X3,
  List,
  Palette,
  Camera,
  Wand2,
  TrendingUp,
  Zap,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Heart,
  Bookmark,
  RefreshCw,
  Search,
  Tag,
  Map,
} from "lucide-react";

interface GeneratedImageArtifact {
  id: string;
  url: string;
  thumbnailUrl?: string;
  prompt: string;
  revisedPrompt?: string;
  provider: string;
  model: string;
  generationSettings: {
    size: string;
    quality: string;
    style: string;
    steps?: number;
    guidance?: number;
    seed?: number;
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
  messageId?: string;
  createdAt: string;
}

interface ConversationSummary {
  id: string;
  title: string;
  content: string;
  model: string;
  type: "summary" | "insights" | "topics" | "action_items";
  metadata: {
    confidence: number;
    keywords: string[];
    relevanceScore: number;
  };
  createdAt: string;
}

interface ConversationArtifactsProps {
  conversationId: string;
  images?: GeneratedImageArtifact[];
  summaries?: ConversationSummary[];
  className?: string;
  onRefresh?: () => void;
  onImageClick?: (image: GeneratedImageArtifact) => void;
  showAnalytics?: boolean;
}

type ViewMode = "grid" | "list" | "timeline";
type FilterMode = "all" | "images" | "summaries" | "recent" | "cost";

export const ConversationArtifacts: React.FC<ConversationArtifactsProps> = ({
  conversationId,
  images = [],
  summaries = [],
  className,
  onRefresh,
  onImageClick,
  showAnalytics = true,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedImage, setSelectedImage] =
    useState<GeneratedImageArtifact | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Analytics calculations
  const analytics = useMemo(() => {
    const totalImages = images.length;
    const totalCost = images.reduce(
      (sum, img) => sum + img.metadata.estimatedCost,
      0
    );
    const averageGenerationTime =
      totalImages > 0
        ? images.reduce((sum, img) => sum + img.metadata.generationTime, 0) /
          totalImages
        : 0;

    const providerStats = images.reduce((stats, img) => {
      stats[img.provider] = (stats[img.provider] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    const modelStats = images.reduce((stats, img) => {
      stats[img.model] = (stats[img.model] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    const recentImages = images.filter((img) => {
      const createdAt = new Date(img.createdAt);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return createdAt > yesterday;
    }).length;

    return {
      totalImages,
      totalCost,
      averageGenerationTime,
      providerStats,
      modelStats,
      recentImages,
      mostUsedProvider:
        Object.entries(providerStats).sort(([, a], [, b]) => b - a)[0]?.[0] ||
        "None",
      mostUsedModel:
        Object.entries(modelStats).sort(([, a], [, b]) => b - a)[0]?.[0] ||
        "None",
    };
  }, [images]);

  // Filter and search logic
  const filteredContent = useMemo(() => {
    let filteredImages = images;
    let filteredSummaries = summaries;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredImages = images.filter(
        (img) =>
          img.prompt.toLowerCase().includes(query) ||
          img.revisedPrompt?.toLowerCase().includes(query) ||
          img.provider.toLowerCase().includes(query) ||
          img.model.toLowerCase().includes(query)
      );
      filteredSummaries = summaries.filter(
        (summary) =>
          summary.title.toLowerCase().includes(query) ||
          summary.content.toLowerCase().includes(query) ||
          summary.metadata.keywords.some((keyword) =>
            keyword.toLowerCase().includes(query)
          )
      );
    }

    // Apply filter mode
    switch (filterMode) {
      case "images":
        return { images: filteredImages, summaries: [] };
      case "summaries":
        return { images: [], summaries: filteredSummaries };
      case "recent":
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          images: filteredImages.filter(
            (img) => new Date(img.createdAt) > yesterday
          ),
          summaries: filteredSummaries.filter(
            (summary) => new Date(summary.createdAt) > yesterday
          ),
        };
      case "cost":
        return {
          images: filteredImages.sort(
            (a, b) => b.metadata.estimatedCost - a.metadata.estimatedCost
          ),
          summaries: filteredSummaries,
        };
      default:
        return { images: filteredImages, summaries: filteredSummaries };
    }
  }, [images, summaries, searchQuery, filterMode]);

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Render image grid
  const renderImageGrid = () => (
    <div
      className={cn(
        "grid gap-4",
        viewMode === "grid"
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
          : "grid-cols-1"
      )}
    >
      {filteredContent.images.map((image) => (
        <Card
          key={image.id}
          className="group cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden"
          onClick={() => setSelectedImage(image)}
        >
          <div className="relative aspect-square">
            <img
              src={image.thumbnailUrl || image.url}
              alt={image.prompt}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {image.provider}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-white">
                  <DollarSign className="h-3 w-3" />
                  {image.metadata.estimatedCost.toFixed(3)}
                </div>
              </div>
            </div>
          </div>
          {viewMode === "list" && (
            <CardContent className="p-3">
              <div className="space-y-2">
                <div className="text-sm font-medium line-clamp-2">
                  {image.prompt}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{image.generationSettings.size}</span>
                  <span>{formatTimestamp(image.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );

  // Render summaries
  const renderSummaries = () => (
    <div className="space-y-4">
      {filteredContent.summaries.map((summary) => (
        <Card key={summary.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                {summary.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">
                  {summary.type.replace("_", " ")}
                </Badge>
                <Badge
                  variant={
                    summary.metadata.confidence > 0.8 ? "default" : "secondary"
                  }
                  className="text-xs"
                >
                  {Math.round(summary.metadata.confidence * 100)}%
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{summary.content}</p>
              {summary.metadata.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {summary.metadata.keywords
                    .slice(0, 6)
                    .map((keyword, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs"
                      >
                        {keyword}
                      </Badge>
                    ))}
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Generated by {summary.model}</span>
                <span>{formatTimestamp(summary.createdAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Render analytics
  const renderAnalytics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <ImageIcon className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{analytics.totalImages}</div>
              <div className="text-xs text-muted-foreground">Total Images</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <DollarSign className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                ${analytics.totalCost.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Total Cost</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Clock className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {analytics.averageGenerationTime.toFixed(1)}s
              </div>
              <div className="text-xs text-muted-foreground">Avg Time</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">{analytics.recentImages}</div>
              <div className="text-xs text-muted-foreground">Recent (24h)</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const hasContent =
    filteredContent.images.length > 0 || filteredContent.summaries.length > 0;

  return (
    <TooltipProvider>
      <Card
        className={cn(
          "w-full bg-slate-800/50 border-slate-700/50 backdrop-blur-sm",
          className
        )}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Sparkles className="h-5 w-5 text-blue-400" />
              Conversation Artifacts
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search artifacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs border rounded-md bg-slate-700/50 border-slate-600/50 text-slate-100 placeholder-slate-400"
                />
              </div>

              {/* Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <Filter className="h-3 w-3 mr-1" />
                    {filterMode === "all"
                      ? "All"
                      : filterMode.charAt(0).toUpperCase() +
                        filterMode.slice(1)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterMode("all")}>
                    <List className="h-3 w-3 mr-2" />
                    All Artifacts
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterMode("images")}>
                    <ImageIcon className="h-3 w-3 mr-2" />
                    Images Only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterMode("summaries")}>
                    <FileText className="h-3 w-3 mr-2" />
                    Summaries Only
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setFilterMode("recent")}>
                    <Clock className="h-3 w-3 mr-2" />
                    Recent (24h)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterMode("cost")}>
                    <DollarSign className="h-3 w-3 mr-2" />
                    By Cost
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* View Mode */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    {viewMode === "grid" ? (
                      <Grid3X3 className="h-3 w-3" />
                    ) : (
                      <List className="h-3 w-3" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setViewMode("grid")}>
                    <Grid3X3 className="h-3 w-3 mr-2" />
                    Grid View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setViewMode("list")}>
                    <List className="h-3 w-3 mr-2" />
                    List View
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Refresh */}
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="h-8"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {!hasContent ? (
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Artifacts Yet</h3>
              <p className="text-muted-foreground mb-4">
                Generate images or create summaries to see conversation
                artifacts
              </p>
            </div>
          ) : (
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="content"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Content (
                  {filteredContent.images.length +
                    filteredContent.summaries.length}
                  )
                </TabsTrigger>
                {showAnalytics && (
                  <TabsTrigger
                    value="analytics"
                    className="flex items-center gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="content" className="space-y-6 mt-6">
                {filteredContent.images.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Generated Images ({filteredContent.images.length})
                      </h3>
                      {analytics.totalCost > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Total: ${analytics.totalCost.toFixed(3)}
                        </Badge>
                      )}
                    </div>
                    {renderImageGrid()}
                  </div>
                )}

                {filteredContent.summaries.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      AI Summaries ({filteredContent.summaries.length})
                    </h3>
                    {renderSummaries()}
                  </div>
                )}
              </TabsContent>

              {showAnalytics && (
                <TabsContent value="analytics" className="space-y-6 mt-6">
                  {renderAnalytics()}

                  {Object.keys(analytics.providerStats).length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">
                            Provider Usage
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {Object.entries(analytics.providerStats).map(
                              ([provider, count]) => (
                                <div
                                  key={provider}
                                  className="flex items-center justify-between"
                                >
                                  <span className="text-sm capitalize">
                                    {provider}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 bg-muted rounded-full h-2">
                                      <div
                                        className="bg-blue-500 h-2 rounded-full"
                                        style={{
                                          width: `${
                                            (count / analytics.totalImages) *
                                            100
                                          }%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                      {count}
                                    </span>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Model Usage</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {Object.entries(analytics.modelStats)
                              .slice(0, 5)
                              .map(([model, count]) => (
                                <div
                                  key={model}
                                  className="flex items-center justify-between"
                                >
                                  <span className="text-sm">{model}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 bg-muted rounded-full h-2">
                                      <div
                                        className="bg-green-500 h-2 rounded-full"
                                        style={{
                                          width: `${
                                            (count / analytics.totalImages) *
                                            100
                                          }%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                      {count}
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </TabsContent>
              )}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Image Detail Dialog */}
      <Dialog
        open={!!selectedImage}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Generated Image Details</DialogTitle>
            <DialogDescription>{selectedImage?.prompt}</DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-6">
              <div className="relative">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.prompt}
                  className="w-full rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Generation Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Provider:</span>
                      <span>{selectedImage.provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Model:</span>
                      <span>{selectedImage.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Size:</span>
                      <span>{selectedImage.generationSettings.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quality:</span>
                      <span>{selectedImage.generationSettings.quality}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Style:</span>
                      <span>{selectedImage.generationSettings.style}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Performance</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Generation Time:
                      </span>
                      <span>
                        {selectedImage.metadata.generationTime.toFixed(1)}s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost:</span>
                      <span>
                        ${selectedImage.metadata.estimatedCost.toFixed(3)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Format:</span>
                      <span>
                        {selectedImage.metadata.format?.toUpperCase() || "PNG"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dimensions:</span>
                      <span>
                        {selectedImage.dimensions.width}×
                        {selectedImage.dimensions.height}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedImage.revisedPrompt &&
                selectedImage.revisedPrompt !== selectedImage.prompt && (
                  <div className="space-y-2">
                    <h4 className="font-medium">AI Revised Prompt</h4>
                    <p className="text-sm text-muted-foreground italic">
                      "{selectedImage.revisedPrompt}"
                    </p>
                  </div>
                )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm">
                  <Copy className="h-3 w-3 mr-1" />
                  Copy URL
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="h-3 w-3 mr-1" />
                  Share
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};
