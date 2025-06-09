"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  X,
  Settings,
  Sliders,
  Brain,
  Zap,
  Save,
  RotateCcw,
  Info,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ModelDetailPanelProps {
  model: any;
  preferences: any;
  onClose: () => void;
  onSave: () => void;
}

export function ModelDetailPanel({
  model,
  preferences,
  onClose,
  onSave,
}: ModelDetailPanelProps) {
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [effortLevel, setEffortLevel] = useState<"low" | "medium" | "high">(
    "medium"
  );
  const [thinkingMode, setThinkingMode] = useState(false);

  const isGemini = model.provider === "gemini";

  const handleSave = async () => {
    onSave();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="bg-slate-800/95 backdrop-blur-xl border-slate-700/50">
          <CardHeader className="pb-4 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                  {model.visualConfig?.avatar || "🤖"}
                </div>
                <div>
                  <CardTitle className="text-white">{model.name}</CardTitle>
                  <p className="text-sm text-slate-400">{model.description}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium text-white">
                  Temperature
                </label>
                <Slider
                  value={[temperature]}
                  onValueChange={(value) => setTemperature(value[0])}
                  max={2}
                  min={0}
                  step={0.1}
                />
              </div>

              {isGemini && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-white">
                    Effort Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["low", "medium", "high"] as const).map((level) => (
                      <Button
                        key={level}
                        variant={effortLevel === level ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEffortLevel(level)}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-6">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save Configuration</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
