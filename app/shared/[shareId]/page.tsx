import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicConversationView } from "@/components/chat/PublicConversationView";
import { validateShareId } from "@/lib/db/utils";

interface PageProps {
  params: { shareId: string };
}

// Fetch conversation data on the server for SEO and meta tags
async function getSharedConversation(shareId: string) {
  try {
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/api/shared/${shareId}`,
      {
        // No authentication required for public endpoint
        cache: "no-store", // Always fetch fresh data for shared conversations
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch shared conversation:", error);
    return null;
  }
}

// Generate dynamic metadata for social sharing
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { shareId } = params;

  // Validate share ID format
  if (!validateShareId(shareId)) {
    return {
      title: "Invalid Share Link",
      description: "The shared conversation link is invalid or malformed.",
    };
  }

  const data = await getSharedConversation(shareId);

  if (!data) {
    return {
      title: "Conversation Not Found",
      description:
        "The shared conversation could not be found or is no longer available.",
    };
  }

  const { conversation, stats } = data;
  const title = `${conversation.title} - Shared Conversation`;
  const description = conversation.metadata.summary
    ? conversation.metadata.summary
    : `A conversation with ${stats.modelsUsed.join(", ")} containing ${
        stats.messageCount
      } messages. Created by ${conversation.creator.name}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `${process.env.NEXT_PUBLIC_APP_URL}/shared/${shareId}`,
      siteName: "Conversational Glass AI",
      images: [
        {
          url: `/api/shared/${shareId}/og-image`, // TODO: Implement OG image generation
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/shared/${shareId}/og-image`], // TODO: Implement OG image generation
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function SharedConversationPage({ params }: PageProps) {
  const { shareId } = params;

  // Validate share ID format
  if (!validateShareId(shareId)) {
    notFound();
  }

  // Fetch conversation data
  const data = await getSharedConversation(shareId);

  if (!data) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <PublicConversationView shareId={shareId} initialData={data} />
    </div>
  );
}
