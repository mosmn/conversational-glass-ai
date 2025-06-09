import { redirect } from "next/navigation";

export default function SettingsPage() {
  // Redirect to the customize section by default
  redirect("/settings/customize");
}
