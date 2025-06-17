import { useToast } from "@/hooks/use-toast";

interface UseMessageHandlingProps {
  chatId: string;
  selectedModel: string;
  sendMessage: (
    content: string,
    model: string,
    attachments: any[],
    displayContent?: string,
    searchResults?: any[],
    searchQuery?: string,
    searchProvider?: string
  ) => Promise<void>;
  messages?: Array<{
    id: string;
    content: string;
    role: "user" | "assistant" | "system";
    timestamp: Date | string;
  }>;
}

export function useMessageHandling({
  chatId,
  selectedModel,
  sendMessage,
  messages = [],
}: UseMessageHandlingProps) {
  const { toast } = useToast();

  const optimizeSearchQuery = async (
    userQuery: string,
    conversationContext: Array<{
      role: string;
      content: string;
      timestamp?: string;
    }>,
    searchType: string = "general"
  ) => {
    try {
      const response = await fetch("/api/search/optimize-query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userQuery,
          conversationContext,
          searchType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return data.data;
        }
      }
      throw new Error("Query optimization failed");
    } catch (error) {
      console.warn("Query optimization failed:", error);
      return {
        optimizedQuery: userQuery,
        reasoning: "Failed to optimize query, using original",
      };
    }
  };

  const performWebSearch = async (query: string) => {
    try {
      console.log("🔍 Starting AI-optimized web search for:", query);

      // Prepare conversation context (last 6 messages)
      const conversationContext = messages.slice(-6).map((msg) => ({
        role: msg.role === "system" ? "assistant" : msg.role,
        content: msg.content,
        timestamp:
          typeof msg.timestamp === "string"
            ? msg.timestamp
            : msg.timestamp.toISOString(),
      }));

      // First, optimize the search query using AI
      let queryOptimization = null;
      let searchQuery = query;

      if (conversationContext.length > 0) {
        console.log("🤖 Optimizing search query with conversation context...");
        queryOptimization = await optimizeSearchQuery(
          query,
          conversationContext,
          "general"
        );
        searchQuery = queryOptimization.optimizedQuery;

        console.log("📝 Original query:", query);
        console.log("✨ Optimized query:", searchQuery);
        console.log("💭 Reasoning:", queryOptimization.reasoning);
      }

      // Perform the actual search with the optimized query
      const searchResponse = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
          maxResults: 8,
          searchType: "general",
          language: "en",
          conversationContext,
          optimizeQuery: false, // We already optimized it
          queryOptimization,
        }),
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        console.log("🔍 Full search response:", searchData);

        const searchResults = searchData.success
          ? searchData.data?.results
          : null;

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

Please synthesize the information from the search results to provide an accurate, up-to-date response. When referencing information from the search results, please include citations using the format [1], [2], etc. corresponding to the numbered sources above. This helps users verify the information and explore the sources further.`;

          // Search completed successfully - no toast notification needed

          return {
            enhancedContent,
            searchResults,
            searchQuery,
            queryOptimization,
          };
        } else {
          // No search results found - continue without search
          return { enhancedContent: query, searchResults: null };
        }
      } else {
        console.error("Search API error:", searchResponse.statusText);
        // Search failed - continue without search
        return { enhancedContent: query, searchResults: null };
      }
    } catch (searchError) {
      console.error("Search error:", searchError);
      // Search error - continue without search
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
      let searchQuery = content;
      let queryOptimization = null;

      if (searchEnabled) {
        setIsSearching(true);
        const searchResult = await performWebSearch(content);
        enhancedContent = searchResult.enhancedContent;
        searchResults = searchResult.searchResults;
        searchQuery = searchResult.searchQuery || content;
        queryOptimization = searchResult.queryOptimization;
        setIsSearching(false);
      }

      console.log("🚀 About to call sendMessage with model:", selectedModel);

      // Build optional search parameters only when we actually have results
      const hasSearchResults =
        Array.isArray(searchResults) && searchResults.length > 0;

      await sendMessage(
        enhancedContent,
        selectedModel,
        messageAttachments,
        content, // Always pass the original user query as display content
        hasSearchResults ? (searchResults as any[]) : undefined,
        hasSearchResults ? searchQuery || content : undefined,
        hasSearchResults ? searchResults?.[0]?.provider || "unknown" : undefined
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

Please synthesize the information from the search results to provide an accurate, up-to-date response. When referencing information from the search results, please include citations using the format [1], [2], etc. corresponding to the numbered sources above. This helps users verify the information and explore the sources further.`;

      // Using search results - no toast notification needed

      await sendMessage(
        enhancedContent,
        selectedModel,
        messageAttachments,
        content, // Original user query as display content
        searchResults, // Pass search results to be stored with assistant message
        content, // Use content as search query since this is manual search
        searchResults?.[0]?.provider || "unknown" // Pass the search provider
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
