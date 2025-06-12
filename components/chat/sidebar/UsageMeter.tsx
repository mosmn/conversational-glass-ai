"use client";

import React from "react";
import { Progress } from "@/components/ui/progress";

interface UsageMeterProps {
  usage: number;
}

export function UsageMeter({ usage }: UsageMeterProps) {
  return (
    <div className="flex-shrink-0 p-6 border-t border-slate-700/30">
      <div className="mb-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Usage this month</span>
          <span className="text-emerald-400">{usage}%</span>
        </div>
        <Progress value={usage} className="h-2 bg-slate-700" />
      </div>
      <p className="text-xs text-slate-500">Resets in 12 days</p>
    </div>
  );
}
