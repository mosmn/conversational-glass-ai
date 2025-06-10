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
    <div className="max-w-4xl mx-auto text-center space-y-8">
      <div className="space-y-6">
        <div className="flex justify-center">
          <ConversationalGlassLogo
            size="xl"
            animated={true}
            showText={true}
            className="mb-4"
          />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400 bg-clip-text text-transparent">
          How can I help you today?
        </h1>
        <p className="text-lg text-slate-300">
          Choose an action below or start typing your question
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Card
            key={action.title}
            className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 hover:border-slate-600 transition-all duration-200 cursor-pointer group"
          >
            <CardContent className="p-6 text-center">
              <action.icon
                className={`h-8 w-8 mx-auto mb-3 text-${action.color}-400 group-hover:scale-110 transition-transform`}
              />
              <h3 className="font-semibold mb-2 text-white">{action.title}</h3>
              <p className="text-sm text-slate-300">{action.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Suggested Prompts */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Suggested Prompts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {suggestedPrompts.map((prompt, index) => (
            <Button
              key={index}
              variant="outline"
              className="border-slate-600 hover:border-emerald-500 hover:bg-emerald-600/10 text-left justify-start h-auto p-4 text-slate-200 hover:text-white"
              onClick={() => onPromptSelect(prompt)}
            >
              <div className="text-sm">{prompt}</div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
