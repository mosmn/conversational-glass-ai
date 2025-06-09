import { useMemo, useCallback } from "react";
import {
  validateFiles,
  validateSingleFile,
  checkModelChangeCompatibility,
  categorizeFile,
  getFileFormat,
  getRecommendedModelsForFiles,
} from "@/lib/ai/file-capabilities";
import { FileAttachment, AIModel, FileValidationResult } from "@/lib/ai/types";

export interface ModelAwareValidationResult {
  validation: FileValidationResult;
  recommendations: {
    shouldSwitchModel: boolean;
    suggestedModels: AIModel[];
    currentModelRank: number;
  };
  processingInfo: {
    [fileId: string]: {
      method:
        | "vision"
        | "textExtraction"
        | "nativeProcessing"
        | "transcription"
        | "frameExtraction";
      description: string;
      limitations?: string[];
    };
  };
}

export interface ModelCompatibilityCheck {
  compatible: boolean;
  lostCapabilities: string[];
  gainedCapabilities: string[];
  warnings: string[];
  impact: "none" | "minor" | "major" | "severe";
}

export function useModelAwareFileValidation(
  currentModel: AIModel | null,
  availableModels: AIModel[]
) {
  // Validate files against current model
  const validateFilesForModel = useCallback(
    (files: FileAttachment[]): ModelAwareValidationResult => {
      if (!currentModel) {
        return {
          validation: {
            valid: false,
            errors: ["No model selected"],
            warnings: [],
            supportedFiles: [],
            unsupportedFiles: files,
            processingMethod: {},
          },
          recommendations: {
            shouldSwitchModel: false,
            suggestedModels: [],
            currentModelRank: -1,
          },
          processingInfo: {},
        };
      }

      const validation = validateFiles(files, currentModel);
      const recommendedModels = getRecommendedModelsForFiles(
        files,
        availableModels
      );
      const currentModelRank = recommendedModels.findIndex(
        (m) => m.id === currentModel.id
      );

      const processingInfo: { [fileId: string]: any } = {};
      files.forEach((file) => {
        const method = validation.processingMethod[file.id];
        if (method) {
          processingInfo[file.id] = getProcessingInfo(
            file,
            method,
            currentModel
          );
        }
      });

      return {
        validation,
        recommendations: {
          shouldSwitchModel:
            currentModelRank > 2 && recommendedModels.length > 0,
          suggestedModels: recommendedModels.slice(0, 3),
          currentModelRank,
        },
        processingInfo,
      };
    },
    [currentModel, availableModels]
  );

  // Validate a single file
  const validateSingleFileForModel = useCallback(
    (
      file: FileAttachment
    ): {
      valid: boolean;
      errors: string[];
      warnings: string[];
      processingInfo?: any;
    } => {
      if (!currentModel) {
        return {
          valid: false,
          errors: ["No model selected"],
          warnings: [],
        };
      }

      const result = validateSingleFile(file, currentModel);
      let processingInfo;

      if (result.valid) {
        const category = file.category;
        const capabilities =
          currentModel.capabilities.fileSupport[
            category as keyof typeof currentModel.capabilities.fileSupport
          ];
        if (capabilities && "processingMethod" in capabilities) {
          processingInfo = getProcessingInfo(
            file,
            capabilities.processingMethod as any,
            currentModel
          );
        }
      }

      return {
        ...result,
        processingInfo,
      };
    },
    [currentModel]
  );

  // Check model compatibility with existing files
  const checkModelCompatibility = useCallback(
    (files: FileAttachment[], newModel: AIModel): ModelCompatibilityCheck => {
      if (!currentModel) {
        return {
          compatible: true,
          lostCapabilities: [],
          gainedCapabilities: [],
          warnings: [],
          impact: "none",
        };
      }

      const compatibility = checkModelChangeCompatibility(
        files,
        currentModel,
        newModel
      );

      // Determine impact level
      let impact: ModelCompatibilityCheck["impact"] = "none";
      if (compatibility.lostCapabilities.length > 0) {
        impact = compatibility.lostCapabilities.length > 2 ? "severe" : "major";
      } else if (compatibility.warnings.length > 0) {
        impact = "minor";
      }

      return {
        ...compatibility,
        impact,
      };
    },
    [currentModel]
  );

  // Get dynamic file type restrictions based on model
  const getAllowedFileTypes = useCallback((): string[] => {
    if (!currentModel) {
      return []; // No files allowed without model
    }

    const allowedTypes: string[] = [];
    const fileSupport = currentModel.capabilities.fileSupport;

    // Images
    if (fileSupport.images.supported) {
      fileSupport.images.supportedFormats.forEach((format) => {
        allowedTypes.push(`image/${format === "jpg" ? "jpeg" : format}`);
      });
    }

    // Documents
    if (fileSupport.documents.supported) {
      fileSupport.documents.supportedFormats.forEach((format) => {
        if (format === "pdf") allowedTypes.push("application/pdf");
        if (format === "docx")
          allowedTypes.push(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          );
        if (format === "txt") allowedTypes.push("text/plain");
        if (format === "md") allowedTypes.push("text/markdown");
      });
    }

    // Text files
    if (fileSupport.textFiles.supported) {
      fileSupport.textFiles.supportedFormats.forEach((format) => {
        if (format === "txt") allowedTypes.push("text/plain");
        if (format === "md") allowedTypes.push("text/markdown");
        if (format === "csv") allowedTypes.push("text/csv");
        if (format === "json") allowedTypes.push("application/json");
        if (format === "yaml") allowedTypes.push("text/yaml");
        if (format === "xml") allowedTypes.push("application/xml");
      });
    }

    // Audio
    if (fileSupport.audio.supported) {
      fileSupport.audio.supportedFormats.forEach((format) => {
        allowedTypes.push(`audio/${format}`);
      });
    }

    // Video
    if (fileSupport.video.supported) {
      fileSupport.video.supportedFormats.forEach((format) => {
        allowedTypes.push(`video/${format}`);
      });
    }

    return [...new Set(allowedTypes)]; // Remove duplicates
  }, [currentModel]);

  // Get file constraints for current model
  const getFileConstraints = useMemo(() => {
    if (!currentModel) {
      return {
        maxFileSize: 0,
        maxTotalSize: 0,
        maxFiles: 0,
        maxFilesPerType: {},
      };
    }

    const fileSupport = currentModel.capabilities.fileSupport;
    return {
      maxFileSize: Math.max(
        fileSupport.images.maxFileSize,
        fileSupport.documents.maxFileSize,
        fileSupport.textFiles.maxFileSize,
        fileSupport.audio.maxFileSize,
        fileSupport.video.maxFileSize
      ),
      maxTotalSize: fileSupport.overall.maxTotalFileSize,
      maxFiles: fileSupport.overall.maxFilesPerMessage,
      maxFilesPerType: {
        image: fileSupport.images.maxImagesPerMessage,
        document: fileSupport.documents.maxDocumentsPerMessage,
        text: fileSupport.textFiles.maxFilesPerMessage,
        audio: fileSupport.audio.maxFilesPerMessage,
        video: fileSupport.video.maxFilesPerMessage,
      },
    };
  }, [currentModel]);

  return {
    validateFilesForModel,
    validateSingleFileForModel,
    checkModelCompatibility,
    getAllowedFileTypes,
    getFileConstraints,
    isModelSelected: !!currentModel,
  };
}

// Helper function to get processing information
function getProcessingInfo(
  file: FileAttachment,
  method:
    | "vision"
    | "textExtraction"
    | "nativeProcessing"
    | "transcription"
    | "frameExtraction",
  model: AIModel
) {
  const methodDescriptions = {
    vision: {
      description: "AI will analyze the visual content directly",
      icon: "👁️",
    },
    textExtraction: {
      description: "Text will be extracted and processed",
      icon: "📝",
    },
    nativeProcessing: {
      description: "Document will be processed in its native format",
      icon: "📄",
    },
    transcription: {
      description: "Audio will be transcribed to text",
      icon: "🎵",
    },
    frameExtraction: {
      description: "Key frames will be extracted for analysis",
      icon: "🎬",
    },
  };

  const info = methodDescriptions[method];
  const limitations: string[] = [];

  // Add model-specific limitations
  const fileSupport = model.capabilities.fileSupport;
  const category = file.category;

  if (category === "image" && fileSupport.images.maxDimensions) {
    const { width, height } = fileSupport.images.maxDimensions;
    if (file.metadata?.width && file.metadata?.height) {
      if (file.metadata.width > width || file.metadata.height > height) {
        limitations.push(`Image may be resized to ${width}×${height}`);
      }
    }
  }

  if (category === "document" && fileSupport.documents.maxPages) {
    if (
      file.metadata?.pages &&
      file.metadata.pages > fileSupport.documents.maxPages
    ) {
      limitations.push(
        `Only first ${fileSupport.documents.maxPages} pages will be processed`
      );
    }
  }

  return {
    method,
    description: info.description,
    icon: info.icon,
    limitations: limitations.length > 0 ? limitations : undefined,
  };
}
