"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  User,
  Clock,
  Brain,
  Key,
  Paperclip,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SettingsNavigationProps {
  currentSection: string;
  onNavigate?: () => void;
}

const navigationItems = [
  {
    id: "customize",
    title: "Customize",
    href: "/settings/customize",
    icon: User,
    description: "Personal settings and AI customization",
    color: "emerald",
  },
  {
    id: "history",
    title: "History",
    href: "/settings/history",
    icon: Clock,
    description: "Chat history and data management",
    color: "blue",
  },
  {
    id: "models",
    title: "Models",
    href: "/settings/models",
    icon: Brain,
    description: "AI model selection and configuration",
    color: "purple",
  },
  {
    id: "api-keys",
    title: "API Keys",
    href: "/settings/api-keys",
    icon: Key,
    description: "Bring your own API keys",
    color: "amber",
  },
  {
    id: "attachments",
    title: "Attachments",
    href: "/settings/attachments",
    icon: Paperclip,
    description: "File attachments and storage",
    color: "teal",
  },
];

const colorClasses = {
  emerald: {
    active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    hover: "hover:text-emerald-400 hover:bg-emerald-500/5",
    icon: "text-emerald-400",
  },
  blue: {
    active: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    hover: "hover:text-blue-400 hover:bg-blue-500/5",
    icon: "text-blue-400",
  },
  purple: {
    active: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    hover: "hover:text-purple-400 hover:bg-purple-500/5",
    icon: "text-purple-400",
  },
  amber: {
    active: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    hover: "hover:text-amber-400 hover:bg-amber-500/5",
    icon: "text-amber-400",
  },
  teal: {
    active: "text-teal-400 bg-teal-500/10 border-teal-500/30",
    hover: "hover:text-teal-400 hover:bg-teal-500/5",
    icon: "text-teal-400",
  },
};

export function SettingsNavigation({
  currentSection,
  onNavigate,
}: SettingsNavigationProps) {
  return (
    <div className="space-y-2 py-4">
      {/* Section Title */}
      <div className="flex items-center gap-2 px-3 mb-4">
        <Sparkles className="h-4 w-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-400 uppercase tracking-wide">
          Configuration
        </span>
      </div>

      {/* Navigation Items */}
      <div className="space-y-2">
        {navigationItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          const colors = colorClasses[item.color as keyof typeof colorClasses];

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="relative group"
            >
              {/* Glow effect for active item */}
              {isActive && (
                <motion.div
                  layoutId="activeGlow"
                  className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-xl blur-sm opacity-70"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 group-hover:scale-[1.02]",
                  isActive
                    ? "bg-slate-800/60 backdrop-blur-sm border-slate-600/50 text-white shadow-lg"
                    : "bg-slate-800/20 backdrop-blur-sm border-slate-700/30 text-slate-300 hover:bg-slate-800/40 hover:border-slate-600/50",
                  colors.hover
                )}
              >
                {/* Icon Container */}
                <motion.div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300",
                    isActive
                      ? colors.active
                      : "bg-slate-700/50 border border-slate-600/50"
                  )}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors duration-300",
                      isActive
                        ? colors.icon
                        : "text-slate-400 group-hover:text-slate-300"
                    )}
                  />
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-sm font-semibold transition-colors duration-300 mb-1",
                      isActive
                        ? "text-white"
                        : "text-slate-300 group-hover:text-white"
                    )}
                  >
                    {item.title}
                  </div>
                  <div className="text-xs text-slate-500 leading-tight">
                    {item.description}
                  </div>
                </div>

                {/* Active Indicator */}
                {isActive && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    className="w-2 h-8 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"
                  />
                )}

                {/* Hover Indicator */}
                {!isActive && (
                  <div className="w-1 h-6 bg-slate-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
