import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Globe,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  domain: string;
  publishedDate?: string;
  score: number;
  favicon?: string;
  metadata?: {
    provider: string;
    position: number;
    language?: string;
  };
}

interface SearchResultsPreviewProps {
  results: SearchResult[];
  query: string;
  provider: string;
  processingTime?: number;
  totalResults?: number;
  suggestions?: string[];
  onSelectResults: (selectedResults: SearchResult[]) => void;
  onRefineSearch?: (newQuery: string) => void;
  onUseAllResults: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SearchResultsPreview({
  results = [],
  query,
  provider,
  processingTime = 0,
  totalResults = 0,
  suggestions = [],
  onSelectResults,
  onRefineSearch,
  onUseAllResults,
  onCancel,
  isLoading = false,
}: SearchResultsPreviewProps) {
  const [selectedResults, setSelectedResults] = useState<Set<string>>(
    new Set(results.slice(0, 3).map((r) => r.id))
  );
  const [expandedResults, setExpandedResults] = useState<Set<string>>(
    new Set()
  );

  const toggleResultSelection = (resultId: string) => {
    const newSelected = new Set(selectedResults);
    if (newSelected.has(resultId)) {
      newSelected.delete(resultId);
    } else {
      newSelected.add(resultId);
    }
    setSelectedResults(newSelected);
  };

  const toggleResultExpansion = (resultId: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId);
    } else {
      newExpanded.add(resultId);
    }
    setExpandedResults(newExpanded);
  };

  const handleUseSelected = () => {
    const selected = results.filter((r) => selectedResults.has(r.id));
    onSelectResults(selected);
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return "text-emerald-400";
    if (score >= 0.6) return "text-yellow-400";
    return "text-orange-400";
  };

  const getQualityIcon = (score: number) => {
    if (score >= 0.8) return CheckCircle2;
    if (score >= 0.6) return AlertCircle;
    return AlertCircle;
  };

  if (!results || results.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto bg-slate-800/95 border-slate-700/50 backdrop-blur-sm shadow-2xl">
        <CardContent className="p-8 text-center">
          <Globe className="h-12 w-12 mx-auto mb-4 text-slate-500" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No Search Results
          </h3>
          <p className="text-slate-400 mb-4">
            No results found for your search query "{query}".
          </p>
          <Button
            onClick={onCancel}
            variant="outline"
            className="bg-slate-700/30 border-slate-600/50 hover:bg-slate-600/50"
          >
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-5xl mx-auto bg-slate-800/95 border-slate-700/50 backdrop-blur-sm shadow-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-400" />
            Search Results for "{query}"
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="text-xs bg-slate-700/50 border-slate-600/50"
            >
              {provider}
            </Badge>
            {processingTime > 0 && (
              <span className="text-xs text-slate-400">{processingTime}ms</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Found {totalResults || results.length} results</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setSelectedResults(new Set(results.map((r) => r.id)))
              }
              className="h-7 px-3 text-xs hover:bg-slate-600/50"
            >
              Select All
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedResults(new Set())}
              className="h-7 px-3 text-xs hover:bg-slate-600/50"
            >
              Select None
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Results */}
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {results.map((result, index) => {
              const isSelected = selectedResults.has(result.id);
              const isExpanded = expandedResults.has(result.id);
              const QualityIcon = getQualityIcon(result.score);

              return (
                <div
                  key={result.id}
                  className={cn(
                    "p-4 rounded-lg border transition-all duration-200 cursor-pointer",
                    isSelected
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-slate-700/30 border-slate-600/50 hover:border-slate-500/70 hover:bg-slate-700/50"
                  )}
                  onClick={() => toggleResultSelection(result.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleResultSelection(result.id)}
                      className="mt-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {result.favicon && (
                          <img
                            src={result.favicon}
                            alt=""
                            className="w-4 h-4 rounded-sm shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                        <span className="text-xs text-slate-400 truncate">
                          {result.domain}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0.5 shrink-0 bg-slate-700/30 border-slate-600/50"
                        >
                          #{index + 1}
                        </Badge>
                      </div>

                      <h3 className="font-medium text-white text-sm leading-snug mb-2 pr-8">
                        {result.title}
                      </h3>

                      <p
                        className={cn(
                          "text-slate-300 text-sm leading-relaxed mb-3",
                          !isExpanded && "line-clamp-2"
                        )}
                      >
                        {result.snippet}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          {result.publishedDate && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(
                                result.publishedDate
                              ).toLocaleDateString()}
                            </div>
                          )}
                          <div
                            className={cn(
                              "flex items-center gap-1",
                              getQualityColor(result.score)
                            )}
                          >
                            <QualityIcon className="h-3 w-3" />
                            Quality: {Math.round(result.score * 100)}%
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleResultExpansion(result.id);
                            }}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(result.url, "_blank");
                            }}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-blue-400"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Search Suggestions */}
        {suggestions.length > 0 && onRefineSearch && (
          <div className="space-y-3">
            <div className="h-px bg-slate-700/50" />
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3">
                Related searches:
              </h4>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="outline"
                    onClick={() => onRefineSearch(suggestion)}
                    className="h-8 px-3 text-xs bg-slate-700/30 border-slate-600/50 hover:bg-slate-600/50 text-slate-300"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="h-px bg-slate-700/50" />
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-slate-400">
            {selectedResults.size} of {results.length} results selected
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="bg-slate-700/30 border-slate-600/50 hover:bg-slate-600/50"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={onUseAllResults}
              className="bg-slate-700/30 border-slate-600/50 hover:bg-slate-600/50"
            >
              Use All Results
            </Button>
            <Button
              onClick={handleUseSelected}
              disabled={selectedResults.size === 0}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50"
            >
              Use Selected ({selectedResults.size})
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
