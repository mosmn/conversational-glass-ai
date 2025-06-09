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

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10"
      >
        {/* Glassmorphic container */}
        <div className="backdrop-blur-xl bg-slate-800/50 rounded-3xl p-8 border border-slate-700/50 shadow-2xl max-w-md w-full">
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
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400 bg-clip-text text-transparent mb-2">
              Welcome Back
            </h1>
            <p className="text-slate-300 text-lg">
              Sign in to continue your AI conversations
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
                    "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg border-0",
                  card: "bg-transparent shadow-none",
                  headerTitle: "text-white text-2xl font-bold",
                  headerSubtitle: "text-slate-300",
                  socialButtonsBlockButton:
                    "bg-slate-700/50 border border-slate-600 text-white hover:bg-slate-600/50 hover:border-slate-500 transition-all duration-300 rounded-xl backdrop-blur-sm",
                  socialButtonsBlockButtonText: "text-white font-medium",
                  formFieldInput:
                    "bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 rounded-xl focus:border-emerald-500 focus:ring-emerald-500/20 backdrop-blur-sm",
                  formFieldLabel: "text-slate-200 font-medium",
                  dividerLine: "bg-slate-600",
                  dividerText: "text-slate-400",
                  footerActionLink:
                    "text-emerald-400 hover:text-emerald-300 transition-colors",
                  identityPreviewText: "text-slate-300",
                  identityPreviewEditButton:
                    "text-emerald-400 hover:text-emerald-300",
                  formFieldSuccessText: "text-emerald-400",
                  formFieldErrorText: "text-red-400",
                  formFieldWarningText: "text-amber-400",
                  alertClerkError:
                    "bg-red-600/20 border border-red-500/30 text-red-400 rounded-xl",
                  formResendCodeLink: "text-emerald-400 hover:text-emerald-300",
                  otpCodeFieldInput:
                    "bg-slate-700/50 border border-slate-600 text-white rounded-lg focus:border-emerald-500",
                },
                layout: {
                  socialButtonsPlacement: "top",
                  socialButtonsVariant: "blockButton",
                },
              }}
            />
          </motion.div>

          {/* Additional glassmorphic decoration */}
          <div className="absolute -top-px left-1/2 transform -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
          <div className="absolute -bottom-px left-1/2 transform -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
        </div>
      </motion.div>
    </div>
  );
}
