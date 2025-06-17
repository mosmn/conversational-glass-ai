import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Search,
  Calendar,
  Star,
} from "lucide-react";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
  provider: string;
  score?: number;
  favicon?: string;
}

interface SearchReferencesProps {
  searchResults: SearchResult[];
  searchQuery?: string;
  searchProvider?: string;
  className?: string;
}

export function SearchReferences({
  searchResults,
  searchQuery,
  searchProvider,
  className = "",
}: SearchReferencesProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!searchResults || searchResults.length === 0) {
    return null;
  }

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return null;
    }
  };

  return (
    <div className={`mt-3 ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between p-2 h-auto bg-slate-800/30 border border-slate-700/50 hover:bg-slate-700/30 text-slate-300 hover:text-white transition-all duration-200"
          >
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium">
                Web Sources ({searchResults.length})
              </span>
              {searchProvider && (
                <Badge variant="outline" className="text-xs">
                  {searchProvider}
                </Badge>
              )}
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2">
          <div className="bg-slate-800/20 border border-slate-700/30 rounded-lg p-3 space-y-3">
            {searchQuery && (
              <div className="flex items-center gap-2 text-xs text-slate-400 pb-2 border-b border-slate-700/30">
                <Search className="h-3 w-3" />
                <span>Search query: "{searchQuery}"</span>
              </div>
            )}

            <div className="space-y-2">
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  className="group p-3 bg-slate-700/20 border border-slate-600/30 rounded-lg hover:bg-slate-700/30 hover:border-slate-600/50 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sm text-blue-400 hover:text-blue-300 transition-colors line-clamp-2 group-hover:underline"
                        >
                          {result.title}
                        </a>
                        <ExternalLink className="h-3 w-3 text-slate-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>

                      <div className="text-xs text-slate-400 mb-2 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {getDomain(result.url)}
                        </span>
                        {result.publishedDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(result.publishedDate)}
                          </span>
                        )}
                        {result.score && result.score > 0 && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {Math.round(result.score * 100)}%
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {result.snippet}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <span className="bg-slate-600/30 px-2 py-1 rounded">
                        [{index + 1}]
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-700/30">
              <div className="text-xs text-slate-500 text-center">
                💡 The AI assistant used these sources to provide accurate,
                up-to-date information
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
