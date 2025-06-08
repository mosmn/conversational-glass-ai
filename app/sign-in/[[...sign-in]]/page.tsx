"use client";

import { SignIn } from "@clerk/nextjs";
import { motion } from "framer-motion";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      {/* Floating particles background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            animate={{
              y: [-20, -100],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative"
      >
        {/* Glassmorphic container */}
        <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-2">
              Welcome Back
            </h1>
            <p className="text-white/80 text-lg">
              Sign in to continue your conversations
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <SignIn
              appearance={{
                elements: {
                  formButtonPrimary:
                    "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg",
                  card: "bg-transparent shadow-none",
                  headerTitle: "text-white text-2xl font-bold",
                  headerSubtitle: "text-white/80",
                  socialButtonsBlockButton:
                    "bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-300 rounded-xl",
                  formFieldInput:
                    "bg-white/10 border border-white/20 text-white placeholder-white/60 rounded-xl focus:border-purple-400 focus:ring-purple-400/20",
                  formFieldLabel: "text-white/90 font-medium",
                  dividerLine: "bg-white/20",
                  dividerText: "text-white/60",
                  footerActionLink: "text-purple-300 hover:text-purple-200",
                  identityPreviewText: "text-white/80",
                  identityPreviewEditButton:
                    "text-purple-300 hover:text-purple-200",
                },
              }}
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
