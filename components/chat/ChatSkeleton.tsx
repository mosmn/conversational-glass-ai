import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";
import { motion } from "framer-motion";

interface ChatSkeletonProps {
  messageCount?: number;
  showWelcome?: boolean;
}

// Enhanced smooth animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
      staggerChildren: 0.15,
    },
  },
};

const messageVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.46, 0.45, 0.94], // Custom cubic-bezier for smoothness
      staggerChildren: 0.1,
    },
  },
};

const skeletonVariants = {
  hidden: {
    opacity: 0,
    scaleX: 0.8,
  },
  visible: {
    opacity: 1,
    scaleX: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

const avatarVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    rotate: -10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      duration: 0.7,
      ease: "easeOut",
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
};

// Enhanced Skeleton component with smoother pulse
const SmoothSkeleton = ({
  className,
  ...props
}: React.ComponentProps<typeof Skeleton>) => (
  <motion.div
    variants={skeletonVariants}
    className={`animate-pulse rounded-md bg-gradient-to-r from-slate-600/30 via-slate-500/40 to-slate-600/30 bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite] ${className}`}
    style={{
      animation: "shimmer 2.5s ease-in-out infinite",
      backgroundImage:
        "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
    }}
    {...props}
  />
);

export function ChatSkeleton({
  messageCount = 3,
  showWelcome = false,
}: ChatSkeletonProps) {
  if (showWelcome) {
    return <WelcomeSkeleton />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 sm:space-y-8 max-w-4xl mx-auto"
    >
      {[...Array(messageCount)].map((_, i) => (
        <motion.div key={i} variants={messageVariants} className="space-y-6">
          {/* User Message Skeleton */}
          <motion.div
            className="flex justify-end items-start gap-3"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="flex flex-col items-end space-y-2 max-w-[85%] sm:max-w-lg">
              <motion.div
                className="bg-slate-700/30 backdrop-blur-sm rounded-2xl rounded-br-md p-3 sm:p-4 border border-slate-600/30"
                whileHover={{
                  backgroundColor: "rgba(51, 65, 85, 0.4)",
                  borderColor: "rgba(100, 116, 139, 0.4)",
                }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-2.5">
                  <SmoothSkeleton className="h-4 w-full" />
                  <SmoothSkeleton className="h-4 w-3/4" />
                  {Math.random() > 0.5 && (
                    <SmoothSkeleton className="h-4 w-1/2" />
                  )}
                </div>
              </motion.div>
              <motion.div
                variants={skeletonVariants}
                className="flex items-center gap-2 text-xs text-slate-500"
              >
                <SmoothSkeleton className="h-3 w-12" />
              </motion.div>
            </div>
            <motion.div variants={avatarVariants}>
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 ring-2 ring-slate-600/20">
                <AvatarFallback className="bg-slate-700/50 border border-slate-600/30">
                  <User className="h-4 w-4 text-slate-400" />
                </AvatarFallback>
              </Avatar>
            </motion.div>
          </motion.div>

          {/* Assistant Message Skeleton */}
          <motion.div
            className="flex justify-start items-start gap-3"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <motion.div variants={avatarVariants}>
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 ring-2 ring-emerald-500/20">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30">
                  <Bot className="h-4 w-4 text-emerald-400" />
                </AvatarFallback>
              </Avatar>
            </motion.div>
            <div className="flex flex-col space-y-2 max-w-[85%] sm:max-w-2xl">
              <motion.div
                className="bg-slate-800/30 backdrop-blur-sm rounded-2xl rounded-bl-md p-3 sm:p-4 border border-slate-700/30"
                whileHover={{
                  backgroundColor: "rgba(30, 41, 59, 0.4)",
                  borderColor: "rgba(51, 65, 85, 0.4)",
                }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-3">
                  <SmoothSkeleton className="h-4 w-full" />
                  <SmoothSkeleton className="h-4 w-11/12" />
                  <SmoothSkeleton className="h-4 w-4/5" />
                  {Math.random() > 0.3 && (
                    <motion.div
                      variants={skeletonVariants}
                      className="pt-1 space-y-2"
                    >
                      <SmoothSkeleton className="h-4 w-3/4" />
                      <SmoothSkeleton className="h-4 w-5/6" />
                    </motion.div>
                  )}
                  {Math.random() > 0.7 && (
                    <motion.div
                      variants={skeletonVariants}
                      className="pt-2 space-y-2"
                    >
                      <SmoothSkeleton className="h-20 w-full rounded-lg" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
              <motion.div
                variants={skeletonVariants}
                className="flex items-center gap-2 text-xs text-slate-500"
              >
                <SmoothSkeleton className="h-3 w-16" />
                <span className="text-slate-600">•</span>
                <SmoothSkeleton className="h-3 w-8" />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      ))}
    </motion.div>
  );
}

function WelcomeSkeleton() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center h-full p-6 sm:p-8"
    >
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Logo/Title Skeleton */}
        <motion.div variants={messageVariants} className="space-y-4">
          <SmoothSkeleton className="h-12 w-64 mx-auto" />
          <SmoothSkeleton className="h-6 w-96 mx-auto" />
        </motion.div>

        {/* Quick Actions Skeleton */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8"
        >
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              variants={messageVariants}
              whileHover={{
                scale: 1.05,
                backgroundColor: "rgba(30, 41, 59, 0.4)",
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 backdrop-blur-sm"
            >
              <div className="space-y-3">
                <SmoothSkeleton className="h-8 w-8 rounded-lg" />
                <SmoothSkeleton className="h-5 w-16" />
                <SmoothSkeleton className="h-4 w-full" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Suggested prompts skeleton */}
        <motion.div variants={containerVariants} className="space-y-3 mt-6">
          <motion.div variants={skeletonVariants}>
            <SmoothSkeleton className="h-5 w-32 mx-auto" />
          </motion.div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                variants={messageVariants}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <SmoothSkeleton className="h-10 w-full rounded-lg" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Enhanced typing indicator with smoother animations
export function TypingIndicatorSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="flex justify-start items-start gap-3 max-w-4xl mx-auto"
    >
      <motion.div
        initial={{ scale: 0.8, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          duration: 0.7,
          type: "spring",
          stiffness: 100,
          damping: 15,
        }}
      >
        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 ring-2 ring-emerald-500/20">
          <AvatarFallback className="bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30">
            <Bot className="h-4 w-4 text-emerald-400" />
          </AvatarFallback>
        </Avatar>
      </motion.div>
      <div className="flex flex-col space-y-2 max-w-[85%] sm:max-w-2xl">
        <motion.div
          className="bg-slate-800/30 backdrop-blur-sm rounded-2xl rounded-bl-md p-3 sm:p-4 border border-slate-700/30"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.6,
            ease: "easeOut",
            delay: 0.2,
          }}
        >
          <div className="flex items-center space-x-3">
            <div className="flex space-x-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-emerald-400 rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
            <motion.span
              className="text-sm text-slate-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              AI is thinking...
            </motion.span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Enhanced sidebar skeleton with smoother animations
export function SidebarSkeleton() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-3 p-4"
    >
      {/* New chat button skeleton */}
      <motion.div variants={messageVariants}>
        <SmoothSkeleton className="h-10 w-full rounded-lg" />
      </motion.div>

      {/* Search skeleton */}
      <motion.div variants={messageVariants}>
        <SmoothSkeleton className="h-9 w-full rounded-md" />
      </motion.div>

      {/* Chat list skeleton */}
      <motion.div variants={containerVariants} className="space-y-2 mt-4">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            variants={messageVariants}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="space-y-1"
          >
            <SmoothSkeleton className="h-8 w-full rounded-md" />
            {Math.random() > 0.7 && (
              <motion.div
                variants={skeletonVariants}
                className="ml-4 space-y-1"
              >
                <SmoothSkeleton className="h-6 w-11/12 rounded-sm" />
                {Math.random() > 0.5 && (
                  <SmoothSkeleton className="h-6 w-4/5 rounded-sm" />
                )}
              </motion.div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
