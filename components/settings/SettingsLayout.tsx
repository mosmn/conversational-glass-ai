"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SettingsNavigation } from "./SettingsNavigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();
  const { user } = useUser();

  // Extract current section from pathname
  const currentSection = pathname.split("/")[2] || "customize";
  const sectionTitles: Record<string, string> = {
    customize: "Customize",
    history: "History",
    models: "Models",
    "api-keys": "API Keys",
    attachments: "Attachments",
  };

  const currentTitle = sectionTitles[currentSection] || "Settings";

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-emerald-900/20 via-transparent to-teal-900/20" />
      </div>

      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen relative z-10">
          {/* Settings Navigation Sidebar */}
          <Sidebar className="border-r border-slate-700/50">
            <SidebarHeader className="border-b border-slate-700/50 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Settings</h2>
                <Link href="/chat">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              {user && (
                <div className="mt-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <div className="text-sm font-medium text-white">
                    {user.fullName}
                  </div>
                  <div className="text-xs text-slate-400">
                    {user.primaryEmailAddress?.emailAddress}
                  </div>
                </div>
              )}
            </SidebarHeader>
            <SidebarContent>
              <SettingsNavigation currentSection={currentSection} />
            </SidebarContent>
          </Sidebar>

          {/* Main Content Area */}
          <SidebarInset className="flex-1">
            {/* Header */}
            <header className="border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-xl">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center space-x-4">
                  <SidebarTrigger className="text-slate-400 hover:text-white" />
                  <Separator
                    orientation="vertical"
                    className="h-6 bg-slate-700/50"
                  />
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink
                          href="/settings"
                          className="text-slate-400 hover:text-white"
                        >
                          Settings
                        </BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator className="text-slate-600" />
                      <BreadcrumbItem>
                        <BreadcrumbPage className="text-white font-medium">
                          {currentTitle}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>
              </div>
            </header>

            {/* Settings Content */}
            <main className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl mx-auto">{children}</div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}
