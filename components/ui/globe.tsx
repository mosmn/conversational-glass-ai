"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface GlobeProps {
  className?: string;
  size?: number;
}

export const Globe = ({ className, size = 300 }: GlobeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = size * devicePixelRatio;
    canvas.height = size * devicePixelRatio;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10;

    let animationId: number;
    let rotation = 0;

    const dots = Array.from({ length: 200 }, () => ({
      x: Math.random() * 2 * Math.PI,
      y: Math.random() * Math.PI,
      opacity: Math.random() * 0.8 + 0.2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      // Draw globe outline
      ctx.strokeStyle = "rgba(59, 130, 246, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw dots
      dots.forEach((dot) => {
        const x = dot.x + rotation * 0.01;
        const y = dot.y;

        const sphereX = Math.cos(y) * Math.cos(x);
        const sphereY = Math.sin(y);
        const sphereZ = Math.cos(y) * Math.sin(x);

        if (sphereZ > 0) {
          const projectedX = centerX + sphereX * radius * 0.8;
          const projectedY = centerY + sphereY * radius * 0.8;

          ctx.fillStyle = `rgba(59, 130, 246, ${
            dot.opacity * (sphereZ + 0.5)
          })`;
          const dotSize = 2 * (sphereZ + 0.5);
          ctx.beginPath();
          ctx.arc(projectedX, projectedY, dotSize, 0, 2 * Math.PI);
          ctx.fill();
        }
      });

      rotation += 1;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("rounded-full", className)}
      style={{ width: size, height: size }}
    />
  );
};
