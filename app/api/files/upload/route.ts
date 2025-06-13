import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, files } from "@/lib/db/schema";
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
  conversationId: z
    .string()
    .refine(
      (val) =>
        val === "" ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          val
        ),
      "Invalid conversation ID - must be a valid UUID or empty string for new conversations"
    ),
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

    console.log("📁 File upload request received:", {
      conversationId: conversationId || "(empty)",
      fileCount: Array.from(formData.entries()).filter(([key]) =>
        key.startsWith("file-")
      ).length,
      userId: user.id,
    });

    // Validate parameters
    const params = uploadParamsSchema.parse({
      conversationId,
      maxFiles,
      maxSizePerFile,
    });

    // Get uploaded files
    const uploadedFiles: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file-") && value instanceof File) {
        uploadedFiles.push(value);
      }
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (uploadedFiles.length > params.maxFiles) {
      return NextResponse.json(
        { error: `Maximum ${params.maxFiles} files allowed` },
        { status: 400 }
      );
    }

    const uploadResults: UploadedFileResponse[] = [];
    const errors: string[] = [];

    // Process each file
    for (const file of uploadedFiles) {
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
        // Use "temp" folder for files uploaded before conversation is created
        const storageConversationId = params.conversationId || "temp";

        const uploadedFile = await uploadFile(
          buffer,
          file.name,
          mimeType,
          user.id,
          storageConversationId
        );

        if (!uploadedFile || !uploadedFile.id) {
          console.error("❌ Upload failed - uploadedFile:", uploadedFile);
          throw new Error("Upload failed - no file ID returned");
        }

        // Process file content
        const processedData = await processFile(buffer, file.name, mimeType);

        // Upload thumbnail if generated
        let thumbnailUrl: string | undefined;
        if (processedData.thumbnail) {
          try {
            const thumbnailFilename = `thumb_${uploadedFile.filename}`;
            const thumbnailFile = await uploadFile(
              processedData.thumbnail,
              thumbnailFilename,
              "image/jpeg",
              user.id,
              storageConversationId
            );
            thumbnailUrl = thumbnailFile.url;
          } catch (thumbnailError) {
            console.warn("Thumbnail upload failed:", thumbnailError);
            // Continue without thumbnail
          }
        }

        // Save file record to database
        const fileCategory = getFileCategory(uploadedFile.mimeType);
        const [savedFile] = await db
          .insert(files)
          .values({
            id: uploadedFile.id,
            userId: user.id,
            conversationId: params.conversationId || null,
            messageId: null, // Will be updated when message is sent
            filename: uploadedFile.filename,
            originalFilename: uploadedFile.originalFilename,
            mimeType: uploadedFile.mimeType,
            size: uploadedFile.size,
            category: fileCategory,
            url: uploadedFile.url,
            thumbnailUrl,
            extractedText: processedData.extractedText,
            tags: [],
            metadata: processedData.metadata,
            isOrphaned: !params.conversationId, // Mark as orphaned if no conversation
            createdAt: new Date(),
            updatedAt: new Date(),
            accessedAt: new Date(),
          })
          .returning();

        console.log("✅ File saved to database:", {
          id: savedFile.id,
          filename: savedFile.originalFilename,
          userId: user.id,
          conversationId: params.conversationId || "none",
        });

        // Prepare response
        const fileResponse: UploadedFileResponse = {
          id: uploadedFile.id,
          filename: uploadedFile.filename,
          originalFilename: uploadedFile.originalFilename,
          mimeType: uploadedFile.mimeType,
          size: uploadedFile.size,
          url: uploadedFile.url,
          category: fileCategory,
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
        total: uploadedFiles.length,
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
