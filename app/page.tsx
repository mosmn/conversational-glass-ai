"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Immediately redirect to the unified chat route
    // This ensures "/" shows the home/welcome state without a page reload
    router.replace("/chat");
  }, [router]);

  // Show minimal loading while redirecting
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
    </div>
  );
}
