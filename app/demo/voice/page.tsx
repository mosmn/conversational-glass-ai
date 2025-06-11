"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  VoiceInputButton,
  VoiceStatus,
} from "@/components/chat/VoiceInputButton";
import { VoiceVisualizer } from "@/components/chat/VoiceVisualizer";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { Mic, Copy, Trash2, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VoiceDemoPage() {
  const [transcribedText, setTranscribedText] = useState("");
  const [previousTranscriptions, setPreviousTranscriptions] = useState<
    Array<{ id: string; text: string; timestamp: Date }>
  >([]);
  const { toast } = useToast();

  const {
    isRecording,
    isTranscribing,
    formattedDuration,
    isSupported: isVoiceSupported,
    volume,
    toggleRecording,
  } = useVoiceInput({
    onTranscription: (text: string) => {
      const newTranscription = {
        id: Date.now().toString(),
        text,
        timestamp: new Date(),
      };
      setPreviousTranscriptions((prev) => [newTranscription, ...prev]);
    },
  });

  const handleVoiceTranscription = (text: string) => {
    setTranscribedText((prev) => (prev ? `${prev} ${text}` : text));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Text has been copied to your clipboard.",
    });
  };

  const clearText = () => {
    setTranscribedText("");
  };

  const clearHistory = () => {
    setPreviousTranscriptions([]);
  };

  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    } else {
      toast({
        title: "Text-to-speech not supported",
        description: "Your browser doesn't support text-to-speech.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
            🎤 Voice Input Demo
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Experience ultra-fast speech-to-text conversion powered by Groq's
            Whisper models. Click the microphone to start recording, then speak
            naturally.
          </p>

          {/* Voice Support Status */}
          <div className="flex justify-center">
            <Badge variant={isVoiceSupported ? "default" : "destructive"}>
              {isVoiceSupported
                ? "✅ Voice Input Supported"
                : "❌ Voice Input Not Supported"}
            </Badge>
          </div>
        </div>

        {/* Main Voice Input Card */}
        <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-emerald-400" />
              Voice Input Interface
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Voice Recording Status */}
            <VoiceStatus
              isRecording={isRecording}
              isTranscribing={isTranscribing}
              formattedDuration={formattedDuration}
              className="justify-center"
            />

            {/* Voice Visualizer - shows when recording */}
            {isRecording && (
              <div className="flex justify-center p-6 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                <div className="text-center space-y-4">
                  <VoiceVisualizer
                    volume={volume}
                    isActive={isRecording}
                    size="lg"
                    barCount={9}
                    className="mx-auto"
                  />
                  <div>
                    <div className="text-lg font-semibold text-emerald-400">
                      🎤 Listening to your voice...
                    </div>
                    <div className="text-sm text-slate-400">
                      Volume: {Math.round(volume * 100)}% • {formattedDuration}
                    </div>
                    <div className="text-xs text-slate-500 mt-2">
                      Speak clearly into your microphone
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Large Voice Input Button */}
            <div className="flex justify-center">
              <VoiceInputButton
                onTranscription={handleVoiceTranscription}
                size="lg"
                variant="default"
                className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
                standalone={true}
              />
            </div>

            {/* Transcribed Text Area */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Transcribed Text:
              </label>
              <Textarea
                value={transcribedText}
                onChange={(e) => setTranscribedText(e.target.value)}
                placeholder="Your transcribed speech will appear here..."
                className="min-h-[120px] bg-slate-700/30 border-slate-600/50 text-white placeholder-slate-500 resize-none"
                rows={5}
              />

              {/* Text Actions */}
              {transcribedText && (
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => speakText(transcribedText)}
                    className="border-slate-600/50 hover:bg-slate-700/50"
                  >
                    <Volume2 className="h-4 w-4 mr-1" />
                    Speak
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(transcribedText)}
                    className="border-slate-600/50 hover:bg-slate-700/50"
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearText}
                    className="border-red-600/50 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Previous Transcriptions */}
        {previousTranscriptions.length > 0 && (
          <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  📝 Transcription History
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearHistory}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear History
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {previousTranscriptions.map((transcription) => (
                  <div
                    key={transcription.id}
                    className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 group hover:border-slate-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-slate-200 flex-1">
                        {transcription.text}
                      </p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => speakText(transcription.text)}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-blue-400"
                        >
                          <Volume2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(transcription.text)}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-emerald-400"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {transcription.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feature Information */}
        <Card className="border-slate-700/50 bg-slate-800/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>🚀 Voice Input Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-emerald-400">
                  ⚡ Ultra-Fast Processing
                </h4>
                <p className="text-sm text-slate-400">
                  Powered by Groq's Whisper Large V3 Turbo model for
                  near-instant transcription.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-400">
                  🎯 High Accuracy
                </h4>
                <p className="text-sm text-slate-400">
                  Advanced speech recognition with noise cancellation and echo
                  suppression.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-purple-400">
                  🌐 Multi-Language
                </h4>
                <p className="text-sm text-slate-400">
                  Supports multiple languages with automatic language detection.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-yellow-400">
                  🔒 Privacy-First
                </h4>
                <p className="text-sm text-slate-400">
                  Audio processing with secure API endpoints and no data
                  retention.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
