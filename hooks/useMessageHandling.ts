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

Please synthesize the information from the search results to provide an accurate, up-to-date response. Include relevant citations and sources where appropriate.`;

          // Show user what search query was actually used
          const searchInfo =
            queryOptimization && queryOptimization.optimizedQuery !== query
              ? `🔍 Web search completed using optimized query: "${searchQuery}"\n💭 Optimization reasoning: ${queryOptimization.reasoning}\n📊 Found ${searchResults.length} relevant results`
              : `🔍 Web search completed - found ${searchResults.length} relevant results`;

          toast({
            title: "🔍 Web Search Complete",
            description: searchInfo,
            duration: 5000,
          });

          return {
            enhancedContent,
            searchResults,
            searchQuery,
            queryOptimization,
          };
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

      // Use the original user query as display content, but send the search-enhanced content to AI
      await sendMessage(
        enhancedContent,
        selectedModel,
        messageAttachments,
        content // Always pass the original user query as display content
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
