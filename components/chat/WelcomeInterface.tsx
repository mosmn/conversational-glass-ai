import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ConversationalGlassLogo from "@/components/ConversationalGlassLogo";
import {
  getProviderIcon,
  getProviderColor,
  getProviderDisplayName,
} from "@/lib/utils/provider-icons";

interface QuickAction {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
  prompts: string[];
}

interface WelcomeInterfaceProps {
  quickActions: QuickAction[];
  onPromptSelect: (prompt: string) => void;
}

// AI Glass Cup Component
function AIGlassCup() {
  const [isHovered, setIsHovered] = useState(false);

  // Available AI providers with their positions in the glass
  const providers = [
    {
      name: "openai",
      x: "30%",
      y: "25%",
      delay: "0s",
      size: "w-8 h-8",
      orbitRadius: 120,
      orbitAngle: 0,
    },
    {
      name: "anthropic",
      x: "65%",
      y: "35%",
      delay: "0.5s",
      size: "w-7 h-7",
      orbitRadius: 110,
      orbitAngle: 51,
    },
    {
      name: "google",
      x: "45%",
      y: "45%",
      delay: "1s",
      size: "w-6 h-6",
      orbitRadius: 100,
      orbitAngle: 102,
    },
    {
      name: "groq",
      x: "25%",
      y: "55%",
      delay: "1.5s",
      size: "w-7 h-7",
      orbitRadius: 130,
      orbitAngle: 153,
    },
    {
      name: "meta",
      x: "70%",
      y: "60%",
      delay: "2s",
      size: "w-6 h-6",
      orbitRadius: 115,
      orbitAngle: 204,
    },
    {
      name: "nvidia",
      x: "40%",
      y: "70%",
      delay: "2.5s",
      size: "w-6 h-6",
      orbitRadius: 105,
      orbitAngle: 255,
    },
    {
      name: "openrouter",
      x: "55%",
      y: "25%",
      delay: "3s",
      size: "w-5 h-5",
      orbitRadius: 125,
      orbitAngle: 306,
    },
  ];

  return (
    <div
      className="relative mx-auto mb-8 transition-all duration-700 ease-out hover:scale-105 group cursor-pointer"
      style={{
        width: "300px",
        height: "400px",
        filter: isHovered
          ? "drop-shadow(0 0 30px rgba(16, 185, 129, 0.3))"
          : "none",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glass Cup */}
      <div className="relative w-full h-full">
        {/* Cup Body - Trapezoid shape */}
        <div
          className={`absolute bottom-0 bg-gradient-to-br from-slate-100/10 via-slate-200/5 to-slate-300/10 backdrop-blur-md border-2 rounded-b-[40px] shadow-2xl transition-all duration-500 ease-out ${
            isHovered
              ? "border-emerald-400/50 shadow-[0_0_40px_rgba(16,185,129,0.2)] transform rotate-2"
              : "border-slate-300/30"
          }`}
          style={{
            width: "200px",
            height: "320px",
            left: "50px",
            clipPath: "polygon(15% 0%, 85% 0%, 95% 100%, 5% 100%)",
            background: isHovered
              ? `
              linear-gradient(135deg, 
                rgba(16, 185, 129, 0.15) 0%,
                rgba(255,255,255,0.1) 25%,
                rgba(255,255,255,0.05) 50%,
                rgba(255,255,255,0.1) 75%,
                rgba(16, 185, 129, 0.15) 100%
              )
            `
              : `
              linear-gradient(135deg, 
                rgba(255,255,255,0.1) 0%,
                rgba(255,255,255,0.05) 25%,
                rgba(255,255,255,0.02) 50%,
                rgba(255,255,255,0.05) 75%,
                rgba(255,255,255,0.1) 100%
              )
            `,
          }}
        >
          {/* Glass Reflection */}
          <div
            className="absolute top-0 left-0 w-full h-full opacity-30"
            style={{
              background: `
                linear-gradient(45deg, 
                  transparent 30%,
                  rgba(255,255,255,0.4) 40%,
                  rgba(255,255,255,0.6) 45%,
                  rgba(255,255,255,0.4) 50%,
                  transparent 60%
                )
              `,
            }}
          />

          {/* Highlight on left edge */}
          <div className="absolute left-0 top-0 w-2 h-full bg-gradient-to-b from-white/50 via-white/20 to-transparent rounded-l-sm" />

          {/* AI Provider Icons floating inside the glass */}
          {providers.map((provider, index) => {
            const ProviderIcon = getProviderIcon(provider.name);
            const color = getProviderColor(provider.name);

            // Calculate orbital position when hovered
            const centerX = 150; // Cup center X
            const centerY = 200; // Cup center Y
            const orbitX =
              centerX +
              Math.cos((provider.orbitAngle * Math.PI) / 180) *
                provider.orbitRadius;
            const orbitY =
              centerY +
              Math.sin((provider.orbitAngle * Math.PI) / 180) *
                provider.orbitRadius;

            return (
              <div
                key={provider.name}
                className={`absolute ${
                  provider.size
                } flex items-center justify-center rounded-lg backdrop-blur-sm transition-all duration-700 ease-out ${
                  isHovered ? "animate-bounce" : "animate-pulse"
                }`}
                style={{
                  left: isHovered ? `${orbitX}px` : provider.x,
                  top: isHovered ? `${orbitY}px` : provider.y,
                  animationDelay: isHovered
                    ? `${index * 0.1}s`
                    : provider.delay,
                  animationDuration: isHovered ? "2s" : "3s",
                  background: isHovered
                    ? `radial-gradient(circle, ${color}40 0%, ${color}20 50%, transparent 100%)`
                    : `radial-gradient(circle, ${color}20 0%, ${color}10 50%, transparent 100%)`,
                  border: isHovered
                    ? `2px solid ${color}80`
                    : `1px solid ${color}40`,
                  transform: isHovered
                    ? "translateZ(0) scale(1.2)"
                    : "translateZ(0)",
                  zIndex: isHovered ? 50 : 10,
                  boxShadow: isHovered ? `0 0 20px ${color}60` : "none",
                }}
              >
                <ProviderIcon
                  className={`w-full h-full p-1 transition-all duration-300 ${
                    isHovered ? "animate-spin" : ""
                  }`}
                  style={{
                    color,
                    filter: isHovered ? "brightness(1.5)" : "brightness(1)",
                  }}
                />

                {/* Floating animation */}
                <div
                  className={`absolute inset-0 rounded-lg transition-opacity duration-500 ${
                    isHovered ? "opacity-80" : "opacity-50"
                  }`}
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${color}${
                      isHovered ? "50" : "30"
                    }, transparent 70%)`,
                    animation: `float-${provider.name} ${
                      isHovered ? "2s" : "4s"
                    } ease-in-out infinite`,
                    animationDelay: provider.delay,
                  }}
                />

                {/* Particle trail effect on hover */}
                {isHovered && (
                  <div
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{
                      background: `radial-gradient(circle, ${color}30, transparent 70%)`,
                      animationDelay: `${index * 0.2}s`,
                      animationDuration: "1.5s",
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* Liquid level indicator */}
          <div
            className={`absolute left-2 right-2 rounded-full backdrop-blur-sm transition-all duration-700 ease-out ${
              isHovered ? "bottom-4 h-8 animate-pulse" : "bottom-8 h-1"
            }`}
            style={{
              background: isHovered
                ? `
                linear-gradient(90deg,
                  rgba(16, 185, 129, 0.8) 0%,
                  rgba(20, 184, 166, 0.7) 33%,
                  rgba(59, 130, 246, 0.7) 66%,
                  rgba(147, 51, 234, 0.8) 100%
                )
              `
                : `
                linear-gradient(90deg,
                  rgba(16, 185, 129, 0.4) 0%,
                  rgba(20, 184, 166, 0.4) 33%,
                  rgba(59, 130, 246, 0.4) 66%,
                  rgba(147, 51, 234, 0.4) 100%
                )
              `,
              boxShadow: isHovered
                ? "0 0 20px rgba(16, 185, 129, 0.5)"
                : "none",
            }}
          />

          {/* Bubble effects on hover */}
          {isHovered && (
            <>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={`bubble-${i}`}
                  className="absolute w-2 h-2 bg-emerald-400/60 rounded-full animate-bounce"
                  style={{
                    left: `${20 + i * 12}%`,
                    bottom: `${30 + Math.random() * 40}px`,
                    animationDelay: `${i * 0.3}s`,
                    animationDuration: `${2 + Math.random()}s`,
                  }}
                />
              ))}
            </>
          )}
        </div>

        {/* Cup Handle */}
        <div
          className={`absolute right-6 border-2 rounded-full backdrop-blur-sm transition-all duration-300 ${
            isHovered
              ? "border-emerald-400/60 animate-pulse transform -rotate-3"
              : "border-slate-300/40"
          }`}
          style={{
            width: "50px",
            height: "80px",
            top: "140px",
            background: isHovered
              ? "linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(255,255,255,0.05))"
              : "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
          }}
        >
          {/* Handle inner curve */}
          <div
            className={`absolute inset-2 border rounded-full transition-colors duration-300 ${
              isHovered ? "border-emerald-400/40" : "border-slate-300/20"
            }`}
          />

          {/* Handle highlight */}
          <div
            className={`absolute left-0 top-2 w-1 h-16 rounded-l-full transition-all duration-300 ${
              isHovered
                ? "bg-gradient-to-b from-emerald-400/60 to-transparent"
                : "bg-gradient-to-b from-white/40 to-transparent"
            }`}
          />
        </div>

        {/* Cup Rim */}
        <div
          className="absolute top-0 bg-gradient-to-r from-slate-200/20 via-slate-100/30 to-slate-200/20 border border-slate-300/40 backdrop-blur-sm shadow-lg"
          style={{
            width: "180px",
            height: "12px",
            left: "60px",
            borderRadius: "50%",
            background: `
              linear-gradient(180deg,
                rgba(255,255,255,0.3) 0%,
                rgba(255,255,255,0.1) 50%,
                rgba(255,255,255,0.05) 100%
              )
            `,
          }}
        />

        {/* Steam effect */}
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`absolute rounded-full transition-all duration-500 ${
                isHovered
                  ? "w-2 h-20 bg-gradient-to-t from-emerald-400/40 via-white/30 to-transparent animate-bounce"
                  : "w-1 h-12 bg-gradient-to-t from-white/20 to-transparent animate-pulse"
              }`}
              style={{
                left: `${(i - 2) * 15}px`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: isHovered ? "1s" : "2s",
                filter: "blur(1px)",
              }}
            />
          ))}

          {/* Extra steam wisps on hover */}
          {isHovered &&
            [4, 5, 6, 7].map((i) => (
              <div
                key={`extra-steam-${i}`}
                className="absolute w-1 h-16 bg-gradient-to-t from-teal-400/30 to-transparent rounded-full animate-ping"
                style={{
                  left: `${(i - 5) * 10}px`,
                  top: "-10px",
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: "1.5s",
                  filter: "blur(2px)",
                }}
              />
            ))}
        </div>
      </div>

      {/* Base reflection */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-4 bg-gradient-radial from-slate-300/10 to-transparent rounded-full blur-sm" />

      {/* Floating particles around the cup */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={`particle-${i}`}
          className={`absolute rounded-full opacity-60 transition-all duration-500 ${
            isHovered
              ? "w-2 h-2 bg-gradient-to-r from-emerald-400 to-cyan-400 animate-bounce shadow-[0_0_10px_rgba(16,185,129,0.8)]"
              : "w-1 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 animate-ping"
          }`}
          style={{
            left: `${20 + i * 15}%`,
            top: `${30 + i * 10}%`,
            animationDelay: `${i * 0.8}s`,
            animationDuration: isHovered ? "1s" : "3s",
          }}
        />
      ))}

      {/* Magical sparkles on hover */}
      {isHovered && (
        <>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div
              key={`sparkle-${i}`}
              className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: "2s",
                boxShadow: "0 0 6px rgba(255, 255, 255, 0.8)",
              }}
            />
          ))}

          {/* Magical rings */}
          <div
            className="absolute inset-0 border border-emerald-400/30 rounded-full animate-ping"
            style={{
              animationDuration: "3s",
              animationDelay: "0.5s",
            }}
          />
          <div
            className="absolute inset-4 border border-cyan-400/20 rounded-full animate-ping"
            style={{
              animationDuration: "2s",
              animationDelay: "1s",
            }}
          />
        </>
      )}
    </div>
  );
}

export function WelcomeInterface({
  quickActions,
  onPromptSelect,
}: WelcomeInterfaceProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const getPromptsForCategory = () => {
    if (!selectedCategory) return [];
    const action = quickActions.find((a) => a.title === selectedCategory);
    return action ? action.prompts : [];
  };

  return (
    <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8 px-4 sm:px-0">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex justify-center">
          <ConversationalGlassLogo
            size="lg"
            animated={true}
            showText={true}
            className="mb-2 sm:mb-4 scale-75 sm:scale-100"
          />
        </div>

        {/* AI Glass Cup */}
        <AIGlassCup />

        <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400 bg-clip-text text-transparent">
          Your AI Models in a Glass
        </h1>
        <p className="text-base sm:text-lg text-slate-300">
          Mix and match different AI providers for the perfect conversation
          blend
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {quickActions.map((action) => (
          <Card
            key={action.title}
            className={`bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 hover:border-slate-600 transition-all duration-200 cursor-pointer group ${
              selectedCategory === action.title ? "ring-2 ring-emerald-500" : ""
            }`}
            onClick={() => setSelectedCategory(action.title)}
          >
            <CardContent className="p-3 sm:p-6 text-center">
              <action.icon
                className={`h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 sm:mb-3 text-${action.color}-400 group-hover:scale-110 transition-transform`}
              />
              <h3 className="font-semibold mb-1 sm:mb-2 text-white text-sm sm:text-base">
                {action.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                {action.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category-Specific Prompts */}
      {selectedCategory && (
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold text-white">
            Suggested {selectedCategory} Prompts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
            {getPromptsForCategory().map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                className="border-slate-600 hover:border-emerald-500 hover:bg-emerald-600/10 text-left justify-start h-auto p-3 sm:p-4 text-slate-200 hover:text-white"
                onClick={() => onPromptSelect(prompt)}
              >
                <div className="text-xs sm:text-sm">{prompt}</div>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
