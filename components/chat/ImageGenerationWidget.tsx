"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  ImageIcon,
  Download,
  Share2,
  Eye,
  AlertCircle,
} from "lucide-react";
import {
  useImageGeneration,
  type ImageGenerationRequest,
} from "@/hooks/useImageGeneration";
import { cn } from "@/lib/utils";

interface ImageGenerationWidgetProps {
  conversationId?: string;
  messageId?: string;
  className?: string;
  onImageGenerated?: (image: any) => void;
}

export function ImageGenerationWidget({
  conversationId,
  messageId,
  className,
  onImageGenerated,
}: ImageGenerationWidgetProps) {
  const {
    isGenerating,
    images,
    error,
    progress,
    generateImage,
    clearError,
    clearImages,
  } = useImageGeneration();

  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<"dall-e-3" | "dall-e-2">("dall-e-3");
  const [size, setSize] = useState<
    "1024x1024" | "1792x1024" | "1024x1792" | "256x256" | "512x512"
  >("1024x1024");
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [style, setStyle] = useState<"vivid" | "natural">("vivid");
  const [addToConversation, setAddToConversation] = useState(
    Boolean(conversationId)
  );

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    clearError();

    const request: ImageGenerationRequest = {
      prompt: prompt.trim(),
      model,
      size,
      quality,
      style,
      conversationId,
      messageId,
      addToConversation,
    };

    const generatedImage = await generateImage(request);
    if (generatedImage && onImageGenerated) {
      onImageGenerated(generatedImage);
    }
  };

  const getSizeOptions = () => {
    if (model === "dall-e-2") {
      return [
        { value: "256x256", label: "256×256 (Square, Small)" },
        { value: "512x512", label: "512×512 (Square, Medium)" },
        { value: "1024x1024", label: "1024×1024 (Square, Large)" },
      ];
    }
    return [
      { value: "1024x1024", label: "1024×1024 (Square)" },
      { value: "1792x1024", label: "1792×1024 (Landscape)" },
      { value: "1024x1792", label: "1024×1792 (Portrait)" },
    ];
  };

  const getEstimatedCost = () => {
    if (model === "dall-e-3") {
      if (quality === "hd") {
        if (size === "1024x1024") return 0.08;
        if (size === "1792x1024" || size === "1024x1792") return 0.12;
      } else {
        if (size === "1024x1024") return 0.04;
        if (size === "1792x1024" || size === "1024x1792") return 0.08;
      }
    } else if (model === "dall-e-2") {
      if (size === "1024x1024") return 0.02;
      if (size === "512x512") return 0.018;
      if (size === "256x256") return 0.016;
    }
    return 0.04;
  };

  return (
    <Card
      className={cn(
        "w-full max-w-2xl mx-auto",
        "bg-white/10 dark:bg-black/20 backdrop-blur-xl",
        "border border-white/20 dark:border-white/10",
        "shadow-xl",
        className
      )}
    >
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <ImageIcon className="h-5 w-5 text-blue-400" />
          AI Image Generation
          <Badge variant="secondary" className="ml-auto text-xs">
            DALL-E
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <Alert
            variant="destructive"
            className="bg-red-500/10 border-red-500/20"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>
                {error.type === "content_policy"
                  ? "Content Policy Violation"
                  : "Generation Error"}
                :
              </strong>
              <br />
              {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Prompt Input */}
        <div className="space-y-2">
          <Label htmlFor="prompt" className="text-sm font-medium">
            Image Prompt
          </Label>
          <Textarea
            id="prompt"
            placeholder="Describe the image you want to generate... (e.g., 'A serene mountain landscape at sunset with purple clouds')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[80px] resize-none bg-white/5 border-white/20 focus:border-blue-400/50"
            maxLength={model === "dall-e-3" ? 4000 : 1000}
            disabled={isGenerating}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {prompt.length}/{model === "dall-e-3" ? 4000 : 1000} characters
            </span>
            <span>Estimated cost: ${getEstimatedCost().toFixed(3)}</span>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model" className="text-sm font-medium">
              Model
            </Label>
            <Select
              value={model}
              onValueChange={(value: "dall-e-3" | "dall-e-2") => {
                setModel(value);
                // Reset incompatible settings
                if (value === "dall-e-2") {
                  setSize("1024x1024");
                  setQuality("standard");
                }
              }}
              disabled={isGenerating}
            >
              <SelectTrigger className="bg-white/5 border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dall-e-3">
                  DALL-E 3 (Better Quality)
                </SelectItem>
                <SelectItem value="dall-e-2">
                  DALL-E 2 (Faster, Cheaper)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Size Selection */}
          <div className="space-y-2">
            <Label htmlFor="size" className="text-sm font-medium">
              Size
            </Label>
            <Select
              value={size}
              onValueChange={(value: any) => setSize(value)}
              disabled={isGenerating}
            >
              <SelectTrigger className="bg-white/5 border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getSizeOptions().map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quality (DALL-E 3 only) */}
          {model === "dall-e-3" && (
            <div className="space-y-2">
              <Label htmlFor="quality" className="text-sm font-medium">
                Quality
              </Label>
              <Select
                value={quality}
                onValueChange={(value: "standard" | "hd") => setQuality(value)}
                disabled={isGenerating}
              >
                <SelectTrigger className="bg-white/5 border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="hd">HD (+$0.04)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Style (DALL-E 3 only) */}
          {model === "dall-e-3" && (
            <div className="space-y-2">
              <Label htmlFor="style" className="text-sm font-medium">
                Style
              </Label>
              <Select
                value={style}
                onValueChange={(value: "vivid" | "natural") => setStyle(value)}
                disabled={isGenerating}
              >
                <SelectTrigger className="bg-white/5 border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vivid">Vivid (More creative)</SelectItem>
                  <SelectItem value="natural">
                    Natural (More realistic)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Add to Conversation Toggle */}
        {conversationId && (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="addToConversation"
              checked={addToConversation}
              onChange={(e) => setAddToConversation(e.target.checked)}
              disabled={isGenerating}
              className="rounded border-white/20 bg-white/5"
            />
            <Label htmlFor="addToConversation" className="text-sm">
              Add generated image to conversation
            </Label>
          </div>
        )}

        {/* Progress Bar */}
        {isGenerating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Generating image...</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <ImageIcon className="mr-2 h-4 w-4" />
              Generate Image
            </>
          )}
        </Button>

        {/* Generated Images */}
        {images.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Generated Images</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearImages}
                className="h-7 text-xs"
              >
                Clear All
              </Button>
            </div>

            <div className="grid gap-3">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative group rounded-lg overflow-hidden bg-white/5 border border-white/10"
                >
                  <img
                    src={image.url}
                    alt={image.prompt}
                    className="w-full h-48 object-cover"
                    loading="lazy"
                  />

                  {/* Image Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-xs line-clamp-2 mb-2">
                        {image.revisedPrompt || image.prompt}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-white/70">
                          <span>{image.model}</span>
                          <span>•</span>
                          <span>{image.generationSettings.size}</span>
                          <span>•</span>
                          <span>${image.estimatedCost.toFixed(3)}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-white hover:bg-white/20"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-white hover:bg-white/20"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-white hover:bg-white/20"
                          >
                            <Share2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
