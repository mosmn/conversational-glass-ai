import pdf from "pdf-parse";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";

export interface ProcessedFileData {
  extractedText?: string;
  thumbnail?: Buffer;
  metadata: {
    width?: number;
    height?: number;
    pages?: number;
    wordCount?: number;
    hasImages?: boolean;
  };
}

// Extract text from PDF buffer
export async function extractPdfText(buffer: Buffer): Promise<{
  text: string;
  pages: number;
  metadata: any;
}> {
  try {
    const data = await pdf(buffer);
    return {
      text: data.text,
      pages: data.numpages,
      metadata: data.metadata,
    };
  } catch (error) {
    console.error("PDF text extraction error:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

// Generate thumbnail for image
export async function generateImageThumbnail(
  buffer: Buffer,
  maxWidth: number = 300,
  maxHeight: number = 300
): Promise<{
  thumbnail: Buffer;
  originalWidth: number;
  originalHeight: number;
}> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    const thumbnail = await image
      .resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    return {
      thumbnail,
      originalWidth: metadata.width || 0,
      originalHeight: metadata.height || 0,
    };
  } catch (error) {
    console.error("Image thumbnail generation error:", error);
    throw new Error("Failed to generate image thumbnail");
  }
}

// Detect MIME type from buffer
export async function detectMimeType(
  buffer: Buffer,
  filename: string
): Promise<{
  mimeType: string;
  extension: string;
}> {
  try {
    const detectedType = await fileTypeFromBuffer(buffer);

    if (detectedType) {
      return {
        mimeType: detectedType.mime,
        extension: detectedType.ext,
      };
    }

    // Fallback to filename extension
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const mimeTypeMap: Record<string, string> = {
      txt: "text/plain",
      md: "text/markdown",
      json: "application/json",
      csv: "text/csv",
      xml: "application/xml",
    };

    return {
      mimeType: mimeTypeMap[ext] || "application/octet-stream",
      extension: ext,
    };
  } catch (error) {
    console.error("MIME type detection error:", error);
    return {
      mimeType: "application/octet-stream",
      extension: filename.split(".").pop()?.toLowerCase() || "",
    };
  }
}

// Process file based on type
export async function processFile(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ProcessedFileData> {
  const result: ProcessedFileData = {
    metadata: {},
  };

  try {
    if (mimeType === "application/pdf") {
      // Process PDF
      const pdfData = await extractPdfText(buffer);
      result.extractedText = pdfData.text;
      result.metadata.pages = pdfData.pages;
      result.metadata.wordCount = pdfData.text.split(/\s+/).length;

      // Check if PDF contains images (basic heuristic)
      result.metadata.hasImages =
        pdfData.text.includes("[image]") || pdfData.text.includes("[figure]");
    } else if (mimeType.startsWith("image/")) {
      // Process Image
      const imageData = await generateImageThumbnail(buffer);
      result.thumbnail = imageData.thumbnail;
      result.metadata.width = imageData.originalWidth;
      result.metadata.height = imageData.originalHeight;
    } else if (mimeType.startsWith("text/")) {
      // Process Text file
      result.extractedText = buffer.toString("utf-8");
      result.metadata.wordCount = result.extractedText.split(/\s+/).length;
    }
  } catch (error) {
    console.error(`File processing error for ${filename}:`, error);
    // Don't throw, just return partial results
  }

  return result;
}

// Validate file for security and compatibility
export function validateFile(
  buffer: Buffer,
  filename: string,
  maxSizeBytes: number = 10 * 1024 * 1024
): {
  isValid: boolean;
  error?: string;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check file size
  if (buffer.length > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size (${Math.round(
        buffer.length / 1024 / 1024
      )}MB) exceeds maximum allowed size (${Math.round(
        maxSizeBytes / 1024 / 1024
      )}MB)`,
      warnings,
    };
  }

  // Check filename for security issues
  const dangerousPatterns = [
    /\.\./, // Directory traversal
    /[<>:"|?*]/, // Invalid filename characters
    /\.(exe|bat|cmd|scr|pif|com|dll)$/i, // Executable files
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(filename)) {
      return {
        isValid: false,
        error: "Filename contains invalid or potentially dangerous characters",
        warnings,
      };
    }
  }

  // Check for very large files that might cause processing issues
  if (buffer.length > 5 * 1024 * 1024) {
    warnings.push("Large file detected - processing may take longer");
  }

  // Check for empty files
  if (buffer.length === 0) {
    return {
      isValid: false,
      error: "File is empty",
      warnings,
    };
  }

  return {
    isValid: true,
    warnings,
  };
}

// Get file type category for UI grouping
export function getFileCategory(
  mimeType: string
): "image" | "document" | "text" | "other" {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (
    mimeType === "application/pdf" ||
    mimeType.includes("document") ||
    mimeType.includes("word") ||
    mimeType.includes("presentation") ||
    mimeType.includes("spreadsheet")
  ) {
    return "document";
  }

  if (mimeType.startsWith("text/")) {
    return "text";
  }

  return "other";
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Extract preview text from content
export function extractPreviewText(
  text: string,
  maxLength: number = 200
): string {
  const cleanText = text.replace(/\s+/g, " ").trim();

  if (cleanText.length <= maxLength) {
    return cleanText;
  }

  return cleanText.substring(0, maxLength).replace(/\s+\S*$/, "") + "...";
}
