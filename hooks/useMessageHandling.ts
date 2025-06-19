import { useToast } from "@/hooks/use-toast";

// Performance optimization constants
const SEARCH_DEBOUNCE_MS = 300;
const MAX_CONCURRENT_SEARCHES = 2;

// Helper for non-blocking async operations
const yieldControl = () => new Promise((resolve) => setTimeout(resolve, 0));

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
      // Yield control to prevent blocking
      await yieldControl();

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

      // Prepare conversation context (last 6 messages) with yield
      await yieldControl();
      const conversationContext = messages.slice(-6).map((msg) => ({
        role: msg.role === "system" ? "assistant" : msg.role,
        content: msg.content,
        timestamp:
          typeof msg.timestamp === "string"
            ? msg.timestamp
            : msg.timestamp.toISOString(),
      }));

      // First, optimize the search query using AI (non-blocking)
      let queryOptimization = null;
      let searchQuery = query;

      if (conversationContext.length > 0) {
        console.log("🤖 Optimizing search query with conversation context...");

        // Use timeout to prevent hanging
        const optimizationPromise = optimizeSearchQuery(
          query,
          conversationContext,
          "general"
        );

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Query optimization timeout")),
            5000
          )
        );

        try {
          queryOptimization = await Promise.race([
            optimizationPromise,
            timeoutPromise,
          ]);
          searchQuery = queryOptimization.optimizedQuery;

          console.log("📝 Original query:", query);
          console.log("✨ Optimized query:", searchQuery);
          console.log("💭 Reasoning:", queryOptimization.reasoning);
        } catch (error) {
          console.warn("Query optimization failed or timed out:", error);
          // Continue with original query
        }
      }

      // Yield control before search
      await yieldControl();

      // Perform the actual search with the optimized query (with timeout)
      const searchPromise = fetch("/api/search", {
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

      const searchTimeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Search timeout")), 10000)
      );

      const searchResponse = (await Promise.race([
        searchPromise,
        searchTimeoutPromise,
      ])) as Response;

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        console.log("🔍 Full search response:", searchData);

        const searchResults = searchData.success
          ? searchData.data?.results
          : null;

        if (searchResults && searchResults.length > 0) {
          // Process search results in chunks to prevent blocking
          await yieldControl();

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

    console.log(
      "🔍 DEBUG: handleSendMessage called with searchEnabled:",
      searchEnabled
    );

    const content = inputValue;
    const messageAttachments = attachments.filter(
      (a) => a.status === "uploaded"
    );

    // Reset input immediately to improve perceived performance
    resetInput();

    try {
      let searchResults = null;
      let enhancedContent = content;
      let searchQuery = content;
      let queryOptimization = null;

      // Yield control to prevent blocking UI
      await yieldControl();

      if (searchEnabled) {
        console.log("🔍 DEBUG: Web search enabled, performing search...");
        setIsSearching(true);
        const searchResult = await performWebSearch(content);
        enhancedContent = searchResult.enhancedContent;
        searchResults = searchResult.searchResults;
        searchQuery = searchResult.searchQuery || content;
        queryOptimization = searchResult.queryOptimization;
        setIsSearching(false);
        console.log("🔍 DEBUG: Search completed, results:", !!searchResults);
      } else {
        console.log(
          "🔍 DEBUG: Web search disabled, sending message without search"
        );
      }

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
      pauseStream();
      toast({
        title: "🛑 Stream Stopped",
        description: "Attempted to stop the stream",
        variant: "destructive",
      });
    } else {
      toast({
        title: "No Active Stream",
        description: "There's no active AI response to stop",
        variant: "destructive",
      });
    }
  };

  const handleStopStream = (
    isStreaming: boolean,
    canPauseStream: boolean,
    isSearching: boolean,
    terminateStream: () => void,
    setIsSearching: (searching: boolean) => void,
    triggerDetection: () => void
  ) => {
    if (isStreaming && canPauseStream) {
      // Use terminateStream to permanently stop without saving resumption state
      terminateStream();
      triggerDetection();

      toast({
        title: "🛑 Stream Terminated",
        description:
          "AI response generation has been permanently stopped and cannot be resumed.",
        duration: 4000,
      });
    } else if (isSearching) {
      setIsSearching(false);
      toast({
        title: "🔍 Search Cancelled",
        description: "Web search has been cancelled",
      });
    } else if (isStreaming) {
      terminateStream();
      toast({
        title: "🛑 Stream Terminated",
        description: "Stream has been permanently stopped",
        variant: "destructive",
      });
    } else {
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
    handleStopStream,
  };
}
