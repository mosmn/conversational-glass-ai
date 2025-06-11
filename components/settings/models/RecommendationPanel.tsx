"use client";

import React from "react";
import { motion } from "framer-motion";
import { Star, TrendingUp, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RecommendationPanelProps {
  models: any[];
  userPreferences: any;
  onModelSelect: (model: any) => void;
}

export function RecommendationPanel({
  models,
  userPreferences,
  onModelSelect,
}: RecommendationPanelProps) {
  const recommendedModels = models.filter((m) => m.isRecommended).slice(0, 3);

  if (recommendedModels.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative group"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 to-orange-600/20 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />

      <Card className="relative bg-slate-900/40 backdrop-blur-xl border border-amber-500/20 rounded-2xl shadow-lg hover:shadow-amber-500/10 transition-all duration-500">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <motion.div
              className="p-2 bg-amber-500/20 rounded-xl"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Star className="h-5 w-5 text-amber-400" />
            </motion.div>
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Recommended for You
            </span>
          </CardTitle>
          <p className="text-slate-400 text-sm">
            Models selected based on your usage patterns and preferences
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedModels.map((model, index) => (
              <motion.div
                key={`${model.provider}:${model.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="group/card cursor-pointer"
                onClick={() => onModelSelect(model)}
              >
                <div className="relative">
                  {/* Card glow on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />

                  <div className="relative p-4 bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 hover:border-amber-500/30 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shadow-lg"
                        style={{
                          background: `linear-gradient(135deg, ${
                            model.visualConfig?.color
                              ?.replace("from-", "")
                              .replace("to-", ", ") ||
                            "from-amber-400, to-orange-500"
                          })`,
                        }}
                      >
                        {model.visualConfig?.avatar || "🤖"}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-sm leading-tight">
                          {model.name}
                        </h4>
                        <p className="text-xs text-slate-400 capitalize">
                          {model.provider}
                        </p>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                        <Star className="h-2 w-2 mr-1" />
                        Top
                      </Badge>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 mb-3">
                      {model.description}
                    </p>

                    {/* Quick stats */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-slate-400">
                        <TrendingUp className="h-3 w-3" />
                        <span className="capitalize">
                          {model.performance?.speed || "fast"}
                        </span>
                      </div>
                      <div className="text-slate-400">
                        {model.contextWindow >= 1000000
                          ? `${(model.contextWindow / 1000000).toFixed(1)}M`
                          : `${(model.contextWindow / 1000).toFixed(0)}K`}{" "}
                        ctx
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Call to action */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 pt-4 border-t border-slate-700/50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Sparkles className="h-4 w-4" />
                <span>Based on your chat patterns and preferences</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50"
              >
                View All Models
              </Button>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
