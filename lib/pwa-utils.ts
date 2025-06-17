"use client";

// PWA detection utilities
export function isPWA(): boolean {
  if (typeof window === "undefined") return false;

  // Check if running in standalone mode (installed PWA)
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const isIOSStandalone = (window.navigator as any).standalone === true;

  return isStandalone || isIOSStandalone;
}

export function isIOSDevice(): boolean {
  if (typeof window === "undefined") return false;

  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroidDevice(): boolean {
  if (typeof window === "undefined") return false;

  return /Android/.test(navigator.userAgent);
}

export function canInstallPWA(): boolean {
  if (typeof window === "undefined") return false;

  // Check if browser supports PWA installation
  return "serviceWorker" in navigator && "BeforeInstallPromptEvent" in window;
}

// Service Worker registration
export async function registerServiceWorker(): Promise<void> {
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registered:", registration);
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  }
}

// PWA installation helpers
export function getInstallInstructions(): string {
  if (isIOSDevice()) {
    return "Tap the Share button and select 'Add to Home Screen'";
  } else if (isAndroidDevice()) {
    return "Tap the menu button and select 'Add to Home Screen' or 'Install App'";
  } else {
    return "Look for the install button in your browser's address bar";
  }
}

// PWA update detection
export function checkForPWAUpdate(): Promise<boolean> {
  return new Promise((resolve) => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.addEventListener("updatefound", () => {
            resolve(true);
          });
          // Check for updates
          registration.update();
        }
        resolve(false);
      });
    } else {
      resolve(false);
    }
  });
}

// Notification helpers
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if ("Notification" in window) {
    return await Notification.requestPermission();
  }
  return "denied";
}

export function showNotification(
  title: string,
  options?: NotificationOptions
): void {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, {
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      ...options,
    });
  }
}

// Storage helpers for offline functionality
export function isOnline(): boolean {
  return navigator.onLine;
}

export function onConnectivityChange(
  callback: (online: boolean) => void
): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
