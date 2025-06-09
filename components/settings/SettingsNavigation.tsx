"use client";

import React from "react";
import Link from "next/link";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { User, Clock, Brain, Key, Paperclip, Settings } from "lucide-react";

interface SettingsNavigationProps {
  currentSection: string;
}

const navigationItems = [
  {
    id: "customize",
    title: "Customize",
    href: "/settings/customize",
    icon: User,
    description: "Personal settings and AI customization",
  },
  {
    id: "history",
    title: "History",
    href: "/settings/history",
    icon: Clock,
    description: "Chat history and data management",
  },
  {
    id: "models",
    title: "Models",
    href: "/settings/models",
    icon: Brain,
    description: "AI model selection and configuration",
  },
  {
    id: "api-keys",
    title: "API Keys",
    href: "/settings/api-keys",
    icon: Key,
    description: "Bring your own API keys",
  },
  {
    id: "attachments",
    title: "Attachments",
    href: "/settings/attachments",
    icon: Paperclip,
    description: "File attachments and storage",
  },
];

export function SettingsNavigation({
  currentSection,
}: SettingsNavigationProps) {
  return (
    <div className="p-4">
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;

              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className="h-12"
                  >
                    <Link
                      href={item.href}
                      className="flex items-center space-x-3 w-full"
                    >
                      <Icon
                        className={`h-5 w-5 ${
                          isActive
                            ? "text-emerald-400"
                            : "text-slate-400 group-hover:text-slate-300"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-medium ${
                            isActive
                              ? "text-emerald-400"
                              : "text-white group-hover:text-emerald-400"
                          }`}
                        >
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );
}
