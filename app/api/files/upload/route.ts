import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { uploadFile } from "@/lib/storage";
import {
  processFile,
  validateFile,
  detectMimeType,
  getFileCategory,
} from "@/lib/file-processing";

// Validation schemas
const uploadParamsSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  maxFiles: z.number().min(1).max(10).default(5),
  maxSizePerFile: z.number().min(1).max(50).default(10), // MB
});

interface UploadedFileResponse {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  url: string;
  category: string;
  extractedText?: string;
  thumbnailUrl?: string;
  metadata: {
    width?: number;
    height?: number;
    pages?: number;
    wordCount?: number;
    hasImages?: boolean;
  };
  processed: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Find user in database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();

    // Get upload parameters
    const conversationId = formData.get("conversationId") as string;
    const maxFiles = parseInt(formData.get("maxFiles") as string) || 5;
    const maxSizePerFile =
      parseInt(formData.get("maxSizePerFile") as string) || 10;

    // Validate parameters
    const params = uploadParamsSchema.parse({
      conversationId,
      maxFiles,
      maxSizePerFile,
    });

    // Get uploaded files
    const files: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file-") && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > params.maxFiles) {
      return NextResponse.json(
        { error: `Maximum ${params.maxFiles} files allowed` },
        { status: 400 }
      );
    }

    const uploadResults: UploadedFileResponse[] = [];
    const errors: string[] = [];

    // Process each file
    for (const file of files) {
      try {
        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Detect MIME type
        const { mimeType } = await detectMimeType(buffer, file.name);

        // Validate file
        const validation = validateFile(
          buffer,
          file.name,
          params.maxSizePerFile * 1024 * 1024
        );

        if (!validation.isValid) {
          errors.push(`${file.name}: ${validation.error}`);
          continue;
        }

        // Upload file to storage
        const uploadedFile = await uploadFile(
          buffer,
          file.name,
          mimeType,
          user.id,
          params.conversationId
        );

        // Process file content
        const processedData = await processFile(buffer, file.name, mimeType);

        // Upload thumbnail if generated
        let thumbnailUrl: string | undefined;
        if (processedData.thumbnail) {
          try {
            const thumbnailFile = await uploadFile(
              processedData.thumbnail,
              `thumb_${uploadedFile.filename}`,
              "image/jpeg",
              user.id,
              params.conversationId
            );
            thumbnailUrl = thumbnailFile.url;
          } catch (thumbnailError) {
            console.warn("Thumbnail upload failed:", thumbnailError);
            // Continue without thumbnail
          }
        }

        // Prepare response
        const fileResponse: UploadedFileResponse = {
          id: uploadedFile.id,
          filename: uploadedFile.filename,
          originalFilename: uploadedFile.originalFilename,
          mimeType: uploadedFile.mimeType,
          size: uploadedFile.size,
          url: uploadedFile.url,
          category: getFileCategory(uploadedFile.mimeType),
          extractedText: processedData.extractedText,
          thumbnailUrl,
          metadata: processedData.metadata,
          processed: true,
        };

        uploadResults.push(fileResponse);
      } catch (fileError) {
        console.error(`Error processing file ${file.name}:`, fileError);
        errors.push(`${file.name}: Processing failed`);
      }
    }

    // Return results
    const response = {
      files: uploadResults,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: files.length,
        successful: uploadResults.length,
        failed: errors.length,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("File upload error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// Get maximum allowed file size
export async function GET() {
  return NextResponse.json({
    maxFiles: 10,
    maxSizePerFile: 10, // MB
    allowedTypes: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/json",
    ],
    storageType: process.env.IBM_COS_ENDPOINT ? "ibm-cos" : "local",
  });
}
