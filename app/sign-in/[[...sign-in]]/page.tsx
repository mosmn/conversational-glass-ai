"use client";

import { SignIn } from "@clerk/nextjs";
import { motion } from "framer-motion";
import ConversationalGlassLogo from "@/components/ConversationalGlassLogo";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background with glassmorphic floating elements */}
      <div className="absolute inset-0">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-slate-900 to-teal-900/20" />

        {/* Floating glassmorphic elements */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-emerald-400/10 backdrop-blur-sm rounded-full border border-emerald-400/20"
            style={{
              width: `${Math.random() * 100 + 50}px`,
              height: `${Math.random() * 100 + 50}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, -60],
              x: [0, Math.random() * 30 - 15],
              opacity: [0.1, 0.3, 0.1],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 4,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Smaller floating particles */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-emerald-400/40 rounded-full"
            animate={{
              y: [-10, -80],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Main content - clean, single container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Logo and header above the form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center mb-6"
        >
          <div className="flex justify-center mb-4">
            <ConversationalGlassLogo
              size="lg"
              animated={true}
              showText={true}
              className=""
            />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400 bg-clip-text text-transparent mb-1">
            Welcome Back
          </h1>
          <p className="text-slate-300 text-sm">
            Sign in to continue your AI conversations
          </p>
        </motion.div>

        {/* Clerk form - no extra container needed */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <SignIn />
        </motion.div>
      </motion.div>
    </div>
  );
}
