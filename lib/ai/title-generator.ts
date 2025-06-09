import { createStreamingCompletion } from "./providers";
import { ModelId, ChatMessage } from "./types";

/**
 * Generates a conversation title based on the first user message and AI response
 * @param userMessage The user's first message
 * @param assistantMessage The AI's response (optional)
 * @param model The model to use for title generation (defaults to fast model)
 * @returns A generated title (max 60 characters)
 */
export async function generateConversationTitle(
  userMessage: string,
  assistantMessage?: string,
  model: ModelId = "llama-3.1-8b-instant" // Use fast model for title generation
): Promise<string> {
  try {
    // Create a prompt for title generation
    const titlePrompt = assistantMessage
      ? `Based on this conversation, generate a short, descriptive title (max 60 characters):

User: ${userMessage.substring(0, 500)}
Assistant: ${assistantMessage.substring(0, 500)}

Generate a concise, descriptive title that captures the main topic or question. Respond with only the title, no quotes or extra text.`
      : `Generate a short, descriptive title (max 60 characters) for a conversation that starts with:

"${userMessage.substring(0, 500)}"

Generate a concise, descriptive title that captures the main topic or question. Respond with only the title, no quotes or extra text.`;

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are a helpful assistant that generates concise, descriptive titles for conversations. Always respond with just the title, no quotes or extra formatting. Keep titles under 60 characters.",
      },
      {
        role: "user",
        content: titlePrompt,
      },
    ];

    // Generate title using streaming completion
    const titleStream = createStreamingCompletion(messages, model, {
      userId: "system",
      conversationId: "title-generation",
    });

    let generatedTitle = "";

    // Collect the streamed response
    for await (const chunk of titleStream) {
      if (chunk.error) {
        throw new Error(chunk.error);
      }

      if (chunk.content) {
        generatedTitle += chunk.content;
      }

      if (chunk.finished) {
        break;
      }
    }

    // Clean up the title
    let title = generatedTitle
      .trim()
      .replace(/^["']|["']$/g, "") // Remove quotes
      .replace(/\n.*/g, "") // Remove everything after first line
      .substring(0, 60) // Limit to 60 characters
      .trim();

    // Fallback titles based on content analysis
    if (!title || title.length < 3) {
      title = generateFallbackTitle(userMessage);
    }

    return title;
  } catch (error) {
    console.error("Title generation error:", error);
    return generateFallbackTitle(userMessage);
  }
}

/**
 * Generates a fallback title when AI generation fails
 * @param userMessage The user's message to analyze
 * @returns A fallback title
 */
function generateFallbackTitle(userMessage: string): string {
  const message = userMessage.toLowerCase().trim();

  // Common patterns and their titles
  const patterns = [
    { regex: /help.*with|how.*to|can.*you/i, title: "Getting Help" },
    { regex: /write|create|generate|make/i, title: "Content Creation" },
    { regex: /explain|what.*is|tell.*me.*about/i, title: "Learning" },
    { regex: /debug|fix|error|problem|issue/i, title: "Troubleshooting" },
    { regex: /review|check|analyze|look.*at/i, title: "Code Review" },
    { regex: /plan|strategy|approach|how.*should/i, title: "Planning" },
    { regex: /react|javascript|python|code/i, title: "Programming" },
    { regex: /design|ui|ux|interface/i, title: "Design" },
    { regex: /data|analyze|chart|graph/i, title: "Data Analysis" },
    { regex: /translate|language/i, title: "Translation" },
    { regex: /summarize|summary|tldr/i, title: "Summarization" },
  ];

  // Check for patterns
  for (const pattern of patterns) {
    if (pattern.regex.test(message)) {
      return pattern.title;
    }
  }

  // Extract key words for title
  const words = message
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 4);

  if (words.length > 0) {
    return words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
      .substring(0, 50);
  }

  // Ultimate fallback
  return "New Conversation";
}

/**
 * Checks if a conversation needs a title (is still using default title)
 * @param currentTitle The current conversation title
 * @returns Whether the conversation needs a new title
 */
export function needsTitle(currentTitle: string): boolean {
  const defaultTitles = [
    "New Chat",
    "New Conversation",
    "Untitled",
    "Chat Session",
  ];

  return (
    defaultTitles.some((defaultTitle) =>
      currentTitle.toLowerCase().includes(defaultTitle.toLowerCase())
    ) || currentTitle.startsWith("New Chat with")
  );
}
