import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Settings,
  Clock,
  Globe,
  Shield,
  Image,
  Video,
  FileText,
  Zap,
  ChevronDown,
} from "lucide-react";

interface SearchSettings {
  maxResults: number;
  language: string;
  region: string;
  dateFilter: "all" | "day" | "week" | "month" | "year";
  safeSearch: "strict" | "moderate" | "off";
  includeImages: boolean;
  includeVideos: boolean;
  provider: "auto" | "tavily" | "serper" | "brave";
  searchType: "general" | "news" | "academic" | "shopping";
}

interface SearchControlsProps {
  settings: SearchSettings;
  onSettingsChange: (settings: SearchSettings) => void;
  availableProviders: Array<{
    id: string;
    name: string;
    isConfigured: boolean;
    capabilities?: any;
  }>;
  className?: string;
}

const DEFAULT_SETTINGS: SearchSettings = {
  maxResults: 10,
  language: "en",
  region: "us",
  dateFilter: "all",
  safeSearch: "moderate",
  includeImages: false,
  includeVideos: false,
  provider: "auto",
  searchType: "general",
};

export function SearchControls({
  settings,
  onSettingsChange,
  availableProviders = [],
  className,
}: SearchControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateSetting = <K extends keyof SearchSettings>(
    key: K,
    value: SearchSettings[K]
  ) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const resetToDefaults = () => {
    onSettingsChange(DEFAULT_SETTINGS);
  };

  const getActiveSettingsCount = () => {
    return Object.entries(settings).filter(
      ([key, value]) => DEFAULT_SETTINGS[key as keyof SearchSettings] !== value
    ).length;
  };

  const activeCount = getActiveSettingsCount();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`relative bg-slate-700/30 border-slate-600/50 hover:bg-slate-600/50 text-slate-300 ${className}`}
        >
          <Settings className="h-4 w-4 mr-2" />
          Search Settings
          <ChevronDown className="h-3 w-3 ml-1" />
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs bg-blue-500 text-white"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 bg-slate-800/95 border-slate-700/50 backdrop-blur-sm"
        align="end"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-white">Search Settings</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToDefaults}
              className="h-7 px-2 text-xs text-slate-400 hover:text-white"
            >
              Reset
            </Button>
          </div>

          <div className="h-px bg-slate-700/50" />

          {/* Search Provider */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Search Provider
            </Label>
            <Select
              value={settings.provider}
              onValueChange={(value) =>
                updateSetting("provider", value as SearchSettings["provider"])
              }
            >
              <SelectTrigger className="bg-slate-700/30 border-slate-600/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="auto">Auto (Best Available)</SelectItem>
                {availableProviders.map((provider) => (
                  <SelectItem
                    key={provider.id}
                    value={provider.id}
                    disabled={!provider.isConfigured}
                  >
                    {provider.name}
                    {!provider.isConfigured && (
                      <span className="ml-2 text-xs text-slate-500">
                        (Not configured)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Max Results */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-300">
              Max Results: {settings.maxResults}
            </Label>
            <Slider
              value={[settings.maxResults]}
              onValueChange={([value]) => updateSetting("maxResults", value)}
              max={50}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>1</span>
              <span>50</span>
            </div>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Language
            </Label>
            <Select
              value={settings.language}
              onValueChange={(value) => updateSetting("language", value)}
            >
              <SelectTrigger className="bg-slate-700/30 border-slate-600/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="it">Italian</SelectItem>
                <SelectItem value="pt">Portuguese</SelectItem>
                <SelectItem value="ru">Russian</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
                <SelectItem value="ko">Korean</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Range
            </Label>
            <Select
              value={settings.dateFilter}
              onValueChange={(value) =>
                updateSetting(
                  "dateFilter",
                  value as SearchSettings["dateFilter"]
                )
              }
            >
              <SelectTrigger className="bg-slate-700/30 border-slate-600/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="day">Past Day</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
                <SelectItem value="year">Past Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Search Type
            </Label>
            <Select
              value={settings.searchType}
              onValueChange={(value) =>
                updateSetting(
                  "searchType",
                  value as SearchSettings["searchType"]
                )
              }
            >
              <SelectTrigger className="bg-slate-700/30 border-slate-600/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="general">General Web</SelectItem>
                <SelectItem value="news">News</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="shopping">Shopping</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Safe Search */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Safe Search
            </Label>
            <Select
              value={settings.safeSearch}
              onValueChange={(value) =>
                updateSetting(
                  "safeSearch",
                  value as SearchSettings["safeSearch"]
                )
              }
            >
              <SelectTrigger className="bg-slate-700/30 border-slate-600/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="strict">Strict</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="off">Off</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Media Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-slate-300">
              Include Media
            </Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-slate-400 flex items-center gap-2">
                  <Image className="h-3 w-3" />
                  Images
                </Label>
                <Switch
                  checked={settings.includeImages}
                  onCheckedChange={(checked) =>
                    updateSetting("includeImages", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-slate-400 flex items-center gap-2">
                  <Video className="h-3 w-3" />
                  Videos
                </Label>
                <Switch
                  checked={settings.includeVideos}
                  onCheckedChange={(checked) =>
                    updateSetting("includeVideos", checked)
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
