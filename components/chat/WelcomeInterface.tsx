import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ConversationalGlassLogo from "@/components/ConversationalGlassLogo";

interface QuickAction {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}

interface WelcomeInterfaceProps {
  quickActions: QuickAction[];
  suggestedPrompts: string[];
  onPromptSelect: (prompt: string) => void;
}

export function WelcomeInterface({
  quickActions,
  suggestedPrompts,
  onPromptSelect,
}: WelcomeInterfaceProps) {
  return (
    <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8 px-4 sm:px-0">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex justify-center">
          <ConversationalGlassLogo
            size="lg"
            animated={true}
            showText={true}
            className="mb-2 sm:mb-4 scale-75 sm:scale-100"
          />
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400 bg-clip-text text-transparent">
          How can I help you today?
        </h1>
        <div className="space-y-2">
          <p className="text-base sm:text-lg text-slate-300">
            Choose an action below or start typing your question
          </p>
          <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">
            💡 <strong>Tip:</strong> Use the model selector above to pick the
            perfect AI for your task - Fast models for quick questions, Smart
            models for complex problems
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {quickActions.map((action) => (
          <Card
            key={action.title}
            className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 hover:border-slate-600 transition-all duration-200 cursor-pointer group"
          >
            <CardContent className="p-3 sm:p-6 text-center">
              <action.icon
                className={`h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 sm:mb-3 text-${action.color}-400 group-hover:scale-110 transition-transform`}
              />
              <h3 className="font-semibold mb-1 sm:mb-2 text-white text-sm sm:text-base">
                {action.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300">
                {action.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Suggested Prompts */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-semibold text-white">
          Suggested Prompts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
          {suggestedPrompts.map((prompt, index) => (
            <Button
              key={index}
              variant="outline"
              className="border-slate-600 hover:border-emerald-500 hover:bg-emerald-600/10 text-left justify-start h-auto p-3 sm:p-4 text-slate-200 hover:text-white"
              onClick={() => onPromptSelect(prompt)}
            >
              <div className="text-xs sm:text-sm">{prompt}</div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
