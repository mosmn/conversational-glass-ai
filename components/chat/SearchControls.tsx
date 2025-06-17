import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
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

export function SearchControls({
  settings,
  onSettingsChange,
  availableProviders,
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
    onSettingsChange({
      maxResults: 10,
      language: "en",
      region: "us",
      dateFilter: "all",
      safeSearch: "moderate",
      includeImages: false,
      includeVideos: false,
      provider: "auto",
      searchType: "general",
    });
  };

  const getActiveSettingsCount = () => {
    const defaults: SearchSettings = {
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

    return Object.entries(settings).filter(
      ([key, value]) => defaults[key as keyof SearchSettings] !== value
    ).length;
  };

  const activeCount = getActiveSettingsCount();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`relative bg-slate-700/30 border-slate-600/50 hover:bg-slate-600/50 ${className}`}
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

          <Separator className="bg-slate-700/50" />

          {/* Search Provider */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Search Provider
            </Label>
            <Select
              value={settings.provider}
              onValueChange={(value) => updateSetting("provider", value as any)}
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
                    <div className="flex items-center gap-2">
                      {provider.name}
                      {!provider.isConfigured && (
                        <Badge variant="outline" className="text-xs">
                          Not configured
                        </Badge>
                      )}
                    </div>
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

          {/* Time Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Range
            </Label>
            <Select
              value={settings.dateFilter}
              onValueChange={(value) =>
                updateSetting("dateFilter", value as any)
              }
            >
              <SelectTrigger className="bg-slate-700/30 border-slate-600/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all">Any time</SelectItem>
                <SelectItem value="day">Past 24 hours</SelectItem>
                <SelectItem value="week">Past week</SelectItem>
                <SelectItem value="month">Past month</SelectItem>
                <SelectItem value="year">Past year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Language & Region */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-300">
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
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-300">
                Region
              </Label>
              <Select
                value={settings.region}
                onValueChange={(value) => updateSetting("region", value)}
              >
                <SelectTrigger className="bg-slate-700/30 border-slate-600/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="uk">United Kingdom</SelectItem>
                  <SelectItem value="ca">Canada</SelectItem>
                  <SelectItem value="au">Australia</SelectItem>
                  <SelectItem value="de">Germany</SelectItem>
                  <SelectItem value="fr">France</SelectItem>
                  <SelectItem value="es">Spain</SelectItem>
                  <SelectItem value="it">Italy</SelectItem>
                  <SelectItem value="jp">Japan</SelectItem>
                  <SelectItem value="br">Brazil</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                updateSetting("searchType", value as any)
              }
            >
              <SelectTrigger className="bg-slate-700/30 border-slate-600/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="general">General Web</SelectItem>
                <SelectItem value="news">News Articles</SelectItem>
                <SelectItem value="academic">Academic Papers</SelectItem>
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
                updateSetting("safeSearch", value as any)
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

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-300">Images</span>
              </div>
              <Switch
                checked={settings.includeImages}
                onCheckedChange={(checked) =>
                  updateSetting("includeImages", checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-300">Videos</span>
              </div>
              <Switch
                checked={settings.includeVideos}
                onCheckedChange={(checked) =>
                  updateSetting("includeVideos", checked)
                }
              />
            </div>
          </div>

          <Separator className="bg-slate-700/50" />

          {/* Current Settings Summary */}
          <div className="text-xs text-slate-400 space-y-1">
            <div>
              Provider:{" "}
              <span className="text-slate-300">{settings.provider}</span>
            </div>
            <div>
              Results:{" "}
              <span className="text-slate-300">{settings.maxResults}</span>
            </div>
            <div>
              Time:{" "}
              <span className="text-slate-300">{settings.dateFilter}</span>
            </div>
            <div>
              Region:{" "}
              <span className="text-slate-300">
                {settings.region.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
