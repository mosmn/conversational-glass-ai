import { Metadata } from "next";
import { SettingsLayout } from "@/components/settings/SettingsLayout";

export const metadata: Metadata = {
  title: "Settings - Conversational Glass AI",
  description:
    "Customize your Convo Glass AI experience with personalized settings, model preferences, and more.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SettingsLayout>{children}</SettingsLayout>;
}
