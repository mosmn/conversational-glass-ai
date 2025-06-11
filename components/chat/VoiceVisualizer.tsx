import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface VoiceVisualizerProps {
  volume: number; // 0 to 1
  isActive: boolean;
  className?: string;
  barCount?: number;
  size?: "sm" | "md" | "lg";
}

export function VoiceVisualizer({
  volume,
  isActive,
  className = "",
  barCount = 5,
  size = "md",
}: VoiceVisualizerProps) {
  const prevVolumeRef = useRef(volume);

  // Smooth volume changes
  useEffect(() => {
    prevVolumeRef.current = volume;
  }, [volume]);

  // Size configurations
  const sizeConfig = {
    sm: { barWidth: "w-0.5", spacing: "gap-0.5", maxHeight: "h-6" },
    md: { barWidth: "w-1", spacing: "gap-1", maxHeight: "h-8" },
    lg: { barWidth: "w-1.5", spacing: "gap-1.5", maxHeight: "h-12" },
  };

  const config = sizeConfig[size];

  // Generate bars with different heights based on volume
  const generateBars = () => {
    const bars = [];

    for (let i = 0; i < barCount; i++) {
      // Create varying heights - center bars are tallest
      const centerIndex = Math.floor(barCount / 2);
      const distanceFromCenter = Math.abs(i - centerIndex);
      const baseHeight = Math.max(0.2, 1 - distanceFromCenter * 0.2);

      // Apply volume multiplier with some randomness for natural look
      const volumeMultiplier = isActive
        ? Math.max(0.1, volume + (Math.random() * 0.2 - 0.1))
        : 0.1;

      const finalHeight = baseHeight * volumeMultiplier;

      bars.push(
        <motion.div
          key={i}
          className={`${config.barWidth} bg-gradient-to-t rounded-full`}
          style={{
            background: isActive
              ? `linear-gradient(to top, 
                  ${
                    volume > 0.7
                      ? "#ef4444"
                      : volume > 0.4
                      ? "#f59e0b"
                      : "#10b981"
                  }, 
                  ${
                    volume > 0.7
                      ? "#fca5a5"
                      : volume > 0.4
                      ? "#fbbf24"
                      : "#6ee7b7"
                  })`
              : "linear-gradient(to top, #64748b, #94a3b8)",
          }}
          animate={{
            height: `${Math.max(8, finalHeight * 100)}%`,
            opacity: isActive ? 1 : 0.3,
          }}
          transition={{
            height: {
              duration: 0.1,
              ease: "easeOut",
              type: "spring",
              stiffness: 300,
              damping: 30,
            },
            opacity: { duration: 0.2 },
          }}
        />
      );
    }

    return bars;
  };

  return (
    <div
      className={`flex items-center justify-center ${config.spacing} ${config.maxHeight} ${className}`}
    >
      {/* Outer glow effect when active */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-xl"
          animate={{
            boxShadow:
              volume > 0.1
                ? `0 0 ${Math.max(10, volume * 30)}px ${
                    volume > 0.7
                      ? "#ef444450"
                      : volume > 0.4
                      ? "#f59e0b50"
                      : "#10b98150"
                  }`
                : "0 0 5px #64748b20",
          }}
          transition={{ duration: 0.1 }}
        />
      )}

      {/* Voice level bars */}
      <div
        className={`relative flex items-end ${config.spacing} ${config.maxHeight} z-10`}
      >
        {generateBars()}
      </div>

      {/* Pulse effect for very low volume */}
      {isActive && volume < 0.05 && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-blue-500/10 border border-blue-500/20"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
    </div>
  );
}

// Compact circular visualizer for buttons
export function VoiceVisualizerCircle({
  volume,
  isActive,
  className = "",
  size = "md",
}: Omit<VoiceVisualizerProps, "barCount">) {
  const sizeConfig = {
    sm: { size: "w-6 h-6", pulse: "w-8 h-8" },
    md: { size: "w-8 h-8", pulse: "w-10 h-10" },
    lg: { size: "w-12 h-12", pulse: "w-14 h-14" },
  };

  const config = sizeConfig[size];

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer pulse ring */}
      {isActive && volume > 0.1 && (
        <motion.div
          className={`absolute rounded-full border-2 ${config.pulse}`}
          style={{
            borderColor:
              volume > 0.7 ? "#ef4444" : volume > 0.4 ? "#f59e0b" : "#10b981",
          }}
          animate={{
            scale: [1, 1.2 + volume * 0.3],
            opacity: [0.8, 0],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      )}

      {/* Main circle */}
      <motion.div
        className={`${config.size} rounded-full relative overflow-hidden`}
        style={{
          background: isActive
            ? `radial-gradient(circle, 
                ${
                  volume > 0.7
                    ? "#ef4444"
                    : volume > 0.4
                    ? "#f59e0b"
                    : "#10b981"
                }, 
                ${
                  volume > 0.7
                    ? "#dc2626"
                    : volume > 0.4
                    ? "#d97706"
                    : "#059669"
                })`
            : "radial-gradient(circle, #64748b, #475569)",
        }}
        animate={{
          scale: isActive ? 1 + volume * 0.3 : 1,
          opacity: isActive ? 0.9 : 0.5,
        }}
        transition={{
          scale: { duration: 0.1, ease: "easeOut" },
          opacity: { duration: 0.2 },
        }}
      >
        {/* Inner animated waves */}
        {isActive && (
          <motion.div
            className="absolute inset-1 rounded-full"
            style={{
              background: `radial-gradient(circle, 
                transparent ${Math.max(20, 100 - volume * 60)}%, 
                white20 100%)`,
            }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
