"use client";

import React, { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Wand2,
  Image as ImageIcon,
  Download,
  Copy,
  Share2,
  Zap,
  Settings2,
  DollarSign,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Compare,
  TrendingUp,
  Eye,
  Heart,
  MoreHorizontal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import type {
  ImageProvider,
  ImageModel,
  ImageSize,
  ImageQuality,
  ImageStyle,
} from "@/lib/ai/providers/image-provider-types";

// Enhanced interfaces for multi-provider support
interface ProviderStatus {
  provider: ImageProvider;
  available: boolean;
  error?: string;
  modelsAvailable?: string[];
  lastTested?: Date;
}

interface GenerationComparison {
  prompt: string;
  results: Array<{
    provider: ImageProvider;
    model: ImageModel;
    result?: any;
    error?: string;
    status: "pending" | "generating" | "complete" | "error";
    startTime?: number;
    endTime?: number;
    cost?: number;
  }>;
}

interface MultiProviderImageWidgetProps {
  conversationId?: string;
  onImageGenerated?: (result: any) => void;
  className?: string;
  showProviderComparison?: boolean;
  autoSelectBestProvider?: boolean;
}

export const MultiProviderImageWidget: React.FC<
  MultiProviderImageWidgetProps
> = ({
  conversationId,
  onImageGenerated,
  className,
  showProviderComparison = true,
  autoSelectBestProvider = false,
}) => {
  // State management
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedProvider, setSelectedProvider] =
    useState<ImageProvider>("openai");
  const [selectedModel, setSelectedModel] = useState<ImageModel>("dall-e-3");
  const [size, setSize] = useState<ImageSize>("1024x1024");
  const [quality, setQuality] = useState<ImageQuality>("standard");
  const [style, setStyle] = useState<ImageStyle>("natural");
  const [steps, setSteps] = useState([30]);
  const [guidance, setGuidance] = useState([7.5]);
  const [seed, setSeed] = useState<number | undefined>();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState("generate");

  // Provider management
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>(
    []
  );
  const [testingProviders, setTestingProviders] = useState(false);
  const [comparison, setComparison] = useState<GenerationComparison | null>(
    null
  );
  const [showProviderDetails, setShowProviderDetails] = useState(false);

  // Hooks
  const {
    generateImage,
    isGenerating,
    progress,
    error: generationError,
    generatedImage,
  } = useImageGeneration();

  // Provider capabilities (would be fetched from registry)
  const providerCapabilities = useMemo(() => {
    return {
      openai: {
        models: [
          {
            id: "dall-e-3",
            name: "DALL-E 3",
            supports: ["1024x1024", "1792x1024", "1024x1792"],
          },
          {
            id: "dall-e-2",
            name: "DALL-E 2",
            supports: ["256x256", "512x512", "1024x1024"],
          },
        ],
        features: { negativePrompt: false, steps: false, guidance: false },
        pricing: {
          "dall-e-3": { standard: 0.04, hd: 0.08 },
          "dall-e-2": { standard: 0.02 },
        },
      },
      replicate: {
        models: [
          {
            id: "stable-diffusion-xl",
            name: "Stable Diffusion XL",
            supports: ["512x512", "768x768", "1024x1024"],
          },
          {
            id: "flux-dev",
            name: "FLUX.1 [dev]",
            supports: ["512x512", "768x768", "1024x1024"],
          },
        ],
        features: { negativePrompt: true, steps: true, guidance: true },
        pricing: {
          "stable-diffusion-xl": { standard: 0.008 },
          "flux-dev": { standard: 0.01 },
        },
      },
      gemini: {
        models: [
          {
            id: "imagen-3.0",
            name: "Imagen 3.0",
            supports: ["512x512", "1024x1024"],
          },
        ],
        features: { negativePrompt: true, steps: false, guidance: false },
        pricing: { "imagen-3.0": { standard: 0.04, hd: 0.08 } },
      },
    };
  }, []);

  // Test provider connections
  const testProviderConnections = async () => {
    setTestingProviders(true);

    const providers: ImageProvider[] = ["openai", "replicate", "gemini"];
    const statuses: ProviderStatus[] = [];

    for (const provider of providers) {
      try {
        // This would call the actual API test endpoint
        const response = await fetch(`/api/images/test-provider`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider }),
        });

        const result = await response.json();

        statuses.push({
          provider,
          available: result.success,
          error: result.error,
          modelsAvailable: result.modelsAvailable,
          lastTested: new Date(),
        });
      } catch (error) {
        statuses.push({
          provider,
          available: false,
          error: error instanceof Error ? error.message : "Connection failed",
          lastTested: new Date(),
        });
      }
    }

    setProviderStatuses(statuses);
    setTestingProviders(false);
  };

  // Initialize provider tests
  useEffect(() => {
    testProviderConnections();
  }, []);

  // Auto-select best available provider
  useEffect(() => {
    if (autoSelectBestProvider && providerStatuses.length > 0) {
      const bestProvider = providerStatuses.find((p) => p.available);
      if (bestProvider && bestProvider.provider !== selectedProvider) {
        setSelectedProvider(bestProvider.provider);
        const firstModel =
          providerCapabilities[bestProvider.provider]?.models[0];
        if (firstModel) {
          setSelectedModel(firstModel.id as ImageModel);
        }
      }
    }
  }, [
    providerStatuses,
    autoSelectBestProvider,
    selectedProvider,
    providerCapabilities,
  ]);

  // Get available models for selected provider
  const availableModels = useMemo(() => {
    return providerCapabilities[selectedProvider]?.models || [];
  }, [selectedProvider, providerCapabilities]);

  // Get available sizes for selected model
  const availableSizes = useMemo(() => {
    const model = availableModels.find((m) => m.id === selectedModel);
    return model?.supports || ["1024x1024"];
  }, [availableModels, selectedModel]);

  // Calculate estimated cost
  const estimatedCost = useMemo(() => {
    const providerPricing = providerCapabilities[selectedProvider]?.pricing;
    const modelPricing = providerPricing?.[selectedModel];
    if (!modelPricing) return 0;

    return typeof modelPricing === "object"
      ? modelPricing[quality] || modelPricing.standard
      : modelPricing;
  }, [selectedProvider, selectedModel, quality, providerCapabilities]);

  // Handle generation
  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    try {
      const request = {
        prompt: prompt.trim(),
        provider: selectedProvider,
        model: selectedModel,
        size,
        quality,
        style,
        negativePrompt: negativePrompt.trim() || undefined,
        settings: {
          steps: providerCapabilities[selectedProvider]?.features.steps
            ? steps[0]
            : undefined,
          guidance: providerCapabilities[selectedProvider]?.features.guidance
            ? guidance[0]
            : undefined,
          seed,
        },
        conversationId,
        addToConversation: !!conversationId,
      };

      const result = await generateImage(request);
      onImageGenerated?.(result);
    } catch (error) {
      console.error("Image generation failed:", error);
    }
  };

  // Handle provider comparison
  const handleCompareProviders = async () => {
    if (!prompt.trim()) return;

    const availableProviders = providerStatuses.filter((p) => p.available);
    if (availableProviders.length < 2) return;

    const comparisonData: GenerationComparison = {
      prompt: prompt.trim(),
      results: availableProviders.map((p) => ({
        provider: p.provider,
        model: providerCapabilities[p.provider]?.models[0]?.id as ImageModel,
        status: "pending" as const,
      })),
    };

    setComparison(comparisonData);
    setActiveTab("compare");

    // Generate images with each provider
    for (let i = 0; i < comparisonData.results.length; i++) {
      const result = comparisonData.results[i];

      try {
        setComparison((prev) => {
          if (!prev) return null;
          const updated = { ...prev };
          updated.results[i] = {
            ...result,
            status: "generating",
            startTime: Date.now(),
          };
          return updated;
        });

        const request = {
          prompt: prompt.trim(),
          provider: result.provider,
          model: result.model,
          size: "1024x1024" as ImageSize,
          quality: "standard" as ImageQuality,
          style: "natural" as ImageStyle,
        };

        const generated = await generateImage(request);

        setComparison((prev) => {
          if (!prev) return null;
          const updated = { ...prev };
          updated.results[i] = {
            ...result,
            status: "complete",
            endTime: Date.now(),
            result: generated,
            cost: estimatedCost,
          };
          return updated;
        });
      } catch (error) {
        setComparison((prev) => {
          if (!prev) return null;
          const updated = { ...prev };
          updated.results[i] = {
            ...result,
            status: "error",
            endTime: Date.now(),
            error: error instanceof Error ? error.message : "Generation failed",
          };
          return updated;
        });
      }
    }
  };

  const renderProviderStatus = (status: ProviderStatus) => (
    <div
      key={status.provider}
      className="flex items-center justify-between p-3 rounded-lg border"
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-3 h-3 rounded-full",
            status.available ? "bg-green-500" : "bg-red-500"
          )}
        />
        <div>
          <div className="font-medium capitalize">{status.provider}</div>
          <div className="text-sm text-muted-foreground">
            {status.modelsAvailable?.length || 0} models available
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {status.available ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" />
        )}
      </div>
    </div>
  );

  const renderGenerationTab = () => (
    <div className="space-y-6">
      {/* Provider Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Provider & Model</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowProviderDetails(!showProviderDetails)}
            className="text-xs"
          >
            <Settings2 className="h-3 w-3 mr-1" />
            Details
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            value={selectedProvider}
            onValueChange={(value: ImageProvider) => {
              setSelectedProvider(value);
              const firstModel = availableModels[0];
              if (firstModel) {
                setSelectedModel(firstModel.id as ImageModel);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providerStatuses.map((status) => (
                <SelectItem
                  key={status.provider}
                  value={status.provider}
                  disabled={!status.available}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        status.available ? "bg-green-500" : "bg-red-500"
                      )}
                    />
                    <span className="capitalize">{status.provider}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedModel}
            onValueChange={(value: ImageModel) => setSelectedModel(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showProviderDetails && (
          <Card className="border-dashed">
            <CardContent className="pt-4">
              <div className="space-y-3">
                {providerStatuses.map(renderProviderStatus)}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testProviderConnections}
                  disabled={testingProviders}
                  className="w-full"
                >
                  {testingProviders ? (
                    <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-2" />
                  )}
                  Refresh Status
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Prompt Input */}
      <div className="space-y-3">
        <Label>Prompt</Label>
        <Textarea
          placeholder="Describe the image you want to generate..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[100px] resize-none"
          maxLength={4000}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{prompt.length}/4000 characters</span>
          <span>Cost: ${estimatedCost.toFixed(3)}</span>
        </div>
      </div>

      {/* Negative Prompt (if supported) */}
      {providerCapabilities[selectedProvider]?.features.negativePrompt && (
        <div className="space-y-3">
          <Label>Negative Prompt (Optional)</Label>
          <Textarea
            placeholder="What you don't want in the image..."
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            className="min-h-[60px] resize-none"
          />
        </div>
      )}

      {/* Basic Settings */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Size</Label>
          <Select
            value={size}
            onValueChange={(value: ImageSize) => setSize(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableSizes.map((sizeOption) => (
                <SelectItem key={sizeOption} value={sizeOption}>
                  {sizeOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Quality</Label>
          <Select
            value={quality}
            onValueChange={(value: ImageQuality) => setQuality(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="hd">HD (+cost)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Style</Label>
          <Select
            value={style}
            onValueChange={(value: ImageStyle) => setStyle(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="natural">Natural</SelectItem>
              <SelectItem value="vivid">Vivid</SelectItem>
              <SelectItem value="artistic">Artistic</SelectItem>
              <SelectItem value="photographic">Photographic</SelectItem>
              <SelectItem value="digital-art">Digital Art</SelectItem>
              <SelectItem value="cinematic">Cinematic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Advanced Settings</Label>
          <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
        </div>

        {showAdvanced && (
          <Card>
            <CardContent className="pt-4 space-y-4">
              {/* Steps (for Stable Diffusion) */}
              {providerCapabilities[selectedProvider]?.features.steps && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Steps</Label>
                    <span className="text-sm text-muted-foreground">
                      {steps[0]}
                    </span>
                  </div>
                  <Slider
                    value={steps}
                    onValueChange={setSteps}
                    max={50}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>
              )}

              {/* Guidance (for Stable Diffusion) */}
              {providerCapabilities[selectedProvider]?.features.guidance && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Guidance Scale</Label>
                    <span className="text-sm text-muted-foreground">
                      {guidance[0]}
                    </span>
                  </div>
                  <Slider
                    value={guidance}
                    onValueChange={setGuidance}
                    max={20}
                    min={1}
                    step={0.5}
                    className="w-full"
                  />
                </div>
              )}

              {/* Seed */}
              <div className="space-y-2">
                <Label>Seed (Optional)</Label>
                <Input
                  type="number"
                  placeholder="Random seed for reproducibility"
                  value={seed || ""}
                  onChange={(e) =>
                    setSeed(
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Generation Button */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate Image
              </>
            )}
          </Button>

          {showProviderComparison && (
            <Button
              variant="outline"
              onClick={handleCompareProviders}
              disabled={
                !prompt.trim() ||
                isGenerating ||
                providerStatuses.filter((p) => p.available).length < 2
              }
            >
              <Compare className="h-4 w-4 mr-2" />
              Compare
            </Button>
          )}
        </div>

        {isGenerating && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <div className="text-center text-sm text-muted-foreground">
              {progress < 30 && "Initializing generation..."}
              {progress >= 30 && progress < 70 && "Creating image..."}
              {progress >= 70 && "Finalizing..."}
            </div>
          </div>
        )}

        {generationError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{generationError}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Generated Image */}
      {generatedImage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generated Image
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative group">
                <img
                  src={generatedImage.url}
                  alt={generatedImage.prompt}
                  className="w-full rounded-lg border"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary">
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                  <Button size="sm" variant="secondary">
                    <Copy className="h-3 w-3 mr-1" />
                    Copy URL
                  </Button>
                  <Button size="sm" variant="secondary">
                    <Share2 className="h-3 w-3 mr-1" />
                    Share
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Provider</div>
                  <div className="text-muted-foreground capitalize">
                    {generatedImage.provider}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Model</div>
                  <div className="text-muted-foreground">
                    {generatedImage.model}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Generation Time</div>
                  <div className="text-muted-foreground">
                    {generatedImage.metadata.generationTime}s
                  </div>
                </div>
                <div>
                  <div className="font-medium">Cost</div>
                  <div className="text-muted-foreground">
                    ${generatedImage.metadata.estimatedCost.toFixed(3)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderComparisonTab = () => (
    <div className="space-y-6">
      {!comparison ? (
        <div className="text-center py-12">
          <Compare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Provider Comparison</h3>
          <p className="text-muted-foreground mb-4">
            Compare image generation results across different providers
          </p>
          <Button onClick={() => setActiveTab("generate")}>
            Start Generating to Compare
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium">Comparing Providers</h3>
            <p className="text-sm text-muted-foreground">
              "{comparison.prompt}"
            </p>
          </div>

          <div className="grid gap-4">
            {comparison.results.map((result, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{result.provider}</span>
                      <Badge variant="outline">{result.model}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.status === "pending" && (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                      {result.status === "generating" && (
                        <Badge variant="default">
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          Generating
                        </Badge>
                      )}
                      {result.status === "complete" && (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                      )}
                      {result.status === "error" && (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Error
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.status === "complete" && result.result && (
                    <div className="space-y-3">
                      <img
                        src={result.result.url}
                        alt={comparison.prompt}
                        className="w-full rounded-lg border"
                      />
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <div className="font-medium">Time</div>
                          <div className="text-muted-foreground">
                            {result.endTime && result.startTime
                              ? `${(
                                  (result.endTime - result.startTime) /
                                  1000
                                ).toFixed(1)}s`
                              : "N/A"}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Cost</div>
                          <div className="text-muted-foreground">
                            ${result.cost?.toFixed(3) || "N/A"}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Quality</div>
                          <div className="text-muted-foreground">
                            {result.result.generationSettings?.quality ||
                              "Standard"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {result.status === "error" && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{result.error}</AlertDescription>
                    </Alert>
                  )}

                  {result.status === "generating" && (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Card className={cn("w-full max-w-4xl mx-auto", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            AI Image Generation
            <Badge variant="secondary" className="ml-auto">
              Multi-Provider
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">Generate</TabsTrigger>
              <TabsTrigger value="compare">Compare</TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="mt-6">
              {renderGenerationTab()}
            </TabsContent>

            <TabsContent value="compare" className="mt-6">
              {renderComparisonTab()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
