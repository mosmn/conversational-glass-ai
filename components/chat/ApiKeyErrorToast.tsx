"use client";

import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

interface ApiKeyErrorToastProps {
  provider?: string;
  model?: string;
  onRetry?: () => void;
}

export function showApiKeyErrorToast({
  provider,
  model,
}: ApiKeyErrorToastProps) {
  const router = useRouter;

  const providerName = provider || "API";
  const errorMessage = `${providerName} key is missing or invalid. Please add a valid API key in Settings to continue using ${
    model ? `the ${model} model` : "this service"
  }.`;

  toast({
    title: "API Key Required",
    description: errorMessage,
    variant: "destructive",
    duration: 12000, // Longer duration so user has time to read and act
    action: (
      <ToastAction
        altText="Go to Settings to add API key"
        onClick={() => {
          if (typeof window !== "undefined") {
            window.location.href = "/settings/api-keys";
          }
        }}
      >
        Add API Key
      </ToastAction>
    ),
  });
}

export default showApiKeyErrorToast;
