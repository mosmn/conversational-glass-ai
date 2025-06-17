import { useToast } from "@/hooks/use-toast";

interface UseMessageHandlingProps {
  chatId: string;
  selectedModel: string;
  sendMessage: (
    content: string,
    model: string,
    attachments: any[],
    displayContent?: string
  ) => Promise<void>;
}

export function useMessageHandling({
  chatId,
  selectedModel,
  sendMessage,
}: UseMessageHandlingProps) {
  const { toast } = useToast();

  const performWebSearch = async (query: string) => {
    try {
      console.log("🔍 Performing web search for:", query);

      const searchResponse = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          maxResults: 5,
          searchType: "general",
          language: "en",
        }),
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        console.log("🔍 Full search response:", searchData);

        const searchResults = searchData.success
          ? searchData.data?.results
          : null;
        console.log("🔍 Extracted search results:", searchResults);

        if (searchResults && searchResults.length > 0) {
          const searchContext = searchResults
            .map(
              (result: any, index: number) =>
                `[${index + 1}] ${result.title}\nURL: ${result.url}\nContent: ${
                  result.snippet
                }\nPublished: ${result.publishedDate || "N/A"}\n`
            )
            .join("\n");

          const enhancedContent = `Based on the following web search results, please provide a comprehensive answer to my question.

WEB SEARCH RESULTS:
${searchContext}

USER QUESTION: ${query}

Please synthesize the information from the search results to provide an accurate, up-to-date response. Include relevant citations and sources where appropriate.`;

          toast({
            title: "🔍 Web Search Complete",
            description: `Found ${searchResults.length} relevant results`,
          });

          return { enhancedContent, searchResults };
        } else {
          toast({
            title: "🔍 No Search Results",
            description: "No relevant results found for your query",
            variant: "destructive",
          });
          return { enhancedContent: query, searchResults: null };
        }
      } else {
        console.error("Search API error:", searchResponse.statusText);
        toast({
          title: "🔍 Search Failed",
          description:
            "Unable to perform web search. Continuing without search.",
          variant: "destructive",
        });
        return { enhancedContent: query, searchResults: null };
      }
    } catch (searchError) {
      console.error("Search error:", searchError);
      toast({
        title: "🔍 Search Error",
        description: "Search failed. Continuing without search.",
        variant: "destructive",
      });
      return { enhancedContent: query, searchResults: null };
    }
  };

  const handleSendMessage = async (
    inputValue: string,
    attachments: any[],
    searchEnabled: boolean,
    setIsSearching: (searching: boolean) => void,
    resetInput: () => void
  ) => {
    if ((!inputValue.trim() && attachments.length === 0) || !chatId) return;

    const content = inputValue;
    const messageAttachments = attachments.filter(
      (a) => a.status === "uploaded"
    );

    console.log("🐛 DEBUG - handleSendMessage:");
    console.log("  📎 Total attachments:", attachments.length);
    console.log(
      "  ✅ Filtered uploaded attachments:",
      messageAttachments.length
    );
    console.log("  🔍 Search enabled:", searchEnabled);
    console.log("  🤖 Selected model being sent:", selectedModel);
    console.log("  💬 Chat ID:", chatId);

    resetInput();

    try {
      let searchResults = null;
      let enhancedContent = content;

      if (searchEnabled) {
        setIsSearching(true);
        const searchResult = await performWebSearch(content);
        enhancedContent = searchResult.enhancedContent;
        searchResults = searchResult.searchResults;
        setIsSearching(false);
      }

      console.log("🚀 About to call sendMessage with model:", selectedModel);

      await sendMessage(
        enhancedContent,
        selectedModel,
        messageAttachments,
        searchEnabled && searchResults ? content : undefined
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsSearching(false);
      // Don't clear attachments on error so user can retry
    }
  };

  const handleSendMessageWithSearch = async (
    content: string,
    searchResults: any[],
    attachments: any[] = [],
    resetInput?: () => void
  ) => {
    if (!content.trim() || !chatId) return;

    const messageAttachments = attachments.filter(
      (a) => a.status === "uploaded"
    );

    console.log("🐛 DEBUG - handleSendMessageWithSearch:");
    console.log("  🔍 Search results:", searchResults.length);
    console.log("  📎 Attachments:", messageAttachments.length);
    console.log("  🤖 Selected model:", selectedModel);

    if (resetInput) resetInput();

    try {
      // Format search results for AI context
      const searchContext = searchResults
        .map(
          (result: any, index: number) =>
            `[${index + 1}] ${result.title}\nURL: ${result.url}\nContent: ${
              result.snippet
            }\nPublished: ${result.publishedDate || "N/A"}\n`
        )
        .join("\n");

      const enhancedContent = `Based on the following web search results, please provide a comprehensive answer to my question.

WEB SEARCH RESULTS:
${searchContext}

USER QUESTION: ${content}

Please synthesize the information from the search results to provide an accurate, up-to-date response. Include relevant citations and sources where appropriate.`;

      toast({
        title: "🔍 Using Search Results",
        description: `Sending message with ${searchResults.length} search results`,
      });

      await sendMessage(
        enhancedContent,
        selectedModel,
        messageAttachments,
        content // Original user query as display content
      );
    } catch (error) {
      console.error("Failed to send message with search results:", error);
      toast({
        title: "Failed to send message",
        description:
          "There was an error sending your message with search results",
        variant: "destructive",
      });
    }
  };

  const handlePauseStream = (
    isStreaming: boolean,
    canPauseStream: boolean,
    isSearching: boolean,
    pauseStream: () => void,
    setIsSearching: (searching: boolean) => void,
    triggerDetection: () => void
  ) => {
    console.log("🛑 Pause button clicked", {
      isStreaming,
      canPauseStream,
      isSearching,
    });

    if (isStreaming && canPauseStream) {
      pauseStream();
      triggerDetection();

      toast({
        title: "🛑 Stream Stopped",
        description:
          "AI response generation has been stopped. Check the message for resume options.",
        duration: 4000,
      });
    } else if (isSearching) {
      setIsSearching(false);
      toast({
        title: "🔍 Search Cancelled",
        description: "Web search has been cancelled",
      });
    } else if (isStreaming) {
      console.log("⚠️ Cannot pause stream - forced abort attempt");
      pauseStream();
      toast({
        title: "🛑 Stream Stopped",
        description: "Attempted to stop the stream",
        variant: "destructive",
      });
    } else {
      console.log("⚠️ No active stream to stop");
      toast({
        title: "No Active Stream",
        description: "There's no active AI response to stop",
        variant: "destructive",
      });
    }
  };

  return {
    handleSendMessage,
    handleSendMessageWithSearch,
    handlePauseStream,
  };
}
