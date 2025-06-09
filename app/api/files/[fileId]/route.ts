import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSignedUrl } from "@/lib/storage";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

interface RouteParams {
  fileId: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { fileId } = await params;

    // Get file path from query parameters
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        { error: "File path required" },
        { status: 400 }
      );
    }

    // Verify user has access to this file (basic check via path structure)
    // File paths should be in format: uploads/{userId}/{conversationId}/{filename}
    const pathParts = filePath.split("/");
    if (pathParts.length < 4 || pathParts[0] !== "uploads") {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // For IBM COS, return signed URL
    if (process.env.IBM_COS_ENDPOINT) {
      try {
        const signedUrl = await getSignedUrl(filePath, 3600); // 1 hour expiry
        return NextResponse.json({ url: signedUrl });
      } catch (error) {
        console.error("Signed URL generation error:", error);
        return NextResponse.json(
          { error: "Failed to generate file access URL" },
          { status: 500 }
        );
      }
    }

    // For local storage, serve file directly
    const localPath = path.join(process.cwd(), "public", filePath);

    if (!existsSync(localPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    try {
      const fileBuffer = await readFile(localPath);

      // Determine content type based on file extension
      const ext = path.extname(localPath).toLowerCase();
      const contentTypeMap: Record<string, string> = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".pdf": "application/pdf",
        ".txt": "text/plain",
        ".md": "text/markdown",
        ".json": "application/json",
        ".csv": "text/csv",
      };

      const contentType = contentTypeMap[ext] || "application/octet-stream";

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "private, max-age=3600",
          "Content-Disposition": `inline; filename="${path.basename(
            localPath
          )}"`,
        },
      });
    } catch (error) {
      console.error("File read error:", error);
      return NextResponse.json(
        { error: "Failed to read file" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("File serving error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete file
export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { fileId } = params;

    // Get file path from request body
    const body = await request.json();
    const { filePath } = body;

    if (!filePath) {
      return NextResponse.json(
        { error: "File path required" },
        { status: 400 }
      );
    }

    // Verify user has access to this file
    const pathParts = filePath.split("/");
    if (pathParts.length < 4 || pathParts[0] !== "uploads") {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    // TODO: Add more robust access control by checking database records

    try {
      // Use the deleteFile function from storage utilities
      const { deleteFile } = await import("@/lib/storage");
      await deleteFile(filePath);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("File deletion error:", error);
      return NextResponse.json(
        { error: "Failed to delete file" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("File deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
