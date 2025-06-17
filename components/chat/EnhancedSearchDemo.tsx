import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Sparkles,
  Clock,
  Globe,
  Settings,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { SearchResultsPreview } from "./SearchResultsPreview";
import { SearchControls } from "./SearchControls";
import { EnhancedSearchInput } from "./EnhancedSearchInput";
import { useEnhancedSearch } from "@/hooks/useEnhancedSearch";
import { useToast } from "@/hooks/use-toast";

export function EnhancedSearchDemo() {
  const { toast } = useToast();
  const [demoStep, setDemoStep] = useState(0);

  const {
    performSearch,
    currentResults,
    showResultsPreview,
    settings,
    updateSettings,
    searchHistory,
    suggestions,
    availableProviders,
    useSelectedResults,
    useAllResults,
    cancelSearch,
    refineSearch,
    isSearching,
    hasResults,
  } = useEnhancedSearch({
    onSearchComplete: (results, query) => {
      toast({
        title: "🎉 Enhanced Search Complete!",
        description: `Successfully processed ${results.length} results for "${query}"`,
      });
      setDemoStep(5);
    },
  });

  const demoSteps = [
    {
      title: "🔍 Manual Search Input",
      description: "Search independently with AI-powered suggestions",
      component: "input",
    },
    {
      title: "⚙️ Advanced Search Controls",
      description: "Customize search parameters for better results",
      component: "controls",
    },
    {
      title: "📊 Search Results Preview",
      description: "Review and select specific results before using them",
      component: "preview",
    },
    {
      title: "🎯 Smart Selection",
      description: "Choose which results to include in your AI conversation",
      component: "selection",
    },
    {
      title: "✅ Search Complete",
      description: "Results integrated into your conversation",
      component: "complete",
    },
  ];

  const mockSearchResults = [
    {
      id: "1",
      title: "Next.js 14 App Router: Complete Guide to Modern Web Development",
      url: "https://nextjs.org/docs/app",
      snippet:
        "Learn how to build modern web applications with Next.js 14's App Router. This comprehensive guide covers routing, data fetching, and performance optimization.",
      domain: "nextjs.org",
      publishedDate: "2024-01-15",
      score: 0.95,
      favicon: "https://nextjs.org/favicon.ico",
      metadata: {
        provider: "tavily",
        position: 1,
        language: "en",
      },
    },
    {
      id: "2",
      title: "TypeScript Best Practices for React Applications in 2024",
      url: "https://typescript-lang.org/docs/handbook/react.html",
      snippet:
        "Discover the latest TypeScript patterns and best practices for building robust React applications. Includes type safety, performance tips, and modern patterns.",
      domain: "typescript-lang.org",
      publishedDate: "2024-02-01",
      score: 0.88,
      favicon: "https://www.typescriptlang.org/favicon-32x32.png",
      metadata: {
        provider: "tavily",
        position: 2,
        language: "en",
      },
    },
    {
      id: "3",
      title: "Tailwind CSS v4.0: What's New and Improved",
      url: "https://tailwindcss.com/blog/tailwindcss-v4-alpha",
      snippet:
        "Explore the latest features in Tailwind CSS v4.0, including improved performance, new utilities, and enhanced developer experience.",
      domain: "tailwindcss.com",
      publishedDate: "2024-01-28",
      score: 0.82,
      favicon: "https://tailwindcss.com/favicons/favicon-32x32.png",
      metadata: {
        provider: "serper",
        position: 3,
        language: "en",
      },
    },
  ];

  const mockSuggestions = [
    {
      id: "1",
      query: "Next.js 14 best practices",
      type: "suggestion" as const,
      count: 156,
    },
    {
      id: "2",
      query: "React TypeScript patterns 2024",
      type: "trending" as const,
      count: 89,
    },
    {
      id: "3",
      query: "Tailwind CSS responsive design",
      type: "history" as const,
      timestamp: "2024-01-20T10:30:00Z",
    },
  ];

  const handleDemoSearch = async (query: string) => {
    toast({
      title: "🔍 Demo Search Started",
      description: `Searching for: "${query}"`,
    });

    // Simulate search with mock data
    setTimeout(() => {
      setDemoStep(2);
    }, 1500);
  };

  const handleShowPreview = () => {
    setDemoStep(2);
    // Simulate showing preview with mock results
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-emerald-600/10 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-blue-400" />
            Enhanced Web Search Demo
          </CardTitle>
          <p className="text-slate-300">
            Experience the next generation of AI-powered web search with full
            transparency and control
          </p>
        </CardHeader>
      </Card>

      {/* Progress Steps */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Demo Progress</h3>
            <Badge
              variant="outline"
              className="text-blue-400 border-blue-400/50"
            >
              Step {demoStep + 1} of {demoSteps.length}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {demoSteps.map((step, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border transition-all duration-300 ${
                  index <= demoStep
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                    : "bg-slate-700/30 border-slate-600/50 text-slate-400"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {index < demoStep ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : index === demoStep ? (
                    <div className="animate-pulse w-4 h-4 bg-blue-400 rounded-full" />
                  ) : (
                    <div className="w-4 h-4 bg-slate-500 rounded-full" />
                  )}
                  <span className="text-sm font-medium">{step.title}</span>
                </div>
                <p className="text-xs opacity-80">{step.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Demo Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Controls */}
        <div className="space-y-6">
          {/* Enhanced Search Input */}
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-400" />
                Manual Search Input
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedSearchInput
                value=""
                onChange={() => {}}
                onSearch={handleDemoSearch}
                onClear={() => {}}
                suggestions={mockSuggestions}
                recentSearches={mockSuggestions.filter(
                  (s) => s.type === "history"
                )}
                placeholder="Try: 'Next.js 14 best practices'"
                className="w-full"
              />
              <div className="mt-4 text-sm text-slate-400">
                <p>✨ Features:</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Real-time search suggestions</li>
                  <li>Search history with timestamps</li>
                  <li>Keyboard navigation (↑↓ arrows)</li>
                  <li>Manual search without sending message</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Search Controls */}
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-400" />
                Advanced Search Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SearchControls
                settings={settings}
                onSettingsChange={updateSettings}
                availableProviders={[
                  { id: "tavily", name: "Tavily", isConfigured: true },
                  { id: "serper", name: "Serper (Google)", isConfigured: true },
                  { id: "brave", name: "Brave Search", isConfigured: false },
                ]}
              />
              <div className="mt-4 text-sm text-slate-400">
                <p>⚙️ Customize:</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Search provider (Tavily, Serper, Auto)</li>
                  <li>Time range (day, week, month, year)</li>
                  <li>Language and region targeting</li>
                  <li>Content type and safe search</li>
                  <li>Number of results (1-50)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {/* Mock Search Results */}
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <Globe className="h-5 w-5 text-emerald-400" />
                Search Results Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {demoStep >= 2 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">
                      Found {mockSearchResults.length} results in 1.2s
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Tavily
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {mockSearchResults.map((result, index) => (
                      <div
                        key={result.id}
                        className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <img
                                src={result.favicon}
                                alt=""
                                className="w-4 h-4 rounded-sm"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                              <span className="text-xs text-slate-400">
                                {result.domain}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-xs px-1 py-0"
                              >
                                #{index + 1}
                              </Badge>
                            </div>
                            <h4 className="font-medium text-white text-sm mb-1">
                              {result.title}
                            </h4>
                            <p className="text-slate-300 text-xs line-clamp-2">
                              {result.snippet}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(
                                  result.publishedDate
                                ).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1 text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" />
                                Quality: {Math.round(result.score * 100)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDemoStep(3)}
                      className="bg-slate-700/30 border-slate-600/50"
                    >
                      Select Results
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setDemoStep(4)}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600"
                    >
                      Use All Results
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Search results will appear here</p>
                  <p className="text-xs mt-1">
                    Start by searching in the input above
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Benefits Summary */}
          <Card className="bg-gradient-to-br from-emerald-600/10 to-blue-600/10 border-emerald-500/30">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                Enhanced Search Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-300">
                    <strong>Transparency:</strong> See exactly what the AI is
                    using
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-300">
                    <strong>Control:</strong> Choose specific results to include
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-300">
                    <strong>Quality:</strong> Visual indicators for result
                    relevance
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-300">
                    <strong>Efficiency:</strong> Manual search without sending
                    messages
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-300">
                    <strong>Intelligence:</strong> AI-powered suggestions and
                    history
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Ready to try Enhanced Search?
              </h3>
              <p className="text-slate-400 text-sm">
                Start using manual search and result selection in your
                conversations
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDemoStep(0)}
                className="bg-slate-700/30 border-slate-600/50"
              >
                Reset Demo
              </Button>
              <Button
                onClick={handleShowPreview}
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                Try Manual Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
