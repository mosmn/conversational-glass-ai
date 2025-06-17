"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    // Enable debug mode if in development or if URL has debug param
    const isDev = process.env.NODE_ENV === "development";
    const hasDebugParam =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("pwa-debug");
    setDebugMode(isDev || hasDebugParam);

    // Check if already installed
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)"
    ).matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;

    if (isStandalone || isIOSStandalone) {
      setIsInstalled(true);
      console.log(
        "🎉 PWA: App is already installed/running in standalone mode"
      );
      return;
    }

    console.log("📱 PWA: Setting up install prompt listeners...");

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("🚀 PWA: beforeinstallprompt event fired!");
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show prompt after a delay to avoid being annoying (reduced for testing)
      const delay = debugMode ? 3000 : 10000; // 3s in debug, 10s normally
      setTimeout(() => {
        console.log("⏰ PWA: Showing install prompt after delay");
        setShowPrompt(true);
      }, delay);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log("✅ PWA: App was installed successfully!");
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Debug: Check if prompt was previously dismissed
    if (debugMode) {
      const isDismissed = sessionStorage.getItem("pwa-install-dismissed");
      console.log("🐛 PWA Debug: Previously dismissed?", isDismissed);
      console.log(
        "🐛 PWA Debug: Service worker supported?",
        "serviceWorker" in navigator
      );
      console.log(
        "🐛 PWA Debug: Is HTTPS?",
        window.location.protocol === "https:"
      );
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [debugMode]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log("❌ PWA: No deferred prompt available");
      return;
    }

    try {
      console.log("🔄 PWA: Showing install prompt...");
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === "accepted") {
        console.log("✅ PWA: User accepted the install prompt");
      } else {
        console.log("❌ PWA: User dismissed the install prompt");
      }
    } catch (error) {
      console.error("💥 PWA: Error during installation:", error);
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    console.log("👋 PWA: User manually dismissed install prompt");
    setShowPrompt(false);
    // Don't show again for this session
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pwa-install-dismissed", "true");
    }
  };

  const handleReset = () => {
    console.log("🔄 PWA: Resetting install prompt state");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("pwa-install-dismissed");
      // Reload to trigger fresh prompt detection
      window.location.reload();
    }
  };

  // Don't show if already installed or dismissed this session
  const isDismissed =
    typeof window !== "undefined"
      ? sessionStorage.getItem("pwa-install-dismissed")
      : null;

  // Show debug controls in development or with debug param
  if (debugMode && !isInstalled) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm">
        <div
          className={cn(
            "glass-card p-4 rounded-2xl border border-blue-500/30",
            "backdrop-blur-xl bg-blue-900/80 shadow-2xl"
          )}
        >
          <div className="text-blue-100 text-sm space-y-3">
            <div className="font-semibold">🐛 PWA Debug Panel</div>

            <div className="space-y-1 text-xs">
              <div>Prompt Available: {deferredPrompt ? "✅" : "❌"}</div>
              <div>Previously Dismissed: {isDismissed ? "✅" : "❌"}</div>
              <div>Show Timer: {showPrompt ? "✅" : "⏳"}</div>
              <div>Is Standalone: {isInstalled ? "✅" : "❌"}</div>
            </div>

            <div className="flex gap-2">
              {deferredPrompt && (
                <Button
                  onClick={handleInstallClick}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Install Now
                </Button>
              )}

              <Button
                onClick={handleReset}
                size="sm"
                variant="outline"
                className="text-blue-100 border-blue-400 hover:bg-blue-800"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            </div>

            <div className="text-xs text-blue-300">
              Add <code>?pwa-debug</code> to URL for debug mode
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal install prompt
  if (isInstalled || isDismissed || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div
        className={cn(
          "glass-card p-4 rounded-2xl border border-white/10",
          "backdrop-blur-xl bg-slate-900/80 shadow-2xl",
          "animate-in slide-in-from-bottom-5 duration-500"
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1">Install Glass AI</h3>
            <p className="text-sm text-slate-300 mb-3">
              Get the full app experience with offline access and notifications
            </p>

            <div className="flex gap-2">
              <Button
                onClick={handleInstallClick}
                size="sm"
                className={cn(
                  "bg-emerald-600 hover:bg-emerald-700",
                  "text-white font-medium",
                  "px-4 py-2 rounded-lg",
                  "transition-all duration-200"
                )}
              >
                <Download className="w-4 h-4 mr-2" />
                Install
              </Button>

              <Button
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-white hover:bg-white/10"
              >
                Maybe Later
              </Button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
