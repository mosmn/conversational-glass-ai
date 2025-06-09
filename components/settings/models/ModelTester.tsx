"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Play, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ModelTesterProps {
  models: any[];
  onTestComplete: (results: any) => void;
}

export function ModelTester({ models, onTestComplete }: ModelTesterProps) {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});

  const runTests = async () => {
    setTesting(true);
    const testResults: Record<string, boolean> = {};

    // Simulate testing each model
    for (const model of models.slice(0, 3)) {
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        testResults[model.id] = Math.random() > 0.2; // 80% success rate
      } catch {
        testResults[model.id] = false;
      }
    }

    setResults(testResults);
    setTesting(false);
    onTestComplete(testResults);
  };

  if (models.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 right-6 z-40"
    >
      <Card className="bg-slate-800/95 backdrop-blur-xl border-slate-700/50 w-80">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <Play className="h-4 w-4" />
            Model Tester
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.keys(results).length > 0 && (
              <div className="space-y-2">
                {Object.entries(results).map(([modelId, success]) => {
                  const model = models.find((m) => m.id === modelId);
                  return (
                    <div
                      key={modelId}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-300">{model?.name}</span>
                      {success ? (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <Button
              onClick={runTests}
              disabled={testing}
              className="w-full bg-purple-600 hover:bg-purple-700"
              size="sm"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Test Models
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
