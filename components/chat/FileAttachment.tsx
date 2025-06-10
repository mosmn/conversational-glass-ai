"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Paperclip,
  Upload,
  X,
  FileText,
  Image,
  File,
  Check,
  AlertCircle,
  Download,
  Eye,
  AlertTriangle,
  Info,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FilePreview } from "./FilePreview";
import { useModelAwareFileValidation } from "@/hooks/useModelAwareFileValidation";
import { useModels } from "@/hooks/useModels";
import { categorizeFile, getFileFormat } from "@/lib/ai/file-capabilities";
import {
  FileRecommendationEngine,
  FileRecommendationUtils,
} from "@/lib/ai/file-recommendation-engine";
import {
  FileProcessingStatus,
  useFileProcessingStatus,
} from "./FileProcessingStatus";
import type { Model } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadProgress?: number;
  status: "uploading" | "uploaded" | "error" | "invalid";
  preview?: string;
  extractedText?: string;
  thumbnailUrl?: string;
  category?: "image" | "document" | "text" | "audio" | "video";
  metadata?: {
    width?: number;
    height?: number;
    pages?: number;
    wordCount?: number;
    hasImages?: boolean;
  };
  // Validation results
  validationErrors?: string[];
  validationWarnings?: string[];
  processingInfo?: {
    method: string;
    description: string;
    icon: string;
    limitations?: string[];
  };
}

interface FileAttachmentProps {
  attachments: AttachedFile[];
  onAttachmentsChange: (attachments: AttachedFile[]) => void;
  conversationId: string;
  selectedModel?: string | null;
  onModelRecommendation?: (recommendedModels: Model[]) => void;
  maxFiles?: number;
  maxSizePerFile?: number; // in MB
}

export function FileAttachment({
  attachments,
  onAttachmentsChange,
  conversationId,
  selectedModel,
  onModelRecommendation,
  maxFiles = 5,
  maxSizePerFile = 10,
}: FileAttachmentProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewFileIndex, setPreviewFileIndex] = useState(0);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    statusData,
    addFile,
    updateFileStatus,
    updateStepStatus,
    removeFile: removeFileStatus,
    clearAll: clearAllStatus,
  } = useFileProcessingStatus();

  const { models } = useModels();
  const currentModel = models.find((m) => m.id === selectedModel) || null;

  // Convert frontend Model to backend AIModel format for validation
  const aiModel = useMemo(() => {
    if (!currentModel?.capabilities?.fileSupport) return null;
    return {
      ...currentModel,
      capabilities: {
        ...currentModel.capabilities,
        fileSupport: currentModel.capabilities.fileSupport,
      },
    } as any;
  }, [currentModel]);

  const {
    validateFilesForModel,
    validateSingleFileForModel,
    checkModelCompatibility,
    getAllowedFileTypes,
    getFileConstraints,
    isModelSelected,
  } = useModelAwareFileValidation(
    aiModel,
    (models || []).map((m) => ({
      ...m,
      capabilities: {
        ...m.capabilities,
        fileSupport: m.capabilities?.fileSupport || {
          images: {
            supported: false,
            maxFileSize: 0,
            supportedFormats: [],
            processingMethod: "textExtraction" as const,
            requiresUrl: false,
            maxImagesPerMessage: 0,
          },
          documents: {
            supported: false,
            maxFileSize: 0,
            supportedFormats: [],
            processingMethod: "textExtraction" as const,
            maxDocumentsPerMessage: 0,
            preserveFormatting: false,
          },
          textFiles: {
            supported: false,
            maxFileSize: 0,
            supportedFormats: [],
            encodingSupport: [],
            maxFilesPerMessage: 0,
          },
          audio: {
            supported: false,
            maxFileSize: 0,
            supportedFormats: [],
            processingMethod: "transcription" as const,
            maxFilesPerMessage: 0,
          },
          video: {
            supported: false,
            maxFileSize: 0,
            supportedFormats: [],
            processingMethod: "frameExtraction" as const,
            maxFilesPerMessage: 0,
          },
          overall: {
            maxTotalFileSize: 0,
            maxFilesPerMessage: 0,
            requiresPreprocessing: false,
          },
        },
      },
    })) as any[]
  );

  // Get dynamic file constraints and allowed types
  const fileConstraints = getFileConstraints;
  const allowedFileTypes = getAllowedFileTypes();

  // Validate files and generate recommendations whenever model or attachments change
  useEffect(() => {
    if (attachments.length > 0) {
      const fileAttachments = attachments.map((att) => ({
        id: att.id,
        name: att.name,
        size: att.size,
        type: att.type,
        url: att.url || "",
        category: att.category || categorizeFile(att.type),
        metadata: att.metadata,
        extractedText: att.extractedText,
        thumbnailUrl: att.thumbnailUrl,
      }));

      // Generate model recommendations
      const availableModels = models.map((m) => ({
        ...m,
        capabilities: {
          ...m.capabilities,
          fileSupport: m.capabilities?.fileSupport || {
            images: {
              supported: false,
              maxFileSize: 0,
              supportedFormats: [],
              processingMethod: "textExtraction" as const,
              requiresUrl: false,
              maxImagesPerMessage: 0,
            },
            documents: {
              supported: false,
              maxFileSize: 0,
              supportedFormats: [],
              processingMethod: "textExtraction" as const,
              maxDocumentsPerMessage: 0,
              preserveFormatting: false,
            },
            textFiles: {
              supported: false,
              maxFileSize: 0,
              supportedFormats: [],
              encodingSupport: [],
              maxFilesPerMessage: 0,
            },
            audio: {
              supported: false,
              maxFileSize: 0,
              supportedFormats: [],
              processingMethod: "transcription" as const,
              maxFilesPerMessage: 0,
            },
            video: {
              supported: false,
              maxFileSize: 0,
              supportedFormats: [],
              processingMethod: "frameExtraction" as const,
              maxFilesPerMessage: 0,
            },
            overall: {
              maxTotalFileSize: 0,
              maxFilesPerMessage: 0,
              requiresPreprocessing: false,
            },
          },
        },
      })) as any[];

      const recResults = FileRecommendationEngine.recommendModels(
        fileAttachments,
        availableModels
      );
      setRecommendations(recResults);

      // Show recommendations if current model isn't optimal
      if (currentModel) {
        const currentScore =
          recResults.primaryRecommendation?.model.id === currentModel.id
            ? recResults.primaryRecommendation.score
            : recResults.alternatives?.find(
                (alt) => alt.model.id === currentModel.id
              )?.score || 0;

        if (
          currentScore < 70 &&
          recResults.primaryRecommendation &&
          recResults.primaryRecommendation.score > currentScore + 20
        ) {
          setShowRecommendations(true);
        }
      } else if (
        recResults.primaryRecommendation ||
        (recResults.alternatives && recResults.alternatives.length > 0)
      ) {
        setShowRecommendations(true);
      }

      // Validate against current model if selected
      if (isModelSelected) {
        const results = validateFilesForModel(fileAttachments);
        setValidationResults(results);

        // Update attachment validation status
        const updatedAttachments = attachments.map((att) => {
          const fileAttachment = fileAttachments.find((f) => f.id === att.id);
          if (!fileAttachment) return att;

          const singleValidation = validateSingleFileForModel(fileAttachment);

          return {
            ...att,
            status: singleValidation.valid ? att.status : ("invalid" as const),
            validationErrors: singleValidation.errors,
            validationWarnings: singleValidation.warnings,
            processingInfo: singleValidation.processingInfo,
          };
        });

        if (
          JSON.stringify(updatedAttachments) !== JSON.stringify(attachments)
        ) {
          onAttachmentsChange(updatedAttachments);
        }

        // Note: Removed aggressive model switching - recommendations are shown in UI only
        // Users can manually click the "Switch" button if they want to change models
      }
    } else {
      setRecommendations(null);
      setShowRecommendations(false);
    }
  }, [attachments, selectedModel, isModelSelected]);

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return Image;
    if (type === "application/pdf") return FileText;
    return File;
  };

  const getFileTypeColor = (type: string) => {
    if (type.startsWith("image/")) return "emerald";
    if (type === "application/pdf") return "red";
    return "blue";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    console.log("🐛 DEBUG - validateFile:");
    console.log("  📁 File:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });
    console.log("  🤖 Model:", {
      isModelSelected,
      currentModelName: currentModel?.name,
      currentModelId: selectedModel,
    });
    console.log("  📏 Constraints:", {
      maxSizePerFile,
      fileConstraintsMaxFileSize: fileConstraints.maxFileSize,
      allowedFileTypes,
      maxFiles,
      fileConstraintsMaxFiles: fileConstraints.maxFiles,
      currentAttachmentsCount: attachments.length,
    });

    // Check if model is selected
    if (!isModelSelected) {
      console.log("  ❌ Validation failed: No model selected");
      return "Please select an AI model first";
    }

    // Check file size against model constraints
    const maxSize = Math.min(
      maxSizePerFile * 1024 * 1024,
      fileConstraints.maxFileSize * 1024 * 1024
    );
    if (file.size > maxSize) {
      console.log("  ❌ Validation failed: File too large");
      console.log("    File size:", file.size, "bytes");
      console.log("    Max allowed:", maxSize, "bytes");
      return `File size must be less than ${Math.min(
        maxSizePerFile,
        fileConstraints.maxFileSize
      )}MB for ${currentModel?.name}`;
    }

    // Check file type against model constraints
    if (allowedFileTypes.length > 0 && !allowedFileTypes.includes(file.type)) {
      console.log("  ❌ Validation failed: File type not supported");
      console.log("    File type:", file.type);
      console.log("    Allowed types:", allowedFileTypes);
      return `${file.type} files are not supported by ${currentModel?.name}`;
    }

    // Check total file count
    if (attachments.length >= Math.min(maxFiles, fileConstraints.maxFiles)) {
      console.log("  ❌ Validation failed: Too many files");
      return `Maximum ${Math.min(
        maxFiles,
        fileConstraints.maxFiles
      )} files allowed for ${currentModel?.name}`;
    }

    console.log("  ✅ Validation passed");
    return null;
  };

  const processFiles = async (files: FileList) => {
    const newAttachments: AttachedFile[] = [];

    for (
      let i = 0;
      i < files.length && attachments.length + newAttachments.length < maxFiles;
      i++
    ) {
      const file = files[i];
      const validationError = validateFile(file);

      const attachment: AttachedFile = {
        id: Date.now().toString() + i,
        name: file.name,
        size: file.size,
        type: file.type,
        status: validationError ? "invalid" : "uploading",
        uploadProgress: 0,
        category: categorizeFile(file.type),
        validationErrors: validationError ? [validationError] : undefined,
      };

      // Generate preview for images
      if (file.type.startsWith("image/") && !validationError) {
        const reader = new FileReader();
        reader.onload = (e) => {
          attachment.preview = e.target?.result as string;
          // Note: Preview will be updated when the attachment is uploaded
          // For now, we'll handle preview updates in the upload completion
        };
        reader.readAsDataURL(file);
      }

      newAttachments.push(attachment);

      // Start real file upload only if validation passed
      if (!validationError) {
        // Add to processing status
        addFile({
          fileId: attachment.id,
          fileName: attachment.name,
          fileSize: attachment.size,
          fileType: attachment.type,
          overallStatus: "uploading",
          processingMethod:
            currentModel?.capabilities.multiModal &&
            attachment.category === "image"
              ? "vision"
              : "textExtraction",
          modelCompatibility: {
            compatible: !validationError,
            modelName: currentModel?.name || "No model selected",
            limitations: validationError ? [validationError] : undefined,
            recommendations:
              currentModel &&
              FileRecommendationUtils.needsModelUpgrade(currentModel as any, [
                attachment,
              ])
                ? ["Consider upgrading to a model with better file support"]
                : undefined,
          },
          estimatedTime: Math.max(
            5,
            Math.floor(attachment.size / (1024 * 100))
          ), // Rough estimate
        });

        // Pass the new attachments array to uploadFile to avoid stale closure
        const newAttachmentsArray = [...attachments, ...newAttachments];
        uploadFile(attachment, file, newAttachmentsArray);
      }
    }

    console.log("🐛 DEBUG - processFiles completing:");
    console.log("  📋 Current attachments:", attachments.length);
    console.log("  ➕ New attachments:", newAttachments.length);
    console.log(
      "  📄 New attachments details:",
      newAttachments.map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
      }))
    );

    onAttachmentsChange([...attachments, ...newAttachments]);

    console.log(
      "  ✅ Called onAttachmentsChange with total:",
      attachments.length + newAttachments.length,
      "attachments"
    );
  };

  const uploadFile = useCallback(
    async (
      attachment: AttachedFile,
      file: File,
      currentAttachments?: AttachedFile[]
    ) => {
      try {
        // Update status to processing
        updateFileStatus(attachment.id, {
          overallStatus: "processing",
          overallProgress: 25,
        });

        updateStepStatus(attachment.id, "upload", {
          status: "complete",
          duration: 100,
        });

        updateStepStatus(attachment.id, "validate", {
          status: "processing",
          progress: 50,
        });

        const formData = new FormData();
        formData.append(`file-${attachment.id}`, file);
        formData.append("conversationId", conversationId);
        formData.append("maxFiles", maxFiles.toString());
        formData.append("maxSizePerFile", maxSizePerFile.toString());

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        updateStepStatus(attachment.id, "validate", {
          status: "complete",
          progress: 100,
          duration: 200,
        });

        updateStepStatus(attachment.id, "process", {
          status: "processing",
          progress: 25,
        });

        const result = await response.json();

        if (result.errors && result.errors.length > 0) {
          throw new Error(result.errors[0]);
        }

        const uploadedFile = result.files[0];
        if (uploadedFile) {
          // Update processing status
          updateStepStatus(attachment.id, "process", {
            status: "complete",
            progress: 100,
            duration: 500,
            details: uploadedFile.extractedText
              ? `Extracted ${uploadedFile.extractedText.length} characters`
              : "File processed successfully",
          });

          updateStepStatus(attachment.id, "optimize", {
            status: "processing",
            progress: 75,
          });

          // Update attachment with upload results
          attachment.status = "uploaded";
          attachment.uploadProgress = 100;
          attachment.url = uploadedFile.url;
          attachment.extractedText = uploadedFile.extractedText;
          attachment.thumbnailUrl = uploadedFile.thumbnailUrl;
          attachment.category = uploadedFile.category;
          attachment.metadata = uploadedFile.metadata;

          // Use thumbnail URL as preview if available
          if (uploadedFile.thumbnailUrl && !attachment.preview) {
            attachment.preview = uploadedFile.thumbnailUrl;
          }

          // Complete optimization step
          updateStepStatus(attachment.id, "optimize", {
            status: "complete",
            progress: 100,
            duration: 150,
            details: "Optimized for selected model",
          });

          // Mark overall processing as complete
          updateFileStatus(attachment.id, {
            overallStatus: "complete",
            overallProgress: 100,
          });

          // Debug logging
          console.log("🐛 DEBUG - File upload completed:");
          console.log("  📁 Attachment updated:", {
            id: attachment.id,
            name: attachment.name,
            status: attachment.status,
            url: attachment.url,
            category: attachment.category,
          });
          console.log(
            "  📋 All attachments before state update:",
            attachments.map((a) => ({
              id: a.id,
              name: a.name,
              status: a.status,
              url: a.url,
            }))
          );

          // FIXED: Use the passed currentAttachments to avoid stale closure
          const attachmentsToUpdate = currentAttachments || attachments;
          console.log(
            "  📋 Using attachments array with length:",
            attachmentsToUpdate.length
          );

          const updatedAttachments = attachmentsToUpdate.map((a) =>
            a.id === attachment.id ? { ...a, ...attachment } : a
          );
          onAttachmentsChange(updatedAttachments);

          console.log(
            "  ✅ Called onAttachmentsChange with updated attachments:",
            updatedAttachments.map((a) => ({
              id: a.id,
              name: a.name,
              status: a.status,
              url: a.url,
            }))
          );
        }
      } catch (error) {
        console.error("Upload error:", error);

        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";

        // Update status with error
        updateFileStatus(attachment.id, {
          overallStatus: "error",
          errors: [errorMessage],
        });

        // FIXED: Use the passed currentAttachments for error handling too
        const attachmentsToUpdate = currentAttachments || attachments;
        const updatedAttachments = attachmentsToUpdate.map((a) =>
          a.id === attachment.id
            ? {
                ...a,
                status: "error" as const,
                uploadProgress: 0,
                validationErrors: [errorMessage],
              }
            : a
        );
        onAttachmentsChange(updatedAttachments);
      }
    },
    [attachments, conversationId, maxFiles, maxSizePerFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFiles(files);
      }
    },
    [attachments, maxFiles]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      processFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    onAttachmentsChange(attachments.filter((att) => att.id !== id));
  };

  const canAddMore =
    attachments.length < Math.min(maxFiles, fileConstraints.maxFiles);

  // Generate helpful description based on current model
  const getModelFileDescription = () => {
    if (!isModelSelected) {
      return "Select an AI model to enable file attachments";
    }

    const parts = [];
    if (currentModel?.capabilities?.fileSupport?.images?.supported) {
      parts.push("images");
    }
    if (currentModel?.capabilities?.fileSupport?.documents?.supported) {
      parts.push("PDFs");
    }
    if (currentModel?.capabilities?.fileSupport?.textFiles?.supported) {
      parts.push("text files");
    }
    if (currentModel?.capabilities?.fileSupport?.audio?.supported) {
      parts.push("audio");
    }
    if (currentModel?.capabilities?.fileSupport?.video?.supported) {
      parts.push("video");
    }

    if (parts.length === 0) {
      return `${currentModel?.name} doesn't support file attachments`;
    }

    const maxSize = Math.min(maxSizePerFile, fileConstraints.maxFileSize);
    const maxCount = Math.min(maxFiles, fileConstraints.maxFiles);

    return `${currentModel?.name} supports ${parts.join(
      ", "
    )} up to ${maxSize}MB (max ${maxCount} files)`;
  };

  return (
    <div className="space-y-4">
      {/* Model Validation Alerts */}
      {!isModelSelected && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-200">
            Please select an AI model to enable file attachments.
          </AlertDescription>
        </Alert>
      )}

      {validationResults && validationResults.validation.errors.length > 0 && (
        <Alert className="border-red-500/50 bg-red-500/10">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-200">
            <div className="space-y-1">
              {validationResults.validation.errors.map(
                (error: string, idx: number) => (
                  <div key={idx}>{error}</div>
                )
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced Model Recommendations */}
      {showRecommendations && recommendations && (
        <Alert className="border-purple-500/50 bg-purple-500/10">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <AlertDescription className="text-purple-200">
            <div className="space-y-3">
              {recommendations.primaryRecommendation ? (
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Model Recommendation</h4>
                    <p className="text-sm text-purple-300 mt-1">
                      {recommendations.primaryRecommendation.model.name} (
                      {Math.round(recommendations.primaryRecommendation.score)}%
                      match)
                    </p>
                    <p className="text-xs text-purple-400 mt-1">
                      {recommendations.primaryRecommendation.reasons
                        .slice(0, 2)
                        .join(", ")}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-500 text-purple-400 hover:bg-purple-500/20"
                      onClick={() => {
                        if (
                          onModelRecommendation &&
                          recommendations.primaryRecommendation
                        ) {
                          const recommendedModel = models.find(
                            (m) =>
                              m.id ===
                              recommendations.primaryRecommendation.model.id
                          );
                          if (recommendedModel) {
                            onModelRecommendation([recommendedModel]);
                          }
                        }
                      }}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Switch
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-purple-400 hover:bg-purple-500/20"
                      onClick={() => setShowRecommendations(false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-yellow-400">
                      No Compatible Models Found
                    </h4>
                    <p className="text-sm text-yellow-300 mt-1">
                      Your files may not be compatible with available models
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-purple-400 hover:bg-purple-500/20"
                    onClick={() => setShowRecommendations(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Alternative Recommendations */}
              {recommendations.alternatives &&
                recommendations.alternatives.length > 0 && (
                  <div className="pt-2 border-t border-purple-500/30">
                    <p className="text-xs text-purple-400 mb-2">
                      {recommendations.primaryRecommendation
                        ? "Other options:"
                        : "Available options:"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.alternatives
                        .slice(0, 3)
                        .map((alt: any) => (
                          <button
                            key={alt.model.id}
                            onClick={() => {
                              if (onModelRecommendation) {
                                const altModel = models.find(
                                  (m) => m.id === alt.model.id
                                );
                                if (altModel) {
                                  onModelRecommendation([altModel]);
                                }
                              }
                            }}
                            className="text-xs px-2 py-1 bg-purple-500/20 border border-purple-500/40 
                                 rounded hover:bg-purple-500/30 transition-colors"
                          >
                            {alt.model.name} ({Math.round(alt.score)}%)
                          </button>
                        ))}
                    </div>
                  </div>
                )}

              {/* Fallback Suggestion */}
              {recommendations.fallbackSuggestion && (
                <div className="pt-2 border-t border-purple-500/30">
                  <div className="flex items-center space-x-2">
                    <Info className="h-3 w-3 text-purple-400" />
                    <p className="text-xs text-purple-300">
                      {recommendations.fallbackSuggestion.message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {validationResults &&
        validationResults.recommendations.shouldSwitchModel && (
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  Consider switching to{" "}
                  {validationResults.recommendations.suggestedModels[0]?.name}{" "}
                  for better file support.
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-500 text-blue-400 hover:bg-blue-500/20"
                  onClick={() => {
                    if (onModelRecommendation) {
                      const recommendedModels =
                        validationResults.recommendations.suggestedModels
                          .map((aiModel: any) =>
                            models.find((m) => m.id === aiModel.id)
                          )
                          .filter(Boolean) as Model[];
                      onModelRecommendation(recommendedModels);
                    }
                  }}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Switch
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

      {/* File Upload Area - Enhanced */}
      {canAddMore && isModelSelected && (
        <Card
          className={cn(
            "relative border-2 border-dashed transition-all duration-300 cursor-pointer group overflow-hidden",
            "backdrop-blur-xl bg-slate-800/20 hover:bg-slate-800/40",
            isDragOver
              ? "border-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/20 scale-[1.02]"
              : "border-slate-600/50 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-slate-900/20"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {/* Animated background gradient */}
          <div
            className={cn(
              "absolute inset-0 opacity-0 transition-opacity duration-300",
              isDragOver ? "opacity-100" : "group-hover:opacity-50"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-blue-500/10" />
          </div>

          <CardContent className="relative p-8 text-center">
            <div
              className={cn(
                "transition-all duration-300",
                isDragOver ? "scale-110" : "group-hover:scale-105"
              )}
            >
              <Upload
                className={cn(
                  "h-12 w-12 mx-auto mb-4 transition-all duration-300",
                  isDragOver
                    ? "text-emerald-400 animate-bounce"
                    : "text-slate-400 group-hover:text-emerald-400"
                )}
              />
            </div>

            <div className="space-y-2">
              <p
                className={cn(
                  "text-base font-semibold transition-colors duration-300",
                  isDragOver
                    ? "text-emerald-300"
                    : "text-slate-200 group-hover:text-white"
                )}
              >
                {isDragOver
                  ? "✨ Drop files here"
                  : "📎 Drag files here or click to browse"}
              </p>

              <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                {getModelFileDescription()}
              </p>

              <div className="flex items-center justify-center space-x-4 mt-4">
                <div className="flex items-center space-x-2">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors duration-300",
                      attachments.length > 0 ? "bg-emerald-400" : "bg-slate-500"
                    )}
                  />
                  <span className="text-xs text-slate-500">
                    {attachments.length}/
                    {Math.min(maxFiles, fileConstraints.maxFiles)} files
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-xs text-slate-500">
                    Up to{" "}
                    {Math.min(maxSizePerFile, fileConstraints.maxFileSize)}MB
                    each
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={allowedFileTypes.join(",")}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File Processing Status */}
      {statusData.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300">
            Processing Status
          </h4>
          <FileProcessingStatus
            files={statusData}
            onRetry={(fileId) => {
              const attachment = attachments.find((a) => a.id === fileId);
              if (attachment) {
                // Mark for retry - would need actual file blob for real retry
                updateFileStatus(fileId, {
                  overallStatus: "processing",
                  overallProgress: 0,
                  errors: undefined,
                });
              }
            }}
            onOptimize={(fileId) => {
              const attachment = attachments.find((a) => a.id === fileId);
              if (attachment && recommendations?.primaryRecommendation) {
                // Auto-switch to recommended model
                const recommendedModel = models.find(
                  (m) => m.id === recommendations.primaryRecommendation.model.id
                );
                if (recommendedModel && onModelRecommendation) {
                  onModelRecommendation([recommendedModel]);
                }
              }
            }}
          />
        </div>
      )}

      {/* Attachment List - Enhanced */}
      {attachments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-slate-200 flex items-center space-x-2">
              <div className="w-1 h-6 bg-gradient-to-b from-emerald-400 to-blue-500 rounded-full" />
              <span>Attached Files</span>
              <div className="bg-slate-700/50 text-slate-300 text-xs px-2 py-1 rounded-full">
                {attachments.length}
              </div>
            </h4>
          </div>

          <div className="grid gap-3">
            {attachments.map((attachment, index) => {
              const FileIcon = getFileIcon(attachment.type);
              const colorClass = getFileTypeColor(attachment.type);
              const hasErrors =
                attachment.validationErrors &&
                attachment.validationErrors.length > 0;
              const hasWarnings =
                attachment.validationWarnings &&
                attachment.validationWarnings.length > 0;

              return (
                <Card
                  key={attachment.id}
                  className={cn(
                    "group border backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] hover:shadow-lg",
                    "animate-in slide-in-from-top-2 fade-in duration-300",
                    hasErrors
                      ? "bg-red-900/10 border-red-500/30 hover:border-red-400/50 shadow-red-500/10"
                      : hasWarnings
                      ? "bg-yellow-900/10 border-yellow-500/30 hover:border-yellow-400/50 shadow-yellow-500/10"
                      : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/50"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start space-x-4">
                      {/* File Preview/Icon - Enhanced */}
                      <div className="relative group/icon">
                        <div
                          className={cn(
                            "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300",
                            "backdrop-blur-sm group-hover/icon:scale-105",
                            hasErrors
                              ? "bg-red-600/20 border border-red-500/40 shadow-red-500/10"
                              : hasWarnings
                              ? "bg-yellow-600/20 border border-yellow-500/40 shadow-yellow-500/10"
                              : `bg-${colorClass}-600/20 border border-${colorClass}-500/40 shadow-${colorClass}-500/10`
                          )}
                        >
                          {attachment.preview ? (
                            <img
                              src={attachment.preview}
                              alt={attachment.name}
                              className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover/icon:scale-110"
                            />
                          ) : (
                            <FileIcon
                              className={cn(
                                "h-6 w-6 transition-all duration-300 group-hover/icon:scale-110",
                                hasErrors
                                  ? "text-red-400"
                                  : hasWarnings
                                  ? "text-yellow-400"
                                  : `text-${colorClass}-400`
                              )}
                            />
                          )}
                        </div>

                        {/* File type indicator */}
                        <div
                          className={cn(
                            "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                            "backdrop-blur-sm border transition-all duration-300",
                            hasErrors
                              ? "bg-red-500 border-red-400 text-white"
                              : hasWarnings
                              ? "bg-yellow-500 border-yellow-400 text-black"
                              : `bg-${colorClass}-500 border-${colorClass}-400 text-white`
                          )}
                        >
                          {attachment.type
                            .split("/")[1]
                            ?.charAt(0)
                            ?.toUpperCase() || "F"}
                        </div>
                      </div>

                      {/* File Info - Enhanced */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-base font-semibold text-slate-100 truncate group-hover:text-white transition-colors duration-300">
                              {attachment.name}
                            </p>
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
                                {formatFileSize(attachment.size)}
                              </span>
                              <div className="w-1 h-1 bg-slate-500 rounded-full" />
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs border-0 px-2 py-0.5 font-medium",
                                  hasErrors
                                    ? "bg-red-500/20 text-red-300"
                                    : hasWarnings
                                    ? "bg-yellow-500/20 text-yellow-300"
                                    : `bg-${colorClass}-500/20 text-${colorClass}-300`
                                )}
                              >
                                {attachment.category?.toUpperCase() ||
                                  attachment.type
                                    .split("/")[1]
                                    ?.toUpperCase() ||
                                  "FILE"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 ml-4">
                            {/* Processing Info */}
                            {attachment.processingInfo &&
                              attachment.status !== "invalid" && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className="text-xs border-emerald-500 text-emerald-400"
                                    >
                                      {attachment.processingInfo.icon}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="space-y-1">
                                      <p className="font-medium">
                                        {attachment.processingInfo.description}
                                      </p>
                                      {attachment.processingInfo
                                        .limitations && (
                                        <ul className="text-xs space-y-0.5">
                                          {attachment.processingInfo.limitations.map(
                                            (limitation, idx) => (
                                              <li key={idx}>• {limitation}</li>
                                            )
                                          )}
                                        </ul>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                            {attachment.status === "uploaded" && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 hover:bg-blue-500/20 hover:text-blue-400 transition-all duration-200 rounded-lg"
                                      onClick={() => {
                                        const index = attachments.findIndex(
                                          (a) => a.id === attachment.id
                                        );
                                        setPreviewFileIndex(index);
                                        setShowPreview(true);
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>👁️ Preview file</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all duration-200 rounded-lg"
                                      onClick={() => {
                                        const link =
                                          document.createElement("a");
                                        link.href = attachment.url!;
                                        link.download = attachment.name;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>💾 Download file</p>
                                  </TooltipContent>
                                </Tooltip>
                              </>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    removeAttachment(attachment.id)
                                  }
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-all duration-200 rounded-lg"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>🗑️ Remove file</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        {/* Enhanced Status Section */}
                        <div className="flex items-center justify-between mt-4">
                          {/* Status Indicator - Enhanced */}
                          <div className="flex items-center space-x-2">
                            {attachment.status === "uploading" && (
                              <>
                                <div className="relative">
                                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-ping absolute" />
                                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                                </div>
                                <span className="text-sm text-yellow-400 font-medium">
                                  Uploading...
                                </span>
                              </>
                            )}
                            {attachment.status === "uploaded" && (
                              <>
                                <div className="w-3 h-3 bg-emerald-400 rounded-full flex items-center justify-center">
                                  <Check className="h-2 w-2 text-slate-900" />
                                </div>
                                <span className="text-sm text-emerald-400 font-medium">
                                  ✨ Ready
                                </span>
                              </>
                            )}
                            {attachment.status === "error" && (
                              <>
                                <div className="w-3 h-3 bg-red-400 rounded-full flex items-center justify-center">
                                  <AlertCircle className="h-2 w-2 text-white" />
                                </div>
                                <span className="text-sm text-red-400 font-medium">
                                  ❌ Failed
                                </span>
                              </>
                            )}
                            {attachment.status === "invalid" && (
                              <>
                                <div className="w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                                  <AlertTriangle className="h-2 w-2 text-slate-900" />
                                </div>
                                <span className="text-sm text-yellow-400 font-medium">
                                  ⚠️ Invalid
                                </span>
                              </>
                            )}
                          </div>

                          {/* Enhanced metadata display */}
                          {attachment.metadata &&
                            attachment.status === "uploaded" && (
                              <div className="text-xs text-slate-500 space-x-2">
                                {attachment.metadata.pages && (
                                  <span>
                                    📄 {attachment.metadata.pages} pages
                                  </span>
                                )}
                                {attachment.metadata.wordCount && (
                                  <span>
                                    📝 {attachment.metadata.wordCount} words
                                  </span>
                                )}
                                {attachment.metadata.width &&
                                  attachment.metadata.height && (
                                    <span>
                                      🖼️ {attachment.metadata.width}×
                                      {attachment.metadata.height}
                                    </span>
                                  )}
                              </div>
                            )}
                        </div>

                        {/* Enhanced Upload Progress */}
                        {attachment.status === "uploading" &&
                          attachment.uploadProgress !== undefined && (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">
                                  Progress
                                </span>
                                <span className="text-xs text-yellow-400 font-medium">
                                  {Math.round(attachment.uploadProgress)}%
                                </span>
                              </div>
                              <div className="relative">
                                <Progress
                                  value={attachment.uploadProgress}
                                  className="h-2 bg-slate-700/50"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-emerald-400/20 to-blue-400/20 rounded-full animate-pulse" />
                              </div>
                            </div>
                          )}

                        {/* Enhanced Validation Messages */}
                        {(hasErrors || hasWarnings) && (
                          <div className="mt-3 space-y-2">
                            {attachment.validationErrors?.map((error, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 flex items-start space-x-2"
                              >
                                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium">Error</p>
                                  <p className="text-xs">{error}</p>
                                </div>
                              </div>
                            ))}
                            {attachment.validationWarnings?.map(
                              (warning, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 flex items-start space-x-2"
                                >
                                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium">
                                      Warning
                                    </p>
                                    <p className="text-xs">{warning}</p>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      <FilePreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        files={attachments
          .filter((a) => a.status === "uploaded")
          .map((a) => ({
            id: a.id,
            name: a.name,
            originalFilename: a.name,
            size: a.size,
            type: a.type,
            url: a.url!,
            extractedText: a.extractedText,
            thumbnailUrl: a.thumbnailUrl,
            category: a.category,
            metadata: a.metadata,
          }))}
        initialFileIndex={previewFileIndex}
      />
    </div>
  );
}
