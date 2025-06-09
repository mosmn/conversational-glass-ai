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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Validate files whenever model or attachments change
  useEffect(() => {
    if (attachments.length > 0 && isModelSelected) {
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

      if (JSON.stringify(updatedAttachments) !== JSON.stringify(attachments)) {
        onAttachmentsChange(updatedAttachments);
      }

      // Suggest model switch if needed
      if (results.recommendations.shouldSwitchModel && onModelRecommendation) {
        // Convert AIModel back to Model format for the callback
        const recommendedModels = results.recommendations.suggestedModels
          .map((aiModel) => models.find((m) => m.id === aiModel.id))
          .filter(Boolean) as Model[];
        onModelRecommendation(recommendedModels);
      }
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
    // Check if model is selected
    if (!isModelSelected) {
      return "Please select an AI model first";
    }

    // Check file size against model constraints
    const maxSize = Math.min(
      maxSizePerFile * 1024 * 1024,
      fileConstraints.maxFileSize * 1024 * 1024
    );
    if (file.size > maxSize) {
      return `File size must be less than ${Math.min(
        maxSizePerFile,
        fileConstraints.maxFileSize
      )}MB for ${currentModel?.name}`;
    }

    // Check file type against model constraints
    if (allowedFileTypes.length > 0 && !allowedFileTypes.includes(file.type)) {
      return `${file.type} files are not supported by ${currentModel?.name}`;
    }

    // Check total file count
    if (attachments.length >= Math.min(maxFiles, fileConstraints.maxFiles)) {
      return `Maximum ${Math.min(
        maxFiles,
        fileConstraints.maxFiles
      )} files allowed for ${currentModel?.name}`;
    }

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
          onAttachmentsChange([...attachments, ...newAttachments]);
        };
        reader.readAsDataURL(file);
      }

      newAttachments.push(attachment);

      // Start real file upload only if validation passed
      if (!validationError) {
        uploadFile(attachment, file);
      }
    }

    onAttachmentsChange([...attachments, ...newAttachments]);
  };

  const uploadFile = async (attachment: AttachedFile, file: File) => {
    try {
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

      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0]);
      }

      const uploadedFile = result.files[0];
      if (uploadedFile) {
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

        onAttachmentsChange([...attachments]);
      }
    } catch (error) {
      console.error("Upload error:", error);
      attachment.status = "error";
      attachment.uploadProgress = 0;
      attachment.validationErrors = [
        error instanceof Error ? error.message : "Upload failed",
      ];
      onAttachmentsChange([...attachments]);
    }
  };

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

      {/* File Upload Area */}
      {canAddMore && isModelSelected && (
        <Card
          className={cn(
            "border-dashed transition-all duration-200 cursor-pointer",
            isDragOver
              ? "border-emerald-500 bg-emerald-600/10"
              : "border-slate-600 hover:border-slate-500 bg-slate-800/30"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="p-6 text-center">
            <Upload
              className={cn(
                "h-8 w-8 mx-auto mb-3",
                isDragOver ? "text-emerald-400" : "text-slate-400"
              )}
            />
            <p className="text-sm font-medium mb-1">
              {isDragOver
                ? "Drop files here"
                : "Drag files here or click to browse"}
            </p>
            <p className="text-xs text-slate-500">
              {getModelFileDescription()}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {attachments.length}/
              {Math.min(maxFiles, fileConstraints.maxFiles)} files attached
            </p>
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

      {/* Attachment List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300">Attached Files</h4>
          {attachments.map((attachment) => {
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
                  "border transition-all duration-200",
                  hasErrors
                    ? "bg-red-900/20 border-red-500/50"
                    : hasWarnings
                    ? "bg-yellow-900/20 border-yellow-500/50"
                    : "bg-slate-800/50 border-slate-700"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    {/* File Preview/Icon */}
                    <div
                      className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
                        hasErrors
                          ? "bg-red-600/20 border border-red-500/30"
                          : hasWarnings
                          ? "bg-yellow-600/20 border border-yellow-500/30"
                          : `bg-${colorClass}-600/20 border border-${colorClass}-500/30`
                      )}
                    >
                      {attachment.preview ? (
                        <img
                          src={attachment.preview}
                          alt={attachment.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <FileIcon
                          className={cn(
                            "h-5 w-5",
                            hasErrors
                              ? "text-red-400"
                              : hasWarnings
                              ? "text-yellow-400"
                              : `text-${colorClass}-400`
                          )}
                        />
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">
                          {attachment.name}
                        </p>
                        <div className="flex items-center space-x-2">
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
                                    {attachment.processingInfo.limitations && (
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
                                    className="h-6 w-6 p-0"
                                    onClick={() => {
                                      const index = attachments.findIndex(
                                        (a) => a.id === attachment.id
                                      );
                                      setPreviewFileIndex(index);
                                      setShowPreview(true);
                                    }}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Preview file</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => {
                                      const link = document.createElement("a");
                                      link.href = attachment.url!;
                                      link.download = attachment.name;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    }}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Download file</p>
                                </TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeAttachment(attachment.id)}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-500">
                            {formatFileSize(attachment.size)}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              hasErrors
                                ? "border-red-500 text-red-400"
                                : hasWarnings
                                ? "border-yellow-500 text-yellow-400"
                                : `border-${colorClass}-500 text-${colorClass}-400`
                            )}
                          >
                            {attachment.type.split("/")[1]?.toUpperCase() ||
                              "FILE"}
                          </Badge>
                        </div>

                        {/* Status Indicator */}
                        <div className="flex items-center space-x-1">
                          {attachment.status === "uploading" && (
                            <>
                              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                              <span className="text-xs text-yellow-400">
                                Uploading...
                              </span>
                            </>
                          )}
                          {attachment.status === "uploaded" && (
                            <>
                              <Check className="h-3 w-3 text-green-400" />
                              <span className="text-xs text-green-400">
                                Ready
                              </span>
                            </>
                          )}
                          {attachment.status === "error" && (
                            <>
                              <AlertCircle className="h-3 w-3 text-red-400" />
                              <span className="text-xs text-red-400">
                                Failed
                              </span>
                            </>
                          )}
                          {attachment.status === "invalid" && (
                            <>
                              <AlertTriangle className="h-3 w-3 text-yellow-400" />
                              <span className="text-xs text-yellow-400">
                                Invalid
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Upload Progress */}
                      {attachment.status === "uploading" &&
                        attachment.uploadProgress !== undefined && (
                          <Progress
                            value={attachment.uploadProgress}
                            className="h-1 mt-2"
                          />
                        )}

                      {/* Validation Messages */}
                      {(hasErrors || hasWarnings) && (
                        <div className="mt-2 space-y-1">
                          {attachment.validationErrors?.map((error, idx) => (
                            <div
                              key={idx}
                              className="text-xs text-red-400 flex items-center space-x-1"
                            >
                              <AlertCircle className="h-3 w-3 flex-shrink-0" />
                              <span>{error}</span>
                            </div>
                          ))}
                          {attachment.validationWarnings?.map(
                            (warning, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-yellow-400 flex items-center space-x-1"
                              >
                                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                <span>{warning}</span>
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
