"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  HelpCircle,
  Zap,
  Brain,
  Target,
  Sparkles,
  Clock,
  DollarSign,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ModelQuickGuideProps {
  className?: string;
}

const modelTips = [
  {
    icon: Zap,
    category: "Fast Models",
    color: "text-green-400",
    bg: "bg-green-500/10",
    description:
      "Perfect for quick questions, brainstorming, and rapid iteration",
    examples: [
      "Quick questions",
      "Simple tasks",
      "Brainstorming",
      "Code snippets",
    ],
    models: ["Groq models", "GPT-3.5 Turbo", "Claude Haiku"],
  },
  {
    icon: Brain,
    category: "Smart Models",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    description: "Best for complex reasoning, analysis, and detailed responses",
    examples: [
      "Research",
      "Complex analysis",
      "Detailed explanations",
      "Hard problems",
    ],
    models: ["GPT-4", "Claude Sonnet", "Gemini Pro"],
  },
  {
    icon: Target,
    category: "Balanced Models",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    description: "Good all-around performance for most everyday tasks",
    examples: ["General chat", "Writing help", "Coding assistance", "Learning"],
    models: ["GPT-3.5 Turbo", "Claude Haiku", "Gemini Flash"],
  },
  {
    icon: Sparkles,
    category: "Creative Models",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    description:
      "Excellent for creative writing, storytelling, and artistic tasks",
    examples: [
      "Creative writing",
      "Storytelling",
      "Poetry",
      "Character creation",
    ],
    models: ["Claude models", "GPT-4", "Gemini Pro"],
  },
];

const usageTips = [
  {
    icon: Clock,
    title: "Speed vs Quality",
    tip: "Fast models are great for quick iterations. Smart models for final, polished work.",
  },
  {
    icon: DollarSign,
    title: "Cost Efficiency",
    tip: "Start with faster/cheaper models for initial drafts, then use premium models for refinement.",
  },
  {
    icon: Settings,
    title: "Switch Anytime",
    tip: "You can change models mid-conversation without losing context.",
  },
];

export function ModelQuickGuide({ className }: ModelQuickGuideProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "text-slate-400 hover:text-white hover:bg-slate-700/50 p-1 h-8 w-8",
            className
          )}
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[480px] p-0 bg-slate-800 border-slate-700 shadow-xl"
        align="end"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700">
          <h3 className="font-semibold text-lg text-white mb-1">
            🤖 Model Selection Guide
          </h3>
          <p className="text-sm text-slate-300">
            Choose the right AI for your task
          </p>
        </div>

        <div className="p-4 max-h-[500px] overflow-y-auto space-y-4">
          {/* Model Categories */}
          <div className="space-y-3">
            <h4 className="font-medium text-white text-sm">Model Categories</h4>
            {modelTips.map((tip) => (
              <Card
                key={tip.category}
                className={cn(
                  "border-slate-700/50 transition-all duration-200",
                  tip.bg
                )}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <tip.icon className={cn("h-5 w-5", tip.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-white text-sm mb-1">
                        {tip.category}
                      </h5>
                      <p className="text-xs text-slate-300 mb-2">
                        {tip.description}
                      </p>

                      {/* Best for examples */}
                      <div className="mb-2">
                        <span className="text-xs font-medium text-slate-400">
                          Best for:{" "}
                        </span>
                        <span className="text-xs text-slate-300">
                          {tip.examples.join(", ")}
                        </span>
                      </div>

                      {/* Example models */}
                      <div className="flex flex-wrap gap-1">
                        {tip.models.map((model, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-2 py-0.5 bg-slate-700/50 text-xs text-slate-300 rounded"
                          >
                            {model}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Usage Tips */}
          <div className="space-y-3">
            <h4 className="font-medium text-white text-sm">💡 Pro Tips</h4>
            {usageTips.map((tip, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg"
              >
                <tip.icon className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-white text-xs">
                    {tip.title}:{" "}
                  </span>
                  <span className="text-xs text-slate-300">{tip.tip}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Customization tip */}
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <div className="flex items-start gap-2">
              <Settings className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-emerald-400 text-xs">
                  Customize Your Library:{" "}
                </span>
                <span className="text-xs text-slate-300">
                  Enable/disable specific models in settings to create your
                  perfect AI toolkit.
                </span>
              </div>
            </div>
          </div>

          {/* Link to full model settings */}
          <div className="pt-2 border-t border-slate-700">
            <Link href="/settings/models">
              <Button
                variant="ghost"
                className="w-full justify-between text-slate-300 hover:text-white hover:bg-slate-700/50"
                onClick={() => setIsOpen(false)}
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span>Manage Model Library</span>
                </div>
              </Button>
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
