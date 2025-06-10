import {
  AIModel,
  FileAttachment,
  FileValidationResult,
  FileCapabilityError,
  FileCapabilities,
} from "./types";

/**
 * Default file capabilities for models that don't support any files
 */
export const NO_FILE_SUPPORT: FileCapabilities = {
  images: {
    supported: false,
    maxFileSize: 0,
    supportedFormats: [],
    processingMethod: "textExtraction",
    requiresUrl: false,
    maxImagesPerMessage: 0,
  },
  documents: {
    supported: false,
    maxFileSize: 0,
    supportedFormats: [],
    processingMethod: "textExtraction",
    maxDocumentsPerMessage: 0,
    preserveFormatting: false,
  },
  textFiles: {
    supported: false,
    maxFileSize: 0,
    supportedFormats: [],
    encodingSupport: ["utf-8"],
    maxFilesPerMessage: 0,
  },
  audio: {
    supported: false,
    maxFileSize: 0,
    supportedFormats: [],
    processingMethod: "transcription",
    maxFilesPerMessage: 0,
  },
  video: {
    supported: false,
    maxFileSize: 0,
    supportedFormats: [],
    processingMethod: "frameExtraction",
    maxFilesPerMessage: 0,
  },
  overall: {
    maxTotalFileSize: 0,
    maxFilesPerMessage: 0,
    requiresPreprocessing: false,
  },
};

/**
 * Basic text-only file support for models that can process extracted text
 */
export const TEXT_ONLY_FILE_SUPPORT: FileCapabilities = {
  images: {
    supported: true,
    maxFileSize: 10,
    supportedFormats: ["jpeg", "jpg", "png", "gif", "webp"],
    processingMethod: "textExtraction",
    requiresUrl: false,
    maxImagesPerMessage: 5,
  },
  documents: {
    supported: true,
    maxFileSize: 10,
    supportedFormats: ["pdf", "txt", "md"],
    processingMethod: "textExtraction",
    maxDocumentsPerMessage: 5,
    preserveFormatting: false,
  },
  textFiles: {
    supported: true,
    maxFileSize: 10,
    supportedFormats: ["txt", "md", "csv", "json", "yaml", "xml"],
    encodingSupport: ["utf-8", "ascii"],
    maxFilesPerMessage: 5,
  },
  audio: {
    supported: false,
    maxFileSize: 0,
    supportedFormats: [],
    processingMethod: "transcription",
    maxFilesPerMessage: 0,
  },
  video: {
    supported: false,
    maxFileSize: 0,
    supportedFormats: [],
    processingMethod: "frameExtraction",
    maxFilesPerMessage: 0,
  },
  overall: {
    maxTotalFileSize: 25,
    maxFilesPerMessage: 10,
    requiresPreprocessing: true,
  },
};

/**
 * Vision-capable file support for models with native image processing
 */
export const VISION_FILE_SUPPORT: FileCapabilities = {
  images: {
    supported: true,
    maxFileSize: 20,
    maxDimensions: {
      width: 2048,
      height: 2048,
    },
    supportedFormats: ["jpeg", "jpg", "png", "gif", "webp"],
    processingMethod: "vision",
    requiresUrl: true,
    maxImagesPerMessage: 10,
  },
  documents: {
    supported: true,
    maxFileSize: 10,
    supportedFormats: ["pdf", "txt", "md"],
    processingMethod: "textExtraction",
    maxDocumentsPerMessage: 5,
    preserveFormatting: false,
  },
  textFiles: {
    supported: true,
    maxFileSize: 10,
    supportedFormats: ["txt", "md", "csv", "json", "yaml", "xml"],
    encodingSupport: ["utf-8", "ascii"],
    maxFilesPerMessage: 5,
  },
  audio: {
    supported: false,
    maxFileSize: 0,
    supportedFormats: [],
    processingMethod: "transcription",
    maxFilesPerMessage: 0,
  },
  video: {
    supported: false,
    maxFileSize: 0,
    supportedFormats: [],
    processingMethod: "frameExtraction",
    maxFilesPerMessage: 0,
  },
  overall: {
    maxTotalFileSize: 50,
    maxFilesPerMessage: 15,
    requiresPreprocessing: false,
  },
};

/**
 * Advanced multimodal support for cutting-edge models
 */
export const ADVANCED_MULTIMODAL_SUPPORT: FileCapabilities = {
  images: {
    supported: true,
    maxFileSize: 50,
    maxDimensions: {
      width: 4096,
      height: 4096,
    },
    supportedFormats: ["jpeg", "jpg", "png", "gif", "webp", "svg"],
    processingMethod: "both",
    requiresUrl: false,
    maxImagesPerMessage: 20,
  },
  documents: {
    supported: true,
    maxFileSize: 50,
    maxPages: 100,
    supportedFormats: ["pdf", "docx", "txt", "md", "html"],
    processingMethod: "nativeProcessing",
    maxDocumentsPerMessage: 10,
    preserveFormatting: true,
  },
  textFiles: {
    supported: true,
    maxFileSize: 20,
    supportedFormats: ["txt", "md", "csv", "json", "yaml", "xml", "log"],
    encodingSupport: ["utf-8", "ascii", "utf-16"],
    maxFilesPerMessage: 10,
  },
  audio: {
    supported: true,
    maxFileSize: 100,
    maxDuration: 3600, // 1 hour
    supportedFormats: ["mp3", "wav", "m4a", "flac"],
    processingMethod: "transcription",
    maxFilesPerMessage: 5,
  },
  video: {
    supported: true,
    maxFileSize: 500,
    maxDuration: 1800, // 30 minutes
    supportedFormats: ["mp4", "mov", "avi", "webm"],
    processingMethod: "frameExtraction",
    maxFilesPerMessage: 3,
  },
  overall: {
    maxTotalFileSize: 200,
    maxFilesPerMessage: 25,
    requiresPreprocessing: false,
  },
};

/**
 * Categorize a file based on its MIME type
 */
export function categorizeFile(mimeType: string): FileAttachment["category"] {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("document") ||
    mimeType.includes("word") ||
    mimeType.includes("presentation") ||
    mimeType.includes("spreadsheet")
  ) {
    return "document";
  }
  if (mimeType.startsWith("text/")) return "text";

  // Default categorization based on file extension patterns
  return "document";
}

/**
 * Get file format from MIME type
 */
export function getFileFormat(mimeType: string): string {
  const formatMap: Record<string, string> = {
    "image/jpeg": "jpeg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "text/plain": "txt",
    "text/markdown": "md",
    "text/csv": "csv",
    "application/json": "json",
    "text/yaml": "yaml",
    "application/xml": "xml",
    "text/xml": "xml",
    "text/html": "html",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/mp4": "m4a",
    "audio/flac": "flac",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/webm": "webm",
  };

  return formatMap[mimeType] || mimeType.split("/")[1] || "unknown";
}

/**
 * Validate a single file against model capabilities
 */
export function validateSingleFile(
  file: FileAttachment,
  model: AIModel
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const capabilities = model.capabilities.fileSupport;
  const category = file.category;
  const format = getFileFormat(file.type);
  const fileSizeMB = file.size / (1024 * 1024);

  // Map category to the correct FileCapabilities property name
  const categoryKeyMap: Record<string, keyof FileCapabilities> = {
    image: "images",
    document: "documents",
    text: "textFiles",
    audio: "audio",
    video: "video",
  };

  const capabilityKey = categoryKeyMap[category];
  const categoryCapabilities = capabilityKey
    ? capabilities[capabilityKey]
    : undefined;

  if (
    !categoryCapabilities ||
    !("supported" in categoryCapabilities) ||
    !categoryCapabilities.supported
  ) {
    errors.push(
      `${category} files are not supported by ${model.name}. Only text extraction may be available.`
    );
    return { valid: false, errors, warnings };
  }

  // Check format support
  if (
    "supportedFormats" in categoryCapabilities &&
    !categoryCapabilities.supportedFormats.includes(format)
  ) {
    errors.push(
      `${format.toUpperCase()} format is not supported by ${
        model.name
      }. Supported formats: ${categoryCapabilities.supportedFormats.join(", ")}`
    );
  }

  // Check file size
  if (
    "maxFileSize" in categoryCapabilities &&
    fileSizeMB > categoryCapabilities.maxFileSize
  ) {
    errors.push(
      `File size (${fileSizeMB.toFixed(1)}MB) exceeds maximum allowed (${
        categoryCapabilities.maxFileSize
      }MB) for ${model.name}`
    );
  }

  // Category-specific validations
  if (category === "image" && "maxDimensions" in categoryCapabilities) {
    const imageCapabilities =
      categoryCapabilities as FileCapabilities["images"];
    if (
      imageCapabilities.maxDimensions &&
      file.metadata?.width &&
      file.metadata?.height
    ) {
      if (
        file.metadata.width > imageCapabilities.maxDimensions.width ||
        file.metadata.height > imageCapabilities.maxDimensions.height
      ) {
        warnings.push(
          `Image dimensions (${file.metadata.width}x${file.metadata.height}) exceed recommended maximum (${imageCapabilities.maxDimensions.width}x${imageCapabilities.maxDimensions.height}). Image may be resized.`
        );
      }
    }
  }

  if (category === "document" && "maxPages" in categoryCapabilities) {
    const docCapabilities =
      categoryCapabilities as FileCapabilities["documents"];
    if (docCapabilities.maxPages && file.metadata?.pages) {
      if (file.metadata.pages > docCapabilities.maxPages) {
        errors.push(
          `Document has ${file.metadata.pages} pages, but ${model.name} supports maximum ${docCapabilities.maxPages} pages`
        );
      }
    }
  }

  if (
    (category === "audio" || category === "video") &&
    "maxDuration" in categoryCapabilities
  ) {
    const mediaCapabilities = categoryCapabilities as
      | FileCapabilities["audio"]
      | FileCapabilities["video"];
    if (mediaCapabilities.maxDuration && file.metadata?.duration) {
      if (file.metadata.duration > mediaCapabilities.maxDuration) {
        errors.push(
          `${category} duration (${Math.round(
            file.metadata.duration
          )}s) exceeds maximum allowed (${
            mediaCapabilities.maxDuration
          }s) for ${model.name}`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate multiple files against model capabilities
 */
export function validateFiles(
  files: FileAttachment[],
  model: AIModel
): FileValidationResult {
  const result: FileValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    supportedFiles: [],
    unsupportedFiles: [],
    processingMethod: {},
  };

  const capabilities = model.capabilities.fileSupport;

  // Check overall file count
  if (files.length > capabilities.overall.maxFilesPerMessage) {
    result.errors.push(
      `Too many files (${files.length}). ${model.name} supports maximum ${capabilities.overall.maxFilesPerMessage} files per message.`
    );
    result.valid = false;
  }

  // Check total file size
  const totalSizeMB = files.reduce(
    (sum, file) => sum + file.size / (1024 * 1024),
    0
  );
  if (totalSizeMB > capabilities.overall.maxTotalFileSize) {
    result.errors.push(
      `Total file size (${totalSizeMB.toFixed(1)}MB) exceeds maximum allowed (${
        capabilities.overall.maxTotalFileSize
      }MB) for ${model.name}`
    );
    result.valid = false;
  }

  // Count files by category
  const fileCounts = {
    image: 0,
    document: 0,
    text: 0,
    audio: 0,
    video: 0,
  };

  // Map category to the correct FileCapabilities property name
  const categoryKeyMap: Record<string, keyof FileCapabilities> = {
    image: "images",
    document: "documents",
    text: "textFiles",
    audio: "audio",
    video: "video",
  };

  // Validate each file
  files.forEach((file) => {
    const validation = validateSingleFile(file, model);

    if (validation.valid) {
      result.supportedFiles.push(file);

      // Determine processing method
      const category = file.category;
      const capabilityKey = categoryKeyMap[category];
      const categoryCapabilities = capabilityKey
        ? capabilities[capabilityKey]
        : undefined;
      if (categoryCapabilities && "processingMethod" in categoryCapabilities) {
        result.processingMethod[file.id] =
          categoryCapabilities.processingMethod as any;
      }
    } else {
      result.unsupportedFiles.push(file);
      result.valid = false;
    }

    result.errors.push(...validation.errors);
    result.warnings.push(...validation.warnings);

    // Count files by category
    fileCounts[file.category]++;
  });

  // Check category-specific file count limits
  Object.entries(fileCounts).forEach(([category, count]) => {
    if (count > 0) {
      const capabilityKey = categoryKeyMap[category];
      const categoryCapabilities = capabilityKey
        ? capabilities[capabilityKey]
        : undefined;
      if (
        categoryCapabilities &&
        "maxFilesPerMessage" in categoryCapabilities
      ) {
        const maxFiles = (categoryCapabilities as any).maxFilesPerMessage;
        if (count > maxFiles) {
          result.errors.push(
            `Too many ${category} files (${count}). ${model.name} supports maximum ${maxFiles} ${category} files per message.`
          );
          result.valid = false;
        }
      }
    }
  });

  return result;
}

/**
 * Get recommended models for a set of files
 */
export function getRecommendedModelsForFiles(
  files: FileAttachment[],
  availableModels: AIModel[]
): AIModel[] {
  const hasImages = files.some((f) => f.category === "image");
  const hasDocuments = files.some((f) => f.category === "document");
  const hasAudio = files.some((f) => f.category === "audio");
  const hasVideo = files.some((f) => f.category === "video");

  return availableModels
    .filter((model) => {
      const validation = validateFiles(files, model);
      return validation.valid || validation.supportedFiles.length > 0;
    })
    .sort((a, b) => {
      // Prioritize models with better file support
      let scoreA = 0;
      let scoreB = 0;

      if (hasImages) {
        if (a.capabilities.fileSupport.images.processingMethod === "vision")
          scoreA += 3;
        else if (a.capabilities.fileSupport.images.processingMethod === "both")
          scoreA += 4;
        else if (a.capabilities.fileSupport.images.supported) scoreA += 1;

        if (b.capabilities.fileSupport.images.processingMethod === "vision")
          scoreB += 3;
        else if (b.capabilities.fileSupport.images.processingMethod === "both")
          scoreB += 4;
        else if (b.capabilities.fileSupport.images.supported) scoreB += 1;
      }

      if (hasDocuments) {
        if (
          a.capabilities.fileSupport.documents.processingMethod ===
          "nativeProcessing"
        )
          scoreA += 2;
        else if (a.capabilities.fileSupport.documents.supported) scoreA += 1;

        if (
          b.capabilities.fileSupport.documents.processingMethod ===
          "nativeProcessing"
        )
          scoreB += 2;
        else if (b.capabilities.fileSupport.documents.supported) scoreB += 1;
      }

      if (hasAudio && a.capabilities.fileSupport.audio.supported) scoreA += 2;
      if (hasAudio && b.capabilities.fileSupport.audio.supported) scoreB += 2;

      if (hasVideo && a.capabilities.fileSupport.video.supported) scoreA += 2;
      if (hasVideo && b.capabilities.fileSupport.video.supported) scoreB += 2;

      return scoreB - scoreA;
    });
}

/**
 * Check if a model change would affect existing attachments
 */
export function checkModelChangeCompatibility(
  files: FileAttachment[],
  currentModel: AIModel,
  newModel: AIModel
): {
  compatible: boolean;
  lostCapabilities: string[];
  gainedCapabilities: string[];
  warnings: string[];
} {
  const currentValidation = validateFiles(files, currentModel);
  const newValidation = validateFiles(files, newModel);

  const lostCapabilities: string[] = [];
  const gainedCapabilities: string[] = [];
  const warnings: string[] = [];

  // Check what capabilities we lose/gain
  if (
    currentValidation.supportedFiles.length >
    newValidation.supportedFiles.length
  ) {
    const lostFiles = currentValidation.supportedFiles.filter(
      (f) => !newValidation.supportedFiles.some((nf) => nf.id === f.id)
    );
    lostFiles.forEach((file) => {
      lostCapabilities.push(`${file.name} (${file.category})`);
    });
  }

  if (
    newValidation.supportedFiles.length >
    currentValidation.supportedFiles.length
  ) {
    const gainedFiles = newValidation.supportedFiles.filter(
      (f) => !currentValidation.supportedFiles.some((cf) => cf.id === f.id)
    );
    gainedFiles.forEach((file) => {
      gainedCapabilities.push(`${file.name} (${file.category})`);
    });
  }

  // Check for processing method changes
  files.forEach((file) => {
    const currentMethod = currentValidation.processingMethod[file.id];
    const newMethod = newValidation.processingMethod[file.id];

    if (currentMethod && newMethod && currentMethod !== newMethod) {
      if (currentMethod === "vision" && newMethod === "textExtraction") {
        warnings.push(
          `${file.name} will switch from visual analysis to text extraction`
        );
      } else if (currentMethod === "textExtraction" && newMethod === "vision") {
        warnings.push(
          `${file.name} will switch from text extraction to visual analysis`
        );
      }
    }
  });

  return {
    compatible:
      newValidation.supportedFiles.length >=
      currentValidation.supportedFiles.length,
    lostCapabilities,
    gainedCapabilities,
    warnings,
  };
}
