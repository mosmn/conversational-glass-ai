import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Volume2, VolumeX, Loader2, ChevronDown } from "lucide-react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { ENGLISH_VOICES, ARABIC_VOICES } from "@/lib/ai/voice";

interface TextToSpeechButtonProps {
  text: string;
  className?: string;
  size?: "sm" | "lg" | "default";
  variant?: "ghost" | "outline" | "secondary" | "default";
  showVoiceSelection?: boolean;
  defaultVoice?: string;
  language?: "en" | "ar";
}

export function TextToSpeechButton({
  text,
  className = "",
  size = "sm",
  variant = "ghost",
  showVoiceSelection = false,
  defaultVoice,
  language = "en",
}: TextToSpeechButtonProps) {
  const [selectedVoice, setSelectedVoice] = useState(
    defaultVoice || (language === "ar" ? "Ahmad-PlayAI" : "Fritz-PlayAI")
  );

  const { isPlaying, isGenerating, speak, stop, isSupported, canSpeak } =
    useTextToSpeech({
      voice: selectedVoice,
      language,
      model: language === "ar" ? "playai-tts-arabic" : "playai-tts",
    });

  const handleSpeak = async () => {
    if (isPlaying) {
      stop();
    } else {
      await speak(text, { voice: selectedVoice });
    }
  };

  const getButtonIcon = () => {
    if (isGenerating) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (isPlaying) {
      return <VolumeX className="h-4 w-4" />;
    }
    return <Volume2 className="h-4 w-4" />;
  };

  const getTooltipText = () => {
    if (!isSupported) {
      return "🚫 Text-to-speech not supported in this browser";
    }
    if (isGenerating) {
      return "🎤 Generating speech...";
    }
    if (isPlaying) {
      return `🔊 Playing with ${selectedVoice} (click to stop)`;
    }

    // Estimate token count (rough: 1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(text.length / 4);
    const isLongText = estimatedTokens > 1000;

    if (isLongText) {
      return `🔊 Listen to this message with ${selectedVoice}\n⚠️ Long text will be truncated (${estimatedTokens} tokens estimated)`;
    }

    return `🔊 Listen to this message with ${selectedVoice}`;
  };

  const availableVoices = language === "ar" ? ARABIC_VOICES : ENGLISH_VOICES;

  if (!isSupported) {
    return null; // Don't show button if TTS is not supported
  }

  if (showVoiceSelection) {
    return (
      <div className={`flex items-center ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size={size}
              variant={variant}
              onClick={handleSpeak}
              disabled={!canSpeak && !isPlaying}
              className="rounded-r-none border-r-0"
            >
              {getButtonIcon()}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getTooltipText()}</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  size={size}
                  variant={variant}
                  className="rounded-l-none border-l-0 px-2"
                  disabled={isGenerating}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>🎭 Choose voice ({availableVoices.length} available)</p>
            </TooltipContent>
          </Tooltip>

          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-xs font-medium text-slate-500">
              {language === "ar" ? "Arabic Voices" : "English Voices"}
            </div>
            <DropdownMenuSeparator />
            {availableVoices.map((voice) => (
              <DropdownMenuItem
                key={voice}
                onClick={() => setSelectedVoice(voice)}
                className={`cursor-pointer ${
                  selectedVoice === voice
                    ? "bg-emerald-500/10 text-emerald-400"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm">
                    {voice.replace("-PlayAI", "")}
                  </span>
                  {selectedVoice === voice && (
                    <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size={size}
          variant={variant}
          onClick={handleSpeak}
          disabled={!canSpeak && !isPlaying}
          className={`transition-all duration-200 ${
            isPlaying
              ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
              : "hover:text-emerald-400 hover:bg-emerald-500/10"
          } ${className}`}
        >
          {getButtonIcon()}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getTooltipText()}</p>
        {isPlaying && (
          <p className="text-xs text-slate-400 mt-1">
            Voice: {selectedVoice.replace("-PlayAI", "")}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// Quick TTS button without voice selection
export function QuickTTSButton({
  text,
  className = "",
  size = "sm",
}: Pick<TextToSpeechButtonProps, "text" | "className" | "size">) {
  return (
    <TextToSpeechButton
      text={text}
      className={className}
      size={size}
      variant="ghost"
      showVoiceSelection={false}
    />
  );
}

// TTS button with voice selection dropdown
export function AdvancedTTSButton({
  text,
  className = "",
  size = "sm",
  language = "en",
}: Pick<TextToSpeechButtonProps, "text" | "className" | "size" | "language">) {
  return (
    <TextToSpeechButton
      text={text}
      className={className}
      size={size}
      variant="outline"
      showVoiceSelection={true}
      language={language}
    />
  );
}
