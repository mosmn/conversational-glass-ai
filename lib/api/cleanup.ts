interface CleanupStats {
  orphanedFiles: {
    count: number;
    totalSize: number;
    potential_savings: number;
  };
  oldFiles: {
    older_than_30_days: { count: number; totalSize: number };
    older_than_90_days: { count: number; totalSize: number };
    older_than_180_days: { count: number; totalSize: number };
  };
  duplicates: {
    count: number;
    totalSize: number;
    sets: number;
  };
  large_files: {
    over_10mb: { count: number; totalSize: number };
    over_50mb: { count: number; totalSize: number };
  };
  totalCleanupPotential: {
    files: number;
    size: number;
    percentage: number;
  };
}

interface CleanupOperation {
  operation:
    | "delete-orphaned"
    | "delete-older-than"
    | "delete-by-category"
    | "delete-by-ids"
    | "delete-duplicates";
  options?: {
    days?: number;
    category?: "image" | "pdf" | "text";
    fileIds?: string[];
    dryRun?: boolean;
  };
}

interface CleanupResult {
  operation: string;
  success: boolean;
  deletedFiles: number;
  freedSpace: number;
  errors?: string[];
  filesToDelete?: any[];
  totalFiles?: number;
  totalSize?: number;
  estimatedSavings?: string;
  dryRun?: boolean;
}

/**
 * Fetch cleanup statistics from the API
 */
export async function fetchCleanupStats(): Promise<CleanupStats> {
  const response = await fetch("/api/files/cleanup/stats", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch cleanup stats: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "Failed to fetch cleanup stats");
  }

  return result.data;
}

/**
 * Perform a cleanup operation
 */
export async function performCleanupOperation(
  operation: CleanupOperation
): Promise<CleanupResult> {
  const response = await fetch("/api/files/cleanup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(operation),
  });

  if (!response.ok) {
    throw new Error(`Cleanup operation failed: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "Cleanup operation failed");
  }

  // Transform the API response to match what our component expects
  const transformedResult: CleanupResult = {
    operation: result.data.operation || "File Cleanup",
    success: result.data.success !== false,
    deletedFiles: result.data.deletedFiles || result.data.totalDeleted || 0,
    freedSpace: result.data.freedSpace || result.data.totalSize || 0,
    errors: result.data.errors || [],
    dryRun: result.data.dryRun || false,
  };

  return transformedResult;
}

/**
 * Perform cleanup operation for orphaned files
 */
export async function cleanupOrphanedFiles(
  dryRun: boolean = false
): Promise<CleanupResult> {
  return performCleanupOperation({
    operation: "delete-orphaned",
    options: { dryRun },
  });
}

/**
 * Perform cleanup operation for old files
 */
export async function cleanupOldFiles(
  days: number,
  dryRun: boolean = false
): Promise<CleanupResult> {
  return performCleanupOperation({
    operation: "delete-older-than",
    options: { days, dryRun },
  });
}

/**
 * Perform cleanup operation for duplicate files
 */
export async function cleanupDuplicateFiles(
  dryRun: boolean = false
): Promise<CleanupResult> {
  return performCleanupOperation({
    operation: "delete-duplicates",
    options: { dryRun },
  });
}

/**
 * Perform cleanup operation for files by category
 */
export async function cleanupFilesByCategory(
  category: "image" | "pdf" | "text",
  dryRun: boolean = false
): Promise<CleanupResult> {
  return performCleanupOperation({
    operation: "delete-by-category",
    options: { category, dryRun },
  });
}

/**
 * Perform cleanup operation for specific file IDs
 */
export async function cleanupSpecificFiles(
  fileIds: string[],
  dryRun: boolean = false
): Promise<CleanupResult> {
  return performCleanupOperation({
    operation: "delete-by-ids",
    options: { fileIds, dryRun },
  });
}

/**
 * Perform comprehensive cleanup (multiple operations)
 */
export async function performComprehensiveCleanup(
  options: {
    includeOrphaned?: boolean;
    includeDuplicates?: boolean;
    includeOldFiles?: boolean;
    oldFilesDays?: number;
    dryRun?: boolean;
  } = {}
): Promise<CleanupResult[]> {
  const {
    includeOrphaned = true,
    includeDuplicates = true,
    includeOldFiles = true,
    oldFilesDays = 90,
    dryRun = false,
  } = options;

  const operations: Promise<CleanupResult>[] = [];

  if (includeOrphaned) {
    operations.push(cleanupOrphanedFiles(dryRun));
  }

  if (includeDuplicates) {
    operations.push(cleanupDuplicateFiles(dryRun));
  }

  if (includeOldFiles) {
    operations.push(cleanupOldFiles(oldFilesDays, dryRun));
  }

  try {
    const results = await Promise.allSettled(operations);
    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        // Return error result for failed operations
        const operationNames = [
          "orphaned files",
          "duplicate files",
          "old files",
        ];
        return {
          operation: `Cleanup ${operationNames[index] || "unknown"}`,
          success: false,
          deletedFiles: 0,
          freedSpace: 0,
          errors: [result.reason?.message || "Unknown error"],
        };
      }
    });
  } catch (error) {
    throw new Error(
      `Comprehensive cleanup failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export type { CleanupStats, CleanupOperation, CleanupResult };
