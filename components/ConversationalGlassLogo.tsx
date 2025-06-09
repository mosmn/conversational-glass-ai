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
    sm: {
      container: "w-8 h-8",
      text: "text-sm",
      logoContainer: "w-8 h-8",
      textContainer: "ml-2",
    },
    md: {
      container: "w-12 h-12",
      text: "text-base",
      logoContainer: "w-12 h-12",
      textContainer: "ml-3",
    },
    lg: {
      container: "w-16 h-16",
      text: "text-lg",
      logoContainer: "w-16 h-16",
      textContainer: "ml-4",
    },
    xl: {
      container: "w-24 h-24",
      text: "text-2xl",
      logoContainer: "w-24 h-24",
      textContainer: "ml-6",
    },
  };

  const config = sizeConfig[size];

  return (
    <div className={`flex items-center ${className}`}>
      {/* Logo Icon */}
      <div
        className={`relative ${config.logoContainer} flex items-center justify-center`}
      >
        {/* Main Glass Container */}
        <motion.div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-800/40 via-slate-700/30 to-slate-900/50 backdrop-blur-xl border border-slate-600/30 shadow-2xl shadow-black/20`}
          style={{
            background: `
              linear-gradient(135deg, 
                rgba(16, 185, 129, 0.15) 0%, 
                rgba(20, 184, 166, 0.1) 25%,
                rgba(6, 182, 212, 0.08) 50%,
                rgba(30, 41, 59, 0.4) 75%,
                rgba(15, 23, 42, 0.6) 100%
              )
            `,
          }}
          animate={
            animated
              ? {
                  scale: [1, 1.02, 1],
                  rotateY: [0, 5, 0],
                }
              : {}
          }
          transition={{
            duration: 4,
            repeat: animated ? Infinity : 0,
            ease: "easeInOut",
          }}
        >
          {/* Inner Glow */}
          <div className="absolute inset-1 rounded-xl bg-gradient-to-br from-emerald-400/20 via-teal-400/10 to-transparent opacity-60" />
        </motion.div>

        {/* Conversation Flow Elements */}
        <div className="relative z-10 w-full h-full flex items-center justify-center">
          {/* Central AI Node */}
          <motion.div
            className="absolute w-2 h-2 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full shadow-lg shadow-emerald-400/50"
            animate={
              animated
                ? {
                    scale: [1, 1.2, 1],
                    opacity: [0.8, 1, 0.8],
                  }
                : {}
            }
            transition={{
              duration: 2,
              repeat: animated ? Infinity : 0,
              ease: "easeInOut",
            }}
          />

          {/* Floating Conversation Bubbles */}
          {[
            { x: "-25%", y: "-30%", delay: 0, size: "w-1.5 h-1.5" },
            { x: "25%", y: "-20%", delay: 0.5, size: "w-1 h-1" },
            { x: "-20%", y: "25%", delay: 1, size: "w-1.5 h-1.5" },
            { x: "30%", y: "20%", delay: 1.5, size: "w-1 h-1" },
          ].map((bubble, index) => (
            <motion.div
              key={index}
              className={`absolute ${bubble.size} bg-gradient-to-br from-cyan-400/80 to-emerald-400/60 rounded-full`}
              style={{
                left: `calc(50% + ${bubble.x})`,
                top: `calc(50% + ${bubble.y})`,
                boxShadow: "0 0 8px rgba(16, 185, 129, 0.4)",
              }}
              animate={
                animated
                  ? {
                      y: [-2, 2, -2],
                      x: [-1, 1, -1],
                      opacity: [0.6, 1, 0.6],
                      scale: [0.8, 1, 0.8],
                    }
                  : {}
              }
              transition={{
                duration: 3 + index * 0.5,
                repeat: animated ? Infinity : 0,
                delay: bubble.delay,
                ease: "easeInOut",
              }}
            />
          ))}

          {/* Connection Lines/Streams */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            style={{ overflow: "visible" }}
          >
            <defs>
              <linearGradient
                id="streamGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="rgba(16, 185, 129, 0.3)" />
                <stop offset="50%" stopColor="rgba(20, 184, 166, 0.5)" />
                <stop offset="100%" stopColor="rgba(6, 182, 212, 0.2)" />
              </linearGradient>
            </defs>

            {/* Curved connection paths */}
            <motion.path
              d="M25,35 Q50,50 75,30"
              stroke="url(#streamGradient)"
              strokeWidth="0.5"
              fill="none"
              opacity="0.7"
              animate={
                animated
                  ? {
                      pathLength: [0, 1, 0],
                      opacity: [0.3, 0.8, 0.3],
                    }
                  : {}
              }
              transition={{
                duration: 3,
                repeat: animated ? Infinity : 0,
                ease: "easeInOut",
              }}
            />
            <motion.path
              d="M30,70 Q50,50 70,75"
              stroke="url(#streamGradient)"
              strokeWidth="0.5"
              fill="none"
              opacity="0.7"
              animate={
                animated
                  ? {
                      pathLength: [0, 1, 0],
                      opacity: [0.3, 0.8, 0.3],
                    }
                  : {}
              }
              transition={{
                duration: 3.5,
                repeat: animated ? Infinity : 0,
                delay: 0.5,
                ease: "easeInOut",
              }}
            />
          </svg>
        </div>

        {/* Outer Ring Glow */}
        <motion.div
          className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-400/10 blur-sm opacity-0"
          animate={
            animated
              ? {
                  opacity: [0, 0.6, 0],
                }
              : {}
          }
          transition={{
            duration: 3,
            repeat: animated ? Infinity : 0,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Logo Text */}
      {showText && (
        <motion.div
          className={`${config.textContainer} flex flex-col`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <div className={`font-bold ${config.text} leading-tight`}>
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              Convo
            </span>
          </div>
          <div
            className={`font-light leading-tight ${
              size === "sm"
                ? "text-xs"
                : size === "md"
                ? "text-sm"
                : size === "lg"
                ? "text-base"
                : "text-lg"
            }`}
          >
            <span className="bg-gradient-to-r from-slate-300 to-slate-400 bg-clip-text text-transparent">
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
      {/* Main Glass Container */}
      <div
        className="absolute inset-0 rounded-lg backdrop-blur-xl border border-slate-600/30 shadow-lg shadow-black/20"
        style={{
          background: `
            linear-gradient(135deg, 
              rgba(16, 185, 129, 0.15) 0%, 
              rgba(30, 41, 59, 0.4) 50%,
              rgba(15, 23, 42, 0.6) 100%
            )
          `,
        }}
      >
        {/* Inner Glow */}
        <div className="absolute inset-0.5 rounded-md bg-gradient-to-br from-emerald-400/20 via-teal-400/10 to-transparent opacity-60" />

        {/* Central Elements */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full shadow-sm shadow-emerald-400/50" />
          {/* Small bubbles */}
          <div className="absolute top-2 left-2 w-0.5 h-0.5 bg-cyan-400/80 rounded-full" />
          <div className="absolute bottom-2 right-2 w-0.5 h-0.5 bg-emerald-400/80 rounded-full" />
        </div>
      </div>
    </div>
  );
}
