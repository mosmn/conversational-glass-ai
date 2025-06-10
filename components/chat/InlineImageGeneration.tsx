"use client";

import React, { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Wand2,
  Image as ImageIcon,
  Sparkles,
  Settings2,
  Clock,
  DollarSign,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  Palette,
  Eye,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import type {
  ImageProvider,
  ImageModel,
  ImageSize,
  ImageQuality,
  ImageStyle,
} from "@/lib/ai/providers/image-provider-types";

interface InlineImageGenerationProps {
  prompt: string;
  conversationId: string;
  messageId?: string;
  onImageGenerated?: (result: any) => void;
  onDismiss?: () => void;
  className?: string;
  autoDetect?: boolean;
  position?: "above" | "below" | "replace";
}

// Image generation prompt patterns
const IMAGE_PROMPT_PATTERNS = [
  /(?:^|\s)(?:generate|create|make|draw|design|produce)\s+(?:an?\s+)?image/i,
  /(?:^|\s)(?:image|picture|photo|drawing|artwork|illustration)\s+of/i,
  /(?:^|\s)(?:show|visualize|display)\s+(?:me\s+)?(?:an?\s+)?(?:image|picture)/i,
  /(?:^|\s)dall[\-\s]?e/i,
  /(?:^|\s)stable[\-\s]?diffusion/i,
  /(?:^|\s)midjourney/i,
  /(?:^|\s)text[\-\s]?to[\-\s]?image/i,
  /(?:^|\s)t2i(?:\s|$)/i,
];

// Extract clean image prompt from user message
function extractImagePrompt(text: string): string {
  // Remove common prefixes
  let cleaned = text
    .replace(
      /^(?:please\s+)?(?:can\s+you\s+)?(?:generate|create|make|draw|design|produce)\s+(?:an?\s+)?(?:image|picture|photo|drawing|artwork|illustration)\s+(?:of\s+)?/i,
      ""
    )
    .replace(
      /^(?:show|visualize|display)\s+(?:me\s+)?(?:an?\s+)?(?:image|picture)\s+(?:of\s+)?/i,
      ""
    )
    .replace(
      /^(?:use\s+)?dall[\-\s]?e\s+(?:to\s+)?(?:generate|create|make)\s+/i,
      ""
    )
    .replace(
      /^(?:use\s+)?stable[\-\s]?diffusion\s+(?:to\s+)?(?:generate|create|make)\s+/i,
      ""
    )
    .trim();

  // If cleaning removed too much, use original
  if (cleaned.length < 10) {
    cleaned = text;
  }

  return cleaned;
}

// Detect if text likely describes an image generation request
function isImageGenerationPrompt(text: string): boolean {
  if (text.length < 5) return false;

  return IMAGE_PROMPT_PATTERNS.some((pattern) => pattern.test(text));
}

// Get suggested providers based on prompt content
function suggestProvidersForPrompt(
  prompt: string
): { provider: ImageProvider; reason: string; priority: number }[] {
  const suggestions: {
    provider: ImageProvider;
    reason: string;
    priority: number;
  }[] = [];

  // Analyze prompt content
  const hasPhotographic = /photo|realistic|portrait|landscape|candid/i.test(
    prompt
  );
  const hasArtistic =
    /art|painting|drawing|sketch|watercolor|oil|abstract/i.test(prompt);
  const hasCartoon = /cartoon|anime|character|mascot|logo|icon/i.test(prompt);
  const hasComplexScene = prompt.length > 100;
  const hasFineDetails = /detailed|intricate|complex|elaborate/i.test(prompt);

  // OpenAI DALL-E suggestions
  if (hasPhotographic || !hasArtistic) {
    suggestions.push({
      provider: "openai",
      reason: "Best for photorealistic images and prompt understanding",
      priority: 9,
    });
  }

  // Replicate Stable Diffusion suggestions
  if (hasArtistic || hasFineDetails || hasComplexScene) {
    suggestions.push({
      provider: "replicate",
      reason: "Excellent for artistic styles and detailed customization",
      priority: hasArtistic ? 9 : 7,
    });
  }

  // Gemini suggestions (when available)
  if (hasCartoon || prompt.length < 50) {
    suggestions.push({
      provider: "gemini",
      reason: "Good for simple, clean illustrations",
      priority: 6,
    });
  }

  return suggestions.sort((a, b) => b.priority - a.priority);
}

export const InlineImageGeneration: React.FC<InlineImageGenerationProps> = ({
  prompt,
  conversationId,
  messageId,
  onImageGenerated,
  onDismiss,
  className,
  autoDetect = true,
  position = "below",
}) => {
  // State management
  const [isVisible, setIsVisible] = useState(false);
  const [cleanPrompt, setCleanPrompt] = useState("");
  const [selectedProvider, setSelectedProvider] =
    useState<ImageProvider>("openai");
  const [selectedModel, setSelectedModel] = useState<ImageModel>("dall-e-3");
  const [size, setSize] = useState<ImageSize>("1024x1024");
  const [quality, setQuality] = useState<ImageQuality>("standard");
  const [style, setStyle] = useState<ImageStyle>("natural");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [steps, setSteps] = useState([30]);
  const [guidance, setGuidance] = useState([7.5]);
  const [seed, setSeed] = useState<number | undefined>();

  // Hooks
  const {
    generateImage,
    isGenerating,
    progress,
    error: generationError,
    generatedImage,
  } = useImageGeneration();

  // Auto-detect image generation prompts
  useEffect(() => {
    if (autoDetect && prompt) {
      const isImagePrompt = isImageGenerationPrompt(prompt);
      setIsVisible(isImagePrompt);

      if (isImagePrompt) {
        const extracted = extractImagePrompt(prompt);
        setCleanPrompt(extracted);

        // Auto-suggest best provider
        const suggestions = suggestProvidersForPrompt(extracted);
        if (suggestions.length > 0) {
          setSelectedProvider(suggestions[0].provider);
        }
      }
    }
  }, [prompt, autoDetect]);

  // Provider capabilities
  const providerCapabilities = useMemo(() => {
    return {
      openai: {
        models: [
          {
            id: "dall-e-3",
            name: "DALL-E 3",
            sizes: ["1024x1024", "1792x1024", "1024x1792"],
          },
          {
            id: "dall-e-2",
            name: "DALL-E 2",
            sizes: ["256x256", "512x512", "1024x1024"],
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
            sizes: ["512x512", "768x768", "1024x1024"],
          },
          {
            id: "flux-dev",
            name: "FLUX.1 [dev]",
            sizes: ["512x512", "768x768", "1024x1024"],
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
            sizes: ["512x512", "1024x1024"],
          },
        ],
        features: { negativePrompt: true, steps: false, guidance: false },
        pricing: { "imagen-3.0": { standard: 0.04, hd: 0.08 } },
      },
    };
  }, []);

  // Get available models for selected provider
  const availableModels = useMemo(() => {
    return providerCapabilities[selectedProvider]?.models || [];
  }, [selectedProvider, providerCapabilities]);

  // Get available sizes for selected model
  const availableSizes = useMemo(() => {
    const model = availableModels.find((m) => m.id === selectedModel);
    return model?.sizes || ["1024x1024"];
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
    if (!cleanPrompt.trim()) return;

    try {
      const request = {
        prompt: cleanPrompt.trim(),
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
        messageId,
        addToConversation: true, // Always add to conversation when generated inline
      };

      const result = await generateImage(request);
      onImageGenerated?.(result);
    } catch (error) {
      console.error("Inline image generation failed:", error);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  const providerSuggestions = suggestProvidersForPrompt(cleanPrompt);

  return (
    <TooltipProvider>
      <Card
        className={cn(
          "w-full border-dashed border-2 border-blue-500/30 bg-slate-800/30 backdrop-blur-sm border-slate-700/50",
          className
        )}
      >
        <CardContent className="pt-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-medium text-sm">
                    AI Image Generation Detected
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Generate an image from your prompt
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-100 hover:bg-slate-700/50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Provider suggestions */}
            {providerSuggestions.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Recommended providers:
                </div>
                <div className="flex flex-wrap gap-2">
                  {providerSuggestions.slice(0, 2).map((suggestion) => (
                    <Tooltip key={suggestion.provider}>
                      <TooltipTrigger asChild>
                        <Button
                          variant={
                            selectedProvider === suggestion.provider
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => {
                            setSelectedProvider(suggestion.provider);
                            const firstModel =
                              providerCapabilities[suggestion.provider]
                                ?.models[0];
                            if (firstModel) {
                              setSelectedModel(firstModel.id as ImageModel);
                            }
                          }}
                          className="h-7 text-xs"
                        >
                          <span className="capitalize">
                            {suggestion.provider}
                          </span>
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {suggestion.priority}/10
                          </Badge>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">{suggestion.reason}</div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            )}

            {/* Prompt editing */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Image Prompt</label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    ${estimatedCost.toFixed(3)}
                  </Badge>
                  <Badge
                    variant={
                      selectedProvider === "openai"
                        ? "default"
                        : selectedProvider === "replicate"
                        ? "secondary"
                        : "outline"
                    }
                    className="text-xs"
                  >
                    {selectedProvider}
                  </Badge>
                </div>
              </div>
              <Input
                value={cleanPrompt}
                onChange={(e) => setCleanPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                className="text-sm"
              />
            </div>

            {/* Quick settings */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Model</label>
                <Select
                  value={selectedModel}
                  onValueChange={(value: ImageModel) => setSelectedModel(value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem
                        key={model.id}
                        value={model.id}
                        className="text-xs"
                      >
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Size</label>
                <Select
                  value={size}
                  onValueChange={(value: ImageSize) => setSize(value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSizes.map((sizeOption) => (
                      <SelectItem
                        key={sizeOption}
                        value={sizeOption}
                        className="text-xs"
                      >
                        {sizeOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Advanced settings */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-xs h-7"
                >
                  <span>Advanced Settings</span>
                  {showAdvanced ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Quality</label>
                    <Select
                      value={quality}
                      onValueChange={(value: ImageQuality) => setQuality(value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard" className="text-xs">
                          Standard
                        </SelectItem>
                        <SelectItem value="hd" className="text-xs">
                          HD (+cost)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium">Style</label>
                    <Select
                      value={style}
                      onValueChange={(value: ImageStyle) => setStyle(value)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="natural" className="text-xs">
                          Natural
                        </SelectItem>
                        <SelectItem value="vivid" className="text-xs">
                          Vivid
                        </SelectItem>
                        <SelectItem value="artistic" className="text-xs">
                          Artistic
                        </SelectItem>
                        <SelectItem value="photographic" className="text-xs">
                          Photographic
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Provider-specific settings */}
                {providerCapabilities[selectedProvider]?.features
                  .negativePrompt && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium">
                      Negative Prompt (Optional)
                    </label>
                    <Input
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="What you don't want in the image..."
                      className="text-xs h-8"
                    />
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Generation controls */}
            <div className="space-y-3">
              <Button
                onClick={handleGenerate}
                disabled={!cleanPrompt.trim() || isGenerating}
                className="w-full h-9"
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

              {isGenerating && (
                <div className="space-y-2">
                  <Progress value={progress} className="w-full h-1" />
                  <div className="text-center text-xs text-muted-foreground">
                    {progress < 30 && "Initializing generation..."}
                    {progress >= 30 && progress < 70 && "Creating image..."}
                    {progress >= 70 && "Finalizing..."}
                  </div>
                </div>
              )}

              {generationError && (
                <Alert variant="destructive" className="text-xs">
                  <AlertDescription>{generationError}</AlertDescription>
                </Alert>
              )}
            </div>

            {/* Generated image preview */}
            {generatedImage && (
              <div className="space-y-2">
                <div className="text-xs font-medium">Generated Image</div>
                <div className="relative group">
                  <img
                    src={generatedImage.url}
                    alt={generatedImage.prompt}
                    className="w-full rounded-lg border"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <Badge variant="secondary" className="text-xs">
                      Added to conversation
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
