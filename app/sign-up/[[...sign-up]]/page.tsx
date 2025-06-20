"use client";

import { SignUp } from "@clerk/nextjs";
import { motion } from "framer-motion";
import ConversationalGlassLogo from "@/components/ConversationalGlassLogo";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background with glassmorphic floating elements */}
      <div className="absolute inset-0">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-slate-900 to-teal-900/20" />

        {/* Floating glassmorphic elements */}
        {[...Array(18)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-emerald-400/10 backdrop-blur-sm rounded-full border border-emerald-400/20"
            style={{
              width: `${Math.random() * 120 + 60}px`,
              height: `${Math.random() * 120 + 60}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-25, -70],
              x: [0, Math.random() * 40 - 20],
              opacity: [0.1, 0.4, 0.1],
              scale: [0.7, 1.3, 0.7],
            }}
            transition={{
              duration: 10 + Math.random() * 5,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Smaller floating particles */}
        {[...Array(35)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1.5 h-1.5 bg-emerald-400/50 rounded-full"
            animate={{
              y: [-15, -90],
              x: [0, Math.random() * 20 - 10],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 4,
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
            Join the Revolution
          </h1>
          <p className="text-slate-300 text-sm">
            Create your account to start conversations with AI
          </p>
        </motion.div>

        {/* Clerk form - no extra container needed */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <SignUp />
        </motion.div>
      </motion.div>
    </div>
  );
}
