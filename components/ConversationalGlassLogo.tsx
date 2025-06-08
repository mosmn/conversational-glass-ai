"use client";

import React from "react";
import { motion } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  animated?: boolean;
  showText?: boolean;
  className?: string;
}

export default function ConversationalGlassLogo({
  size = "md",
  animated = true,
  showText = true,
  className = "",
}: LogoProps) {
  const sizeConfig = {
    sm: { container: "w-8 h-8", text: "text-sm", bubbleSize: "w-6 h-6" },
    md: { container: "w-12 h-12", text: "text-base", bubbleSize: "w-10 h-10" },
    lg: { container: "w-16 h-16", text: "text-lg", bubbleSize: "w-14 h-14" },
    xl: { container: "w-24 h-24", text: "text-2xl", bubbleSize: "w-20 h-20" },
  };

  const config = sizeConfig[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon */}
      <div className="relative w-12 h-12 flex items-center justify-center">
        <motion.div
          className="absolute w-10 h-10 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl border border-white/30 shadow-2xl"
          animate={
            animated
              ? {
                  scale: [1, 1.05, 1],
                  rotate: [0, 2, 0],
                }
              : {}
          }
          transition={{
            duration: 2,
            repeat: animated ? Infinity : 0,
            repeatDelay: 3,
          }}
        >
          <div className="absolute inset-2 flex items-center justify-center">
            <svg viewBox="0 0 32 32" className="w-full h-full text-white/60">
              <circle cx="8" cy="12" r="1.5" fill="currentColor" />
              <circle cx="16" cy="8" r="1.5" fill="currentColor" />
              <circle cx="24" cy="12" r="1.5" fill="currentColor" />
              <circle cx="12" cy="20" r="1.5" fill="currentColor" />
              <circle cx="20" cy="20" r="1.5" fill="currentColor" />
              <path
                d="M8 12 L16 8"
                stroke="currentColor"
                strokeWidth="0.5"
                opacity="0.4"
              />
              <path
                d="M16 8 L24 12"
                stroke="currentColor"
                strokeWidth="0.5"
                opacity="0.4"
              />
              <path
                d="M8 12 L12 20"
                stroke="currentColor"
                strokeWidth="0.5"
                opacity="0.4"
              />
              <path
                d="M24 12 L20 20"
                stroke="currentColor"
                strokeWidth="0.5"
                opacity="0.4"
              />
              <path
                d="M12 20 L20 20"
                stroke="currentColor"
                strokeWidth="0.5"
                opacity="0.4"
              />
            </svg>
          </div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-60" />
        </motion.div>

        <motion.div
          className="absolute -top-1 -left-2 w-4 h-4 rounded-full bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-md border border-white/40"
          animate={
            animated
              ? {
                  scale: [0.8, 1.2, 1],
                  y: [0, -2, 0],
                }
              : {}
          }
          transition={{
            duration: 2.5,
            repeat: animated ? Infinity : 0,
            delay: 0.5,
          }}
        />

        <motion.div
          className="absolute -bottom-2 -right-1 w-3 h-3 rounded-full bg-gradient-to-br from-white/25 to-white/5 backdrop-blur-md border border-white/30"
          animate={
            animated
              ? {
                  scale: [0.9, 1.1, 1],
                  x: [0, 1, 0],
                }
              : {}
          }
          transition={{
            duration: 2.2,
            repeat: animated ? Infinity : 0,
            delay: 1,
          }}
        />
      </div>

      {/* Logo Text */}
      {showText && (
        <motion.div
          className="flex flex-col"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <div className="font-bold text-white leading-tight text-base">
            <span className="bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
              Convo
            </span>
          </div>
          <div className="font-light text-white/80 leading-tight text-sm">
            <span className="bg-gradient-to-r from-white/80 to-white/60 bg-clip-text text-transparent">
              Glass AI
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Mini version for favicons or small spaces
export function ConversationalGlassLogoMini({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={`w-8 h-8 relative ${className}`}>
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl border border-white/30">
        <div className="absolute inset-2 flex items-center justify-center">
          <svg
            viewBox="0 0 16 16"
            className="w-full h-full text-white/70"
            fill="currentColor"
          >
            <circle cx="4" cy="6" r="1" />
            <circle cx="8" cy="4" r="1" />
            <circle cx="12" cy="6" r="1" />
            <circle cx="6" cy="10" r="1" />
            <circle cx="10" cy="10" r="1" />
          </svg>
        </div>
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-40" />
      </div>
    </div>
  );
}
