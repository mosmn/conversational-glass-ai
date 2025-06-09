"use client";

import { SignUp } from "@clerk/nextjs";
import { motion } from "framer-motion";
import ConversationalGlassLogo from "@/components/ConversationalGlassLogo";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      {/* Floating particles background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-cyan-300/30 rounded-full"
            animate={{
              y: [-30, -120],
              x: [0, Math.random() * 50 - 25],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
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
            <div className="flex justify-center mb-6">
              <ConversationalGlassLogo
                size="lg"
                animated={true}
                showText={true}
                className=""
              />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent mb-2">
              Join the Conversation
            </h1>
            <p className="text-white/80 text-lg">
              Create your account to start chatting with AI
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <SignUp
              appearance={{
                elements: {
                  formButtonPrimary:
                    "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg",
                  card: "bg-transparent shadow-none",
                  headerTitle: "text-white text-2xl font-bold",
                  headerSubtitle: "text-white/80",
                  socialButtonsBlockButton:
                    "bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-300 rounded-xl",
                  formFieldInput:
                    "bg-white/10 border border-white/20 text-white placeholder-white/60 rounded-xl focus:border-cyan-400 focus:ring-cyan-400/20",
                  formFieldLabel: "text-white/90 font-medium",
                  dividerLine: "bg-white/20",
                  dividerText: "text-white/60",
                  footerActionLink: "text-cyan-300 hover:text-cyan-200",
                  identityPreviewText: "text-white/80",
                  identityPreviewEditButton:
                    "text-cyan-300 hover:text-cyan-200",
                },
              }}
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
