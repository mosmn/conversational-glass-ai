"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export default function AuthGuard({
  children,
  fallback,
  redirectTo = "/sign-in",
}: AuthGuardProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push(redirectTo);
    }
  }, [isLoaded, isSignedIn, redirectTo, router]);

  // Loading state
  if (!isLoaded) {
    return (
      fallback || (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="inline-block mb-4"
            >
              <Loader2 className="w-12 h-12 text-white/80" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-white/80 text-lg font-medium"
            >
              Loading your experience...
            </motion.p>
          </motion.div>
        </div>
      )
    );
  }

  // Not authenticated
  if (!isSignedIn) {
    return (
      fallback || (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <motion.p className="text-white/80 text-lg font-medium">
              Redirecting to sign in...
            </motion.p>
          </motion.div>
        </div>
      )
    );
  }

  // Authenticated - render children
  return <>{children}</>;
}
