import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Globe,
  Clock,
  Star,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
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
  processingTime: number;
  totalResults: number;
  suggestions?: string[];
  onSelectResults: (selectedResults: SearchResult[]) => void;
  onRefineSearch: (newQuery: string) => void;
  onUseAllResults: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function SearchResultsPreview({
  results,
  query,
  provider,
  processingTime,
  totalResults,
  suggestions = [],
  onSelectResults,
  onRefineSearch,
  onUseAllResults,
  onCancel,
  isLoading = false,
}: SearchResultsPreviewProps) {
  const [selectedResults, setSelectedResults] = useState<Set<string>>(
    new Set(results.slice(0, 3).map((r) => r.id)) // Pre-select top 3 results
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

  const handleSelectAll = () => {
    setSelectedResults(new Set(results.map((r) => r.id)));
  };

  const handleSelectNone = () => {
    setSelectedResults(new Set());
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return "text-emerald-500";
    if (score >= 0.6) return "text-yellow-500";
    return "text-orange-500";
  };

  const getQualityIcon = (score: number) => {
    if (score >= 0.8) return CheckCircle2;
    if (score >= 0.6) return AlertCircle;
    return AlertCircle;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-400" />
            Search Results for "{query}"
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Badge variant="outline" className="text-xs">
              {provider}
            </Badge>
            <span>{processingTime}ms</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Found {totalResults} results</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSelectAll}
              className="h-7 px-2 text-xs"
            >
              Select All
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSelectNone}
              className="h-7 px-2 text-xs"
            >
              Select None
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Results */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {results.map((result, index) => {
              const isSelected = selectedResults.has(result.id);
              const isExpanded = expandedResults.has(result.id);
              const QualityIcon = getQualityIcon(result.score);

              return (
                <div
                  key={result.id}
                  className={cn(
                    "p-4 rounded-lg border transition-all duration-200",
                    isSelected
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-slate-700/30 border-slate-600/50 hover:border-slate-500/70"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleResultSelection(result.id)}
                      className="mt-1"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {result.favicon && (
                              <img
                                src={result.favicon}
                                alt=""
                                className="w-4 h-4 rounded-sm"
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
                              className="text-xs px-1 py-0"
                            >
                              #{index + 1}
                            </Badge>
                          </div>

                          <h3 className="font-medium text-white text-sm leading-snug mb-2 line-clamp-2">
                            {result.title}
                          </h3>

                          <p
                            className={cn(
                              "text-slate-300 text-sm leading-relaxed",
                              isExpanded ? "" : "line-clamp-2"
                            )}
                          >
                            {result.snippet}
                          </p>

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-3 text-xs text-slate-400">
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
                                onClick={() => toggleResultExpansion(result.id)}
                                className="h-6 w-6 p-0"
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
                                onClick={() =>
                                  window.open(result.url, "_blank")
                                }
                                className="h-6 w-6 p-0"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
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
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <Separator className="bg-slate-700/50" />
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2">
                Related searches:
              </h4>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="outline"
                    onClick={() => onRefineSearch(suggestion)}
                    className="h-7 px-3 text-xs bg-slate-700/30 border-slate-600/50 hover:bg-slate-600/50"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <Separator className="bg-slate-700/50" />
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {selectedResults.size} of {results.length} results selected
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              className="bg-slate-700/30 border-slate-600/50"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={onUseAllResults}
              className="bg-slate-700/30 border-slate-600/50"
            >
              Use All Results
            </Button>
            <Button
              onClick={handleUseSelected}
              disabled={selectedResults.size === 0}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
            >
              Use Selected ({selectedResults.size})
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
