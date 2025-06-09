"use client";

import React, { useId, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SparklesProps {
  id?: string;
  className?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  particleDensity?: number;
  particleColor?: string;
  particleSpeed?: number;
}

interface Star {
  id: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
}

export const Sparkles: React.FC<SparklesProps> = ({
  id,
  className,
  background = "transparent",
  minSize = 1,
  maxSize = 3,
  particleDensity = 120,
  particleColor = "#FFF",
  particleSpeed = 1,
}) => {
  const [stars, setStars] = useState<Star[]>([]);
  const generatedId = useId();
  const sparklesId = id || generatedId;

  useEffect(() => {
    const generateStars = () => {
      const newStars: Star[] = [];
      for (let i = 0; i < particleDensity; i++) {
        newStars.push({
          id: `star-${i}`,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * (maxSize - minSize) + minSize,
          opacity: Math.random(),
          twinkleSpeed: Math.random() * 3 + 1,
        });
      }
      setStars(newStars);
    };

    generateStars();
  }, [particleDensity, minSize, maxSize]);

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden", className)}
      style={{ background }}
    >
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: particleColor,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: star.twinkleSpeed,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};
