import { S3 } from "ibm-cos-sdk";
import { writeFile, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { z } from "zod";

// Environment validation for IBM COS
const ibmCosEnvSchema = z.object({
  IBM_COS_ENDPOINT: z.string().optional(),
  IBM_COS_API_KEY_ID: z.string().optional(),
  IBM_COS_INSTANCE_CRN: z.string().optional(),
  IBM_COS_BUCKET_NAME: z.string().optional(),
});

type IBMCosEnv = z.infer<typeof ibmCosEnvSchema>;

// Validate IBM COS environment
let ibmCosEnv: IBMCosEnv | null = null;
let isIBMCosConfigured = false;

try {
  ibmCosEnv = ibmCosEnvSchema.parse({
    IBM_COS_ENDPOINT: process.env.IBM_COS_ENDPOINT,
    IBM_COS_API_KEY_ID: process.env.IBM_COS_API_KEY_ID,
    IBM_COS_INSTANCE_CRN: process.env.IBM_COS_INSTANCE_CRN,
    IBM_COS_BUCKET_NAME: process.env.IBM_COS_BUCKET_NAME,
  });

  isIBMCosConfigured = !!(
    ibmCosEnv.IBM_COS_ENDPOINT &&
    ibmCosEnv.IBM_COS_API_KEY_ID &&
    ibmCosEnv.IBM_COS_INSTANCE_CRN &&
    ibmCosEnv.IBM_COS_BUCKET_NAME
  );
} catch (error) {
  console.warn("IBM COS not configured, using local storage fallback");
}

// Initialize IBM COS client
let cosClient: S3 | null = null;
if (isIBMCosConfigured && ibmCosEnv) {
  cosClient = new S3({
    endpoint: ibmCosEnv.IBM_COS_ENDPOINT,
    apiKeyId: ibmCosEnv.IBM_COS_API_KEY_ID,
    ibmAuthEndpoint: "https://iam.cloud.ibm.com/identity/token",
    serviceInstanceId: ibmCosEnv.IBM_COS_INSTANCE_CRN,
  });
}

export interface UploadedFile {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  url: string;
  path: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Generate unique file ID
function generateFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Generate file path for organization
function generateFilePath(
  userId: string,
  conversationId: string,
  filename: string
): string {
  return `uploads/${userId}/${conversationId}/${filename}`;
}

// Upload file to IBM COS
async function uploadToIBMCos(
  buffer: Buffer,
  filePath: string,
  mimeType: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  if (!cosClient || !ibmCosEnv?.IBM_COS_BUCKET_NAME) {
    throw new Error("IBM COS not configured");
  }

  const uploadParams = {
    Bucket: ibmCosEnv.IBM_COS_BUCKET_NAME,
    Key: filePath,
    Body: buffer,
    ContentType: mimeType,
    ACL: "private", // Files are private by default
  };

  try {
    const upload = cosClient.upload(uploadParams);

    // Track upload progress
    if (onProgress) {
      upload.on("httpUploadProgress", (progress) => {
        onProgress({
          loaded: progress.loaded || 0,
          total: progress.total || buffer.length,
          percentage: progress.total
            ? Math.round((progress.loaded / progress.total) * 100)
            : 0,
        });
      });
    }

    const result = await upload.promise();
    return (
      result.Location ||
      `${ibmCosEnv.IBM_COS_ENDPOINT}/${ibmCosEnv.IBM_COS_BUCKET_NAME}/${filePath}`
    );
  } catch (error) {
    console.error("IBM COS upload error:", error);
    throw new Error("Failed to upload file to IBM Cloud Object Storage");
  }
}

// Upload file to local storage (fallback)
async function uploadToLocal(
  buffer: Buffer,
  filePath: string,
  mimeType: string
): Promise<string> {
  const localPath = path.join(process.cwd(), "public", filePath);
  const directory = path.dirname(localPath);

  // Ensure directory exists
  if (!existsSync(directory)) {
    await mkdir(directory, { recursive: true });
  }

  await writeFile(localPath, buffer);
  return `/${filePath}`; // Return public URL path
}

// Main upload function
export async function uploadFile(
  file: File | Buffer,
  originalFilename: string,
  mimeType: string,
  userId: string,
  conversationId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadedFile> {
  const fileId = generateFileId();
  const fileExtension = path.extname(originalFilename);
  const filename = `${fileId}${fileExtension}`;
  const filePath = generateFilePath(userId, conversationId, filename);

  let buffer: Buffer;
  let size: number;

  if (file instanceof Buffer) {
    buffer = file;
    size = buffer.length;
  } else {
    // file is File type
    buffer = Buffer.from(await (file as File).arrayBuffer());
    size = (file as File).size;
  }

  let url: string;

  try {
    if (isIBMCosConfigured) {
      url = await uploadToIBMCos(buffer, filePath, mimeType, onProgress);
    } else {
      url = await uploadToLocal(buffer, filePath, mimeType);
    }

    return {
      id: fileId,
      filename,
      originalFilename,
      mimeType,
      size,
      url,
      path: filePath,
    };
  } catch (error) {
    console.error("File upload error:", error);
    throw new Error("Failed to upload file");
  }
}

// Delete file from IBM COS
async function deleteFromIBMCos(filePath: string): Promise<void> {
  if (!cosClient || !ibmCosEnv?.IBM_COS_BUCKET_NAME) {
    throw new Error("IBM COS not configured");
  }

  try {
    await cosClient
      .deleteObject({
        Bucket: ibmCosEnv.IBM_COS_BUCKET_NAME,
        Key: filePath,
      })
      .promise();
  } catch (error) {
    console.error("IBM COS delete error:", error);
    throw new Error("Failed to delete file from IBM Cloud Object Storage");
  }
}

// Delete file from local storage
async function deleteFromLocal(filePath: string): Promise<void> {
  const localPath = path.join(process.cwd(), "public", filePath);

  try {
    if (existsSync(localPath)) {
      await unlink(localPath);
    }
  } catch (error) {
    console.error("Local delete error:", error);
    throw new Error("Failed to delete local file");
  }
}

// Main delete function
export async function deleteFile(filePath: string): Promise<void> {
  try {
    if (isIBMCosConfigured) {
      await deleteFromIBMCos(filePath);
    } else {
      await deleteFromLocal(filePath);
    }
  } catch (error) {
    console.error("File deletion error:", error);
    throw new Error("Failed to delete file");
  }
}

// Generate signed URL for private file access (IBM COS only)
export async function getSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  if (!isIBMCosConfigured || !cosClient || !ibmCosEnv?.IBM_COS_BUCKET_NAME) {
    // For local storage, return the public path
    return `/${filePath}`;
  }

  try {
    const url = await cosClient.getSignedUrlPromise("getObject", {
      Bucket: ibmCosEnv.IBM_COS_BUCKET_NAME,
      Key: filePath,
      Expires: expiresIn,
    });
    return url;
  } catch (error) {
    console.error("Signed URL generation error:", error);
    throw new Error("Failed to generate signed URL");
  }
}

// Check if storage is configured
export function isStorageConfigured(): boolean {
  return isIBMCosConfigured;
}

// Get storage type
export function getStorageType(): "ibm-cos" | "local" {
  return isIBMCosConfigured ? "ibm-cos" : "local";
}
