import { AIModel, ProcessedFile } from "./types";
import { categorizeFile } from "./file-capabilities";

export interface FileAnalysis {
  fileCount: number;
  categories: {
    images: number;
    documents: number;
    textFiles: number;
    audio: number;
    video: number;
  };
  totalSize: number;
  maxFileSize: number;
  requiresVision: boolean;
  requiresMultimodal: boolean;
  complexityScore: number; // 0-100, higher = more complex files
  textContent: boolean;
}

export interface ModelRecommendation {
  model: AIModel;
  score: number; // 0-100, higher = better match
  reasons: string[];
  limitations?: string[];
  processingMethods: {
    images?: "vision" | "textExtraction";
    documents?: "native" | "textExtraction";
    textFiles?: "native" | "processing";
  };
}

export interface RecommendationResult {
  primaryRecommendation: ModelRecommendation | null;
  alternatives: ModelRecommendation[];
  warnings: string[];
  fallbackSuggestion?: {
    message: string;
    action: "textOnly" | "removeFiles" | "selectBetterModel";
  };
}

/**
 * File Recommendation Engine
 * Analyzes files and recommends optimal AI models
 */
export class FileRecommendationEngine {
  /**
   * Analyze uploaded files and their characteristics
   */
  static analyzeFiles(
    files: Array<{
      id: string;
      name: string;
      size: number;
      type: string;
      category?: string;
      extractedText?: string;
    }>
  ): FileAnalysis {
    const analysis: FileAnalysis = {
      fileCount: files.length,
      categories: {
        images: 0,
        documents: 0,
        textFiles: 0,
        audio: 0,
        video: 0,
      },
      totalSize: 0,
      maxFileSize: 0,
      requiresVision: false,
      requiresMultimodal: false,
      complexityScore: 0,
      textContent: false,
    };

    for (const file of files) {
      const category = file.category || categorizeFile(file.type);

      // Count by category
      if (category === "image") {
        analysis.categories.images++;
        analysis.requiresVision = true;
        analysis.requiresMultimodal = true;
      } else if (category === "document") {
        analysis.categories.documents++;
      } else if (category === "text") {
        analysis.categories.textFiles++;
      } else if (category === "audio") {
        analysis.categories.audio++;
        analysis.requiresMultimodal = true;
      } else if (category === "video") {
        analysis.categories.video++;
        analysis.requiresMultimodal = true;
      }

      // Size analysis
      analysis.totalSize += file.size;
      analysis.maxFileSize = Math.max(analysis.maxFileSize, file.size);

      // Text content detection
      if (file.extractedText && file.extractedText.trim().length > 0) {
        analysis.textContent = true;
      }
    }

    // Calculate complexity score
    analysis.complexityScore = this.calculateComplexityScore(analysis);

    return analysis;
  }

  /**
   * Calculate complexity score based on file characteristics
   */
  private static calculateComplexityScore(analysis: FileAnalysis): number {
    let score = 0;

    // Base score from file count
    score += Math.min(analysis.fileCount * 10, 30);

    // Multimodal content adds complexity
    if (analysis.requiresVision) score += 20;
    if (analysis.categories.audio > 0) score += 25;
    if (analysis.categories.video > 0) score += 30;

    // Large files add complexity
    if (analysis.maxFileSize > 5 * 1024 * 1024) score += 15; // >5MB
    if (analysis.maxFileSize > 20 * 1024 * 1024) score += 25; // >20MB

    // Multiple file types add complexity
    const categoryCount = Object.values(analysis.categories).filter(
      (c) => c > 0
    ).length;
    score += categoryCount * 5;

    // Document processing complexity
    if (analysis.categories.documents > 2) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Recommend models based on file analysis
   */
  static recommendModels(
    files: Array<{
      id: string;
      name: string;
      size: number;
      type: string;
      category?: string;
      extractedText?: string;
    }>,
    availableModels: AIModel[]
  ): RecommendationResult {
    const analysis = this.analyzeFiles(files);
    const recommendations: ModelRecommendation[] = [];
    const warnings: string[] = [];

    // Score each available model
    for (const model of availableModels) {
      const recommendation = this.scoreModel(model, analysis);
      // Include all recommendations, even with score 0, so we can show why they don't work
      recommendations.push(recommendation);
    }

    // Sort by score (highest first)
    recommendations.sort((a, b) => b.score - a.score);

    // Generate warnings
    if (analysis.fileCount > 5) {
      warnings.push("Large number of files may slow down processing");
    }

    if (analysis.maxFileSize > 20 * 1024 * 1024) {
      warnings.push("Large files detected - some models may have size limits");
    }

    if (
      analysis.requiresVision &&
      !recommendations.some((r) => r.model.capabilities.multiModal)
    ) {
      warnings.push("Images detected but no vision-capable models available");
    }

    // Filter valid recommendations (score > 0) for alternatives
    const validRecommendations = recommendations.filter((r) => r.score > 0);

    // Prepare result
    const result: RecommendationResult = {
      primaryRecommendation: validRecommendations[0] || null, // Use null if no valid recommendations
      alternatives: validRecommendations.slice(1, 4), // Top 3 alternatives from valid ones
      warnings,
    };

    // Add fallback suggestion if primary recommendation score is low
    if (
      !result.primaryRecommendation ||
      result.primaryRecommendation.score < 50
    ) {
      result.fallbackSuggestion = this.generateFallbackSuggestion(
        analysis,
        recommendations
      );
    }

    return result;
  }

  /**
   * Score a model based on file analysis
   */
  private static scoreModel(
    model: AIModel,
    analysis: FileAnalysis
  ): ModelRecommendation {
    let score = 0;
    const reasons: string[] = [];
    const limitations: string[] = [];
    const processingMethods: ModelRecommendation["processingMethods"] = {};

    const fileSupport = model.capabilities.fileSupport;

    if (!fileSupport) {
      return {
        model,
        score: 0,
        reasons: ["No file support"],
        limitations: ["Cannot process any files"],
        processingMethods: {},
      };
    }

    // Base compatibility score
    score += 20;
    reasons.push("Supports file attachments");

    // Image processing evaluation
    if (analysis.categories.images > 0) {
      if (fileSupport.images?.supported) {
        if (model.capabilities.multiModal) {
          score += 30;
          reasons.push("Native vision capabilities");
          processingMethods.images = "vision";
        } else {
          score += 10;
          reasons.push("Text extraction from images");
          processingMethods.images = "textExtraction";
          limitations.push("No visual analysis - text extraction only");
        }

        // Check size limits
        const maxImageSize = fileSupport.images.maxFileSize || 0;
        if (analysis.maxFileSize > maxImageSize * 1024 * 1024) {
          score -= 15;
          limitations.push(`Image size limit: ${maxImageSize}MB`);
        }

        // Check image count limits
        const maxImages = fileSupport.images.maxImagesPerMessage || 0;
        if (analysis.categories.images > maxImages) {
          score -= 10;
          limitations.push(`Max ${maxImages} images per message`);
        }
      } else {
        score -= 20;
        limitations.push("Cannot process images");
      }
    }

    // Document processing evaluation
    if (analysis.categories.documents > 0) {
      if (fileSupport.documents?.supported) {
        score += 20;
        reasons.push("PDF document support");
        processingMethods.documents =
          fileSupport.documents.processingMethod === "nativeProcessing"
            ? "native"
            : "textExtraction";

        // Check document size limits
        const maxDocSize = fileSupport.documents.maxFileSize || 0;
        if (analysis.maxFileSize > maxDocSize * 1024 * 1024) {
          score -= 10;
          limitations.push(`Document size limit: ${maxDocSize}MB`);
        }
      } else {
        score -= 15;
        limitations.push("Limited document processing");
      }
    }

    // Text file evaluation
    if (analysis.categories.textFiles > 0) {
      if (fileSupport.textFiles?.supported) {
        score += 15;
        reasons.push("Text file support");
        processingMethods.textFiles = "native";
      } else {
        score -= 5;
        limitations.push("Limited text file support");
      }
    }

    // Audio/Video evaluation
    if (analysis.categories.audio > 0) {
      if (fileSupport.audio?.supported) {
        score += 25;
        reasons.push("Audio processing capabilities");
      } else {
        score -= 25;
        limitations.push("Cannot process audio files");
      }
    }

    if (analysis.categories.video > 0) {
      if (fileSupport.video?.supported) {
        score += 30;
        reasons.push("Video processing capabilities");
      } else {
        score -= 30;
        limitations.push("Cannot process video files");
      }
    }

    // Overall file limits
    const maxFiles = fileSupport.overall?.maxFilesPerMessage || 0;
    if (analysis.fileCount > maxFiles) {
      score -= 15;
      limitations.push(`Max ${maxFiles} files per message`);
    }

    // Total size limits
    const maxTotalSize = fileSupport.overall?.maxTotalFileSize || 0;
    if (analysis.totalSize > maxTotalSize * 1024 * 1024) {
      score -= 10;
      limitations.push(`Total size limit: ${maxTotalSize}MB`);
    }

    // Bonus for advanced models with high complexity
    if (analysis.complexityScore > 60) {
      if (model.maxTokens >= 100000) {
        score += 10;
        reasons.push("Large context window for complex files");
      }
      if (model.capabilities.multiModal) {
        score += 5;
        reasons.push("Advanced multimodal capabilities");
      }
    }

    // Provider-specific bonuses
    if (model.provider === "openai" && analysis.requiresVision) {
      score += 5;
      reasons.push("Excellent vision capabilities");
    }

    if (model.provider === "claude" && analysis.categories.documents > 0) {
      score += 5;
      reasons.push("Strong document analysis");
    }

    if (model.provider === "gemini" && analysis.requiresMultimodal) {
      score += 5;
      reasons.push("Native multimodal support");
    }

    return {
      model,
      score: Math.max(0, Math.min(100, score)),
      reasons,
      limitations: limitations.length > 0 ? limitations : undefined,
      processingMethods,
    };
  }

  /**
   * Generate fallback suggestion when no good model is available
   */
  private static generateFallbackSuggestion(
    analysis: FileAnalysis,
    recommendations: ModelRecommendation[]
  ): RecommendationResult["fallbackSuggestion"] {
    if (
      analysis.requiresVision &&
      !recommendations.some((r) => r.model.capabilities.multiModal)
    ) {
      return {
        message:
          "Consider using a vision-capable model for better image processing",
        action: "selectBetterModel",
      };
    }

    if (analysis.fileCount > 10) {
      return {
        message:
          "Too many files for optimal processing. Consider reducing the number of attachments",
        action: "removeFiles",
      };
    }

    if (analysis.totalSize > 100 * 1024 * 1024) {
      return {
        message:
          "Files too large for most models. Consider text-only mode or smaller files",
        action: "textOnly",
      };
    }

    if (recommendations.length === 0) {
      return {
        message:
          "No compatible models found. Files will be processed as text only",
        action: "textOnly",
      };
    }

    return undefined;
  }

  /**
   * Get model recommendations for specific file types
   */
  static getRecommendationsForFileType(
    fileType: string,
    availableModels: AIModel[]
  ): ModelRecommendation[] {
    const category = categorizeFile(fileType);
    const mockFile = {
      id: "temp",
      name: `example.${fileType.split("/")[1] || "txt"}`,
      size: 1024 * 1024, // 1MB
      type: fileType,
      category,
    };

    const result = this.recommendModels([mockFile], availableModels);
    return [
      ...(result.primaryRecommendation ? [result.primaryRecommendation] : []),
      ...result.alternatives,
    ];
  }

  /**
   * Check if a model is suitable for given files
   */
  static isModelSuitableForFiles(
    model: AIModel,
    files: Array<{ type: string; size: number; category?: string }>
  ): {
    suitable: boolean;
    score: number;
    issues: string[];
  } {
    const analysis = this.analyzeFiles(
      files.map((f, i) => ({
        id: i.toString(),
        name: `file${i}`,
        ...f,
      }))
    );

    const recommendation = this.scoreModel(model, analysis);

    return {
      suitable: recommendation.score >= 60,
      score: recommendation.score,
      issues: recommendation.limitations || [],
    };
  }
}

/**
 * Utility functions for file recommendations
 */
export const FileRecommendationUtils = {
  /**
   * Get best model for images
   */
  getBestVisionModel: (models: AIModel[]): AIModel | null => {
    return (
      models
        .filter(
          (m) =>
            m.capabilities.multiModal &&
            m.capabilities.fileSupport?.images?.supported
        )
        .sort((a, b) => {
          // Prefer higher image limits and better processing
          const aScore =
            (a.capabilities.fileSupport?.images?.maxImagesPerMessage || 0) *
            (a.capabilities.fileSupport?.images?.maxFileSize || 0);
          const bScore =
            (b.capabilities.fileSupport?.images?.maxImagesPerMessage || 0) *
            (b.capabilities.fileSupport?.images?.maxFileSize || 0);
          return bScore - aScore;
        })[0] || null
    );
  },

  /**
   * Get best model for documents
   */
  getBestDocumentModel: (models: AIModel[]): AIModel | null => {
    return (
      models
        .filter((m) => m.capabilities.fileSupport?.documents?.supported)
        .sort((a, b) => {
          const aScore =
            (a.capabilities.fileSupport?.documents?.maxFileSize || 0) *
            (a.contextWindow || 0);
          const bScore =
            (b.capabilities.fileSupport?.documents?.maxFileSize || 0) *
            (b.contextWindow || 0);
          return bScore - aScore;
        })[0] || null
    );
  },

  /**
   * Check if files need model upgrade
   */
  needsModelUpgrade: (currentModel: AIModel, files: any[]): boolean => {
    const analysis = FileRecommendationEngine.analyzeFiles(files);

    // Check if current model can handle the files
    if (analysis.requiresVision && !currentModel.capabilities.multiModal) {
      return true;
    }

    if (!currentModel.capabilities.fileSupport) {
      return true;
    }

    // Check specific capabilities
    const fileSupport = currentModel.capabilities.fileSupport;

    if (analysis.categories.images > 0 && !fileSupport.images?.supported) {
      return true;
    }

    if (
      analysis.categories.documents > 0 &&
      !fileSupport.documents?.supported
    ) {
      return true;
    }

    return false;
  },

  /**
   * Format recommendation for UI display
   */
  formatRecommendation: (recommendation: ModelRecommendation): string => {
    const reasons = recommendation.reasons.slice(0, 2).join(", ");
    const score = Math.round(recommendation.score);
    return `${recommendation.model.name} (${score}% match) - ${reasons}`;
  },
};
