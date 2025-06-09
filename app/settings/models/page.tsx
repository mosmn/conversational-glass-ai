import { Metadata } from "next";
import { ModelSettingsPage } from "@/components/settings/models/ModelSettingsPage";

export const metadata: Metadata = {
  title: "Model Settings - Conversational Glass AI",
  description: "Configure AI model preferences and capabilities",
};

export default function ModelsPage() {
  return <ModelSettingsPage />;
}
