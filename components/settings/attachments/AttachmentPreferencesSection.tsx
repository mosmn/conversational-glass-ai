"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  Upload,
  Shield,
  FileImage,
  FileText,
  File,
  Cloud,
  HardDrive,
  Save,
  RotateCcw,
} from "lucide-react";

interface AttachmentPreferences {
  autoUpload: boolean;
  maxFileSize: number; // in MB
  allowedFileTypes: string[];
  thumbnailGeneration: boolean;
  textExtraction: boolean;
  storageProvider: "local" | "ibm_cos";
  compressionEnabled: boolean;
  retentionDays: number;
  duplicateHandling: "keep_both" | "replace" | "ask";
  uploadQuality: "original" | "compressed" | "web_optimized";
}

const defaultPreferences: AttachmentPreferences = {
  autoUpload: true,
  maxFileSize: 10,
  allowedFileTypes: ["image/*", "application/pdf", "text/*"],
  thumbnailGeneration: true,
  textExtraction: true,
  storageProvider: "local",
  compressionEnabled: false,
  retentionDays: 365,
  duplicateHandling: "keep_both",
  uploadQuality: "original",
};

const fileTypeOptions = [
  { value: "image/*", label: "Images", icon: FileImage, color: "emerald" },
  {
    value: "application/pdf",
    label: "PDF Files",
    icon: FileText,
    color: "red",
  },
  { value: "text/*", label: "Text Files", icon: File, color: "blue" },
];

export function AttachmentPreferencesSection() {
  const { toast } = useToast();
  const [preferences, setPreferences] =
    useState<AttachmentPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchPreferences = async () => {
    try {
      const response = await fetch("/api/user/preferences");
      const result = await response.json();

      if (result.success && result.data?.attachments) {
        setPreferences({ ...defaultPreferences, ...result.data.attachments });
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attachments: preferences,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setHasChanges(false);
        toast({
          title: "Preferences Saved",
          description: "Your attachment preferences have been updated.",
        });
      } else {
        throw new Error(result.error || "Failed to save preferences");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
    setHasChanges(true);
  };

  const updatePreference = (key: keyof AttachmentPreferences, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const toggleFileType = (fileType: string) => {
    const currentTypes = preferences.allowedFileTypes;
    const newTypes = currentTypes.includes(fileType)
      ? currentTypes.filter((type) => type !== fileType)
      : [...currentTypes, fileType];
    updatePreference("allowedFileTypes", newTypes);
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 to-cyan-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
        <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-teal-500/10 transition-all duration-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-white">
              <div className="p-2 bg-teal-500/20 rounded-xl">
                <Settings className="h-5 w-5 text-teal-400" />
              </div>
              <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Attachment Preferences
              </span>
            </CardTitle>
            <CardDescription className="text-slate-400 leading-relaxed">
              Configure how files are uploaded and processed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 animate-pulse">
              <div className="w-full h-4 bg-slate-700 rounded-lg"></div>
              <div className="w-3/4 h-4 bg-slate-700 rounded-lg"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="w-full h-10 bg-slate-700 rounded-xl"></div>
                <div className="w-full h-10 bg-slate-700 rounded-xl"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative group"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 to-cyan-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />

      <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl hover:shadow-teal-500/10 transition-all duration-500 hover:border-teal-500/30">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-white">
            <motion.div
              className="p-2 bg-teal-500/20 rounded-xl"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Settings className="h-5 w-5 text-teal-400" />
            </motion.div>
            <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              Attachment Preferences
            </span>
          </CardTitle>
          <CardDescription className="text-slate-400 leading-relaxed">
            Configure how files are uploaded and processed
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Upload Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Upload className="h-4 w-4 text-teal-400" />
              Upload Settings
            </h4>

            <div className="grid grid-cols-1 gap-4">
              {/* Auto Upload */}
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <div className="space-y-1">
                  <Label
                    htmlFor="auto-upload"
                    className="text-sm font-medium text-slate-300"
                  >
                    Auto Upload
                  </Label>
                  <p className="text-xs text-slate-500">
                    Automatically upload files when dropped or selected
                  </p>
                </div>
                <Switch
                  id="auto-upload"
                  checked={preferences.autoUpload}
                  onCheckedChange={(checked) =>
                    updatePreference("autoUpload", checked)
                  }
                />
              </div>

              {/* Max File Size */}
              <div className="space-y-2">
                <Label
                  htmlFor="max-file-size"
                  className="text-sm font-medium text-slate-300"
                >
                  Maximum File Size
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="max-file-size"
                    type="number"
                    min="1"
                    max="50"
                    value={preferences.maxFileSize}
                    onChange={(e) =>
                      updatePreference(
                        "maxFileSize",
                        parseInt(e.target.value) || 10
                      )
                    }
                    className="flex-1 bg-slate-800/50 border-slate-700/50 text-white"
                  />
                  <span className="text-sm text-slate-400">MB</span>
                </div>
              </div>
            </div>
          </div>

          {/* File Types */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Shield className="h-4 w-4 text-teal-400" />
              Allowed File Types
            </h4>

            <div className="grid grid-cols-1 gap-2">
              {fileTypeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = preferences.allowedFileTypes.includes(
                  option.value
                );
                return (
                  <motion.div
                    key={option.value}
                    whileHover={{ scale: 1.02 }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? `bg-${option.color}-500/10 border-${option.color}-500/30`
                        : "bg-slate-800/30 border-slate-700/30 hover:border-slate-600/50"
                    }`}
                    onClick={() => toggleFileType(option.value)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`h-4 w-4 ${
                            isSelected
                              ? `text-${option.color}-400`
                              : "text-slate-400"
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            isSelected ? "text-white" : "text-slate-300"
                          }`}
                        >
                          {option.label}
                        </span>
                      </div>
                      {isSelected && (
                        <Badge
                          variant="outline"
                          className={`border-${option.color}-500 text-${option.color}-400`}
                        >
                          Enabled
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Processing Options */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-300">
              Processing Options
            </h4>

            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-slate-300">
                    Thumbnail Generation
                  </Label>
                  <p className="text-xs text-slate-500">
                    Generate thumbnails for images and PDFs
                  </p>
                </div>
                <Switch
                  checked={preferences.thumbnailGeneration}
                  onCheckedChange={(checked) =>
                    updatePreference("thumbnailGeneration", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-slate-300">
                    Text Extraction
                  </Label>
                  <p className="text-xs text-slate-500">
                    Extract text content from PDFs and images
                  </p>
                </div>
                <Switch
                  checked={preferences.textExtraction}
                  onCheckedChange={(checked) =>
                    updatePreference("textExtraction", checked)
                  }
                />
              </div>
            </div>
          </div>

          {/* Storage Provider */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-slate-300">
              Storage Provider
            </Label>
            <Select
              value={preferences.storageProvider}
              onValueChange={(value: "local" | "ibm_cos") =>
                updatePreference("storageProvider", value)
              }
            >
              <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="local" className="text-slate-300">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    Local Storage
                  </div>
                </SelectItem>
                <SelectItem value="ibm_cos" className="text-slate-300">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    IBM Cloud Object Storage
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
            <Button
              variant="outline"
              size="sm"
              onClick={resetPreferences}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>

            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge
                  variant="outline"
                  className="border-amber-500 text-amber-400"
                >
                  Unsaved Changes
                </Badge>
              )}
              <Button
                onClick={savePreferences}
                disabled={!hasChanges || isSaving}
                className="bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSaving ? (
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Preferences
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
