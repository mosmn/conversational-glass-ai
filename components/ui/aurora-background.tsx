"use client";

import { cn } from "@/lib/utils";
import React, { ReactNode } from "react";

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col items-center justify-center bg-zinc-50 text-slate-950 transition-bg dark:bg-zinc-900 dark:text-slate-50",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={cn(
            `
            [--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)]
            [--dark-gradient:repeating-linear-gradient(100deg,var(--black)_0%,var(--black)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--black)_16%)]
            [--aurora:repeating-linear-gradient(100deg,var(--blue-500)_10%,var(--indigo-300)_15%,var(--blue-300)_20%,var(--violet-200)_25%,var(--blue-400)_30%)]
            [background-image:var(--white-gradient),var(--aurora)]
            [background-size:300%,_200%]
            [background-position:50%_50%,50%_50%]
            filter blur-[10px] invert-0 
            after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-[rgba(255,255,255,0.8)] after:to-transparent after:mix-blend-difference
            dark:bg-[color:var(--dark-gradient),var(--aurora)]
            dark:filter dark:blur-[10px] dark:invert-0
            dark:after:bg-gradient-to-r dark:after:from-transparent dark:after:via-[rgba(0,0,0,0.8)] dark:after:to-transparent
            `,
            showRadialGradient &&
              `[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]`
          )}
          style={
            {
              "--white": "#ffffff",
              "--black": "#000000",
              "--transparent": "transparent",
              "--blue-500": "#3b82f6",
              "--indigo-300": "#a5b4fc",
              "--blue-300": "#93c5fd",
              "--violet-200": "#ddd6fe",
              "--blue-400": "#60a5fa",
            } as React.CSSProperties
          }
        ></div>
      </div>
      {children}
    </div>
  );
};
