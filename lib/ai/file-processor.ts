import {
  ProcessedFile,
  FileProcessingOptions,
  FileProcessingResult,
  ChatMessage,
  MessageContent,
  TextContent,
  ImageContent,
  FileContent,
  AIModel,
} from "./types";
import { categorizeFile } from "./file-capabilities";

/**
 * File processor for converting attachments into provider-specific formats
 */
export class FileProcessor {
  /**
   * Process files for a specific provider and model
   */
  static async processFilesForProvider(
    files: Array<{
      id: string;
      name: string;
      size: number;
      type: string;
      url: string;
      extractedText?: string;
      metadata?: {
        width?: number;
        height?: number;
        pages?: number;
        wordCount?: number;
        duration?: number;
        hasImages?: boolean;
        author?: string;
        language?: string;
        category?: string;
        readingTime?: number;
      };
      category?: string;
    }>,
    model: AIModel,
    options: FileProcessingOptions = {}
  ): Promise<FileProcessingResult> {
    const result: FileProcessingResult = {
      success: true,
      processedFiles: [],
      errors: [],
      warnings: [],
      textFallback: "",
    };

    const textParts: string[] = [];

    for (const file of files) {
      try {
        const processedFile = await this.processFile(file, model, options);
        result.processedFiles.push(processedFile);

        // Build text fallback
        if (file.extractedText) {
          textParts.push(
            `📎 ${file.name}:\n${file.extractedText.substring(0, 2000)}${
              file.extractedText.length > 2000 ? "..." : ""
            }`
          );
        } else {
          textParts.push(
            `📎 ${file.name} (${file.type}, ${this.formatFileSize(file.size)})`
          );
        }
      } catch (error) {
        result.errors.push(
          `Failed to process ${file.name}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        result.success = false;
      }
    }

    result.textFallback = textParts.join("\n\n");
    return result;
  }

  /**
   * Process a single file for all providers
   */
  private static async processFile(
    file: {
      id: string;
      name: string;
      size: number;
      type: string;
      url: string;
      extractedText?: string;
      metadata?: {
        width?: number;
        height?: number;
        pages?: number;
        wordCount?: number;
        duration?: number;
        hasImages?: boolean;
        author?: string;
        language?: string;
        category?: string;
        readingTime?: number;
      };
      category?: string;
    },
    model: AIModel,
    options: FileProcessingOptions
  ): Promise<ProcessedFile> {
    const processedFile: ProcessedFile = {
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      category:
        (file.category as "image" | "document" | "text" | "audio" | "video") ||
        categorizeFile(file.type),
      url: file.url,
      extractedText: file.extractedText,
      metadata: file.metadata,
    };

    // Only process images for vision models
    if (processedFile.category === "image" && model.capabilities.multiModal) {
      // OpenAI format (image_url)
      processedFile.openaiFormat = {
        type: "image_url",
        image_url: {
          url: file.url,
          detail: options.optimizeImages ? "low" : "high",
        },
      };

      // For Gemini and Claude, we need base64 data
      if (options.convertToBase64 !== false) {
        try {
          const base64Data = await this.convertImageToBase64(file.url);
          const mimeType = file.type || "image/jpeg";

          // Gemini format
          processedFile.geminiFormat = {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          };

          // Claude format
          processedFile.claudeFormat = {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: base64Data,
            },
          };
        } catch (error) {
          console.warn(`Failed to convert ${file.name} to base64:`, error);
        }
      }
    }

    return processedFile;
  }

  /**
   * Format messages with files for specific providers
   */
  static formatMessageWithFiles(
    content: string,
    processedFiles: ProcessedFile[],
    provider: string,
    model: AIModel
  ): ChatMessage["content"] {
    // Always start with text content
    const messageContent: MessageContent[] = [];

    // Build comprehensive text content including file information
    let fullTextContent = content;
    const textOnlyFiles: ProcessedFile[] = [];
    const multimodalFiles: ProcessedFile[] = [];

    // Separate files by capability
    for (const file of processedFiles) {
      if (file.category === "image" && model.capabilities.multiModal) {
        multimodalFiles.push(file);
      } else {
        textOnlyFiles.push(file);
      }
    }

    // Add text content from documents and non-image files
    if (textOnlyFiles.length > 0) {
      fullTextContent += "\n\nAttached files:";

      for (const file of textOnlyFiles) {
        fullTextContent += `\n\n📎 **${file.name}** (${file.type})`;

        if (file.extractedText) {
          // Include the full extracted text for better context
          const maxTextLength = 4000; // Reasonable limit to avoid token overflow
          const truncatedText =
            file.extractedText.length > maxTextLength
              ? file.extractedText.substring(0, maxTextLength) +
                "\n\n[Content truncated - file contains more text]"
              : file.extractedText;

          fullTextContent += `\nContent:\n${truncatedText}`;
        }

        // Add metadata information
        if (file.metadata?.pages) {
          fullTextContent += `\nPages: ${file.metadata.pages}`;
        }
        if (file.metadata?.wordCount) {
          fullTextContent += `\nWord count: ${file.metadata.wordCount}`;
        }
        if (file.metadata?.width && file.metadata?.height) {
          fullTextContent += `\nDimensions: ${file.metadata.width}x${file.metadata.height}`;
        }
      }
    }

    // For multimodal models with images, also include image descriptions
    if (multimodalFiles.length > 0 && model.capabilities.multiModal) {
      fullTextContent += "\n\nImages attached:";
      for (const file of multimodalFiles) {
        fullTextContent += `\n📷 ${file.name}`;
        if (file.metadata?.width && file.metadata?.height) {
          fullTextContent += ` (${file.metadata.width}x${file.metadata.height})`;
        }
      }
    }

    // Add the comprehensive text content
    if (fullTextContent.trim()) {
      messageContent.push({
        type: "text",
        text: fullTextContent,
      });
    }

    // If no multimodal support or no multimodal files, return text-only
    if (!model.capabilities.multiModal || multimodalFiles.length === 0) {
      return messageContent.length === 1 && messageContent[0].type === "text"
        ? messageContent[0].text
        : messageContent;
    }

    // Add multimodal content based on provider
    switch (provider) {
      case "openai":
        return this.formatForOpenAI(messageContent, multimodalFiles, model);
      case "groq":
        return this.formatForGroq(messageContent, multimodalFiles, model);
      case "gemini":
        return this.formatForGemini(messageContent, multimodalFiles, model);
      case "claude":
        return this.formatForClaude(messageContent, multimodalFiles, model);
      default:
        // Fallback to text-only
        return messageContent.length === 1 && messageContent[0].type === "text"
          ? messageContent[0].text
          : messageContent;
    }
  }

  /**
   * Format for OpenAI (GPT-4 Vision)
   */
  private static formatForOpenAI(
    messageContent: MessageContent[],
    processedFiles: ProcessedFile[],
    model: AIModel
  ): MessageContent[] {
    for (const file of processedFiles) {
      if (file.category === "image" && file.openaiFormat) {
        messageContent.push({
          type: "image_url",
          image_url: file.openaiFormat.image_url,
        });
      }
    }
    return messageContent;
  }

  /**
   * Format for Groq (Llama 4 Scout/Maverick Vision)
   */
  private static formatForGroq(
    messageContent: MessageContent[],
    processedFiles: ProcessedFile[],
    model: AIModel
  ): MessageContent[] {
    // Groq vision models use the same format as OpenAI (image_url)
    for (const file of processedFiles) {
      if (file.category === "image" && file.openaiFormat) {
        messageContent.push({
          type: "image_url",
          image_url: file.openaiFormat.image_url,
        });
      }
    }
    return messageContent;
  }

  /**
   * Format for Gemini (native multimodal)
   */
  private static formatForGemini(
    messageContent: MessageContent[],
    processedFiles: ProcessedFile[],
    model: AIModel
  ): Array<{
    parts: Array<{
      text?: string;
      inline_data?: {
        mime_type: string;
        data: string;
      };
      file_data?: {
        mime_type: string;
        file_uri: string;
      };
    }>;
    role?: "user" | "model";
  }> {
    // Gemini uses a different format - we'll return the parts directly
    const parts: any[] = [];

    // Add text part
    const textContent = messageContent.find(
      (c) => c.type === "text"
    ) as TextContent;
    if (textContent) {
      parts.push({ text: textContent.text });
    }

    // Add image parts
    for (const file of processedFiles) {
      if (file.category === "image" && file.geminiFormat) {
        parts.push(file.geminiFormat);
      }
    }

    return parts;
  }

  /**
   * Format for Claude (vision support)
   */
  private static formatForClaude(
    messageContent: MessageContent[],
    processedFiles: ProcessedFile[],
    model: AIModel
  ): MessageContent[] {
    for (const file of processedFiles) {
      if (file.category === "image" && file.claudeFormat) {
        messageContent.push({
          type: "image",
          source: file.claudeFormat.source,
        } as ImageContent);
      }
    }
    return messageContent;
  }

  /**
   * Generate text-only fallback for non-multimodal models
   * This method is deprecated in favor of formatMessageWithFiles which provides better file handling
   */
  static generateTextFallback(
    content: string,
    files: Array<{
      name: string;
      type: string;
      size: number;
      extractedText?: string;
      metadata?: {
        width?: number;
        height?: number;
        pages?: number;
        wordCount?: number;
        duration?: number;
        hasImages?: boolean;
        author?: string;
        language?: string;
        category?: string;
        readingTime?: number;
      };
    }>
  ): string {
    if (files.length === 0) return content;

    const parts = [content];

    parts.push("\n\nAttached files:");

    for (const file of files) {
      parts.push(`\n\n📎 **${file.name}** (${file.type})`);

      if (file.extractedText) {
        const maxLength = 3000; // Increased for better context
        const truncatedText =
          file.extractedText.length > maxLength
            ? file.extractedText.substring(0, maxLength) +
              "\n\n[Content truncated - file contains more text]"
            : file.extractedText;
        parts.push(`Content:\n${truncatedText}`);
      }

      // Add metadata information
      const metadataInfo = [];
      if (file.metadata?.pages) {
        metadataInfo.push(`Pages: ${file.metadata.pages}`);
      }
      if (file.metadata?.wordCount) {
        metadataInfo.push(`Words: ${file.metadata.wordCount}`);
      }
      if (file.metadata?.width && file.metadata?.height) {
        metadataInfo.push(
          `Dimensions: ${file.metadata.width}x${file.metadata.height}`
        );
      }

      if (metadataInfo.length > 0) {
        parts.push(metadataInfo.join(", "));
      }
    }

    return parts.join("\n");
  }

  /**
   * Convert image URL to base64
   */
  private static async convertImageToBase64(imageUrl: string): Promise<string> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      return base64;
    } catch (error) {
      throw new Error(
        `Failed to convert image to base64: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Format file size
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Check if a model supports files
   */
  static modelSupportsFiles(model: AIModel): boolean {
    return !!(
      model.capabilities.fileSupport &&
      (model.capabilities.fileSupport.images?.supported ||
        model.capabilities.fileSupport.documents?.supported ||
        model.capabilities.fileSupport.textFiles?.supported ||
        model.capabilities.fileSupport.audio?.supported ||
        model.capabilities.fileSupport.video?.supported)
    );
  }

  /**
   * Check if a model supports multimodal content
   */
  static modelSupportsMultimodal(model: AIModel): boolean {
    return !!(
      model.capabilities.multiModal &&
      model.capabilities.fileSupport?.images?.supported
    );
  }

  /**
   * Get supported file types for a model
   */
  static getSupportedFileTypes(model: AIModel): string[] {
    const types: string[] = [];
    const fileSupport = model.capabilities.fileSupport;

    if (!fileSupport) return types;

    if (fileSupport.images?.supported) {
      types.push(...fileSupport.images.supportedFormats);
    }
    if (fileSupport.documents?.supported) {
      types.push(...fileSupport.documents.supportedFormats);
    }
    if (fileSupport.textFiles?.supported) {
      types.push(...fileSupport.textFiles.supportedFormats);
    }
    if (fileSupport.audio?.supported) {
      types.push(...fileSupport.audio.supportedFormats);
    }
    if (fileSupport.video?.supported) {
      types.push(...fileSupport.video.supportedFormats);
    }

    return types;
  }
}

/**
 * Utility functions for checking file processing capabilities
 */
export const FileProcessingUtils = {
  shouldProcessAsMultimodal: (model: AIModel, files: any[]): boolean => {
    if (!model.capabilities.multiModal) return false;
    return files.some(
      (file) =>
        file.category === "image" &&
        model.capabilities.fileSupport?.images?.supported
    );
  },

  shouldConvertToBase64: (provider: string): boolean => {
    return provider === "gemini" || provider === "claude";
  },

  getOptimalImageDetail: (fileSize: number): "low" | "high" | "auto" => {
    // Use low detail for large images to save tokens
    if (fileSize > 1024 * 1024 * 5) return "low"; // 5MB+
    return "high";
  },

  estimateTokenCost: (files: any[], model: AIModel): number => {
    // Rough estimation - images typically cost ~765 tokens in low detail, ~1275+ in high detail
    let totalTokens = 0;

    for (const file of files) {
      if (file.category === "image") {
        totalTokens += file.size > 1024 * 1024 * 5 ? 765 : 1275;
      } else if (file.extractedText) {
        // Estimate ~0.75 tokens per word for text
        const wordCount = file.extractedText.split(/\s+/).length;
        totalTokens += Math.ceil(wordCount * 0.75);
      }
    }

    return totalTokens;
  },
};
