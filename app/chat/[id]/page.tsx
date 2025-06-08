"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import UserProfile from "@/components/auth/UserProfile";
import {
  MessageSquare,
  Search,
  Menu,
  X,
  Send,
  Mic,
  Paperclip,
  MoreHorizontal,
  Eye,
  GitBranch,
  Focus,
  BarChart3,
  Share,
  Download,
  Sparkles,
  Zap,
  Brain,
  Palette,
  Split,
  Copy,
  Heart,
  ArrowLeft,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import ConversationalGlassLogo from "@/components/ConversationalGlassLogo";

// Enhanced time-based gradient colors with more sophistication
const getTimeBasedGradient = () => {
  const hour = new Date().getHours();
  if (hour < 6) return "from-indigo-900 via-purple-900 to-pink-900"; // Deep night
  if (hour < 8) return "from-purple-800 via-pink-800 to-orange-800"; // Dawn
  if (hour < 12) return "from-blue-400 via-cyan-400 to-teal-400"; // Morning
  if (hour < 16) return "from-yellow-400 via-orange-400 to-red-400"; // Afternoon
  if (hour < 20) return "from-orange-400 via-red-400 to-pink-400"; // Evening
  return "from-purple-600 via-pink-600 to-red-600"; // Night
};

// Conversation sentiment colors
const getSentimentGradient = (sentiment: string) => {
  switch (sentiment) {
    case "technical":
      return "from-blue-600 via-cyan-600 to-teal-600";
    case "creative":
      return "from-orange-500 via-red-500 to-pink-500";
    case "problem-solving":
      return "from-purple-600 via-pink-600 to-indigo-600";
    default:
      return getTimeBasedGradient();
  }
};

// Revolutionary AI Models with unique visual identities and personalities
const aiModels = [
  {
    id: "gpt-4",
    name: "GPT-4",
    personality: "Analytical Genius",
    description: "Logical, precise, methodical thinking",
    color: "from-blue-500 to-cyan-500",
    avatar: "🧠",
    traits: ["logical", "precise", "thorough"],
    mood: "focused",
    style: "geometric",
    preferredSentiment: "technical",
  },
  {
    id: "claude",
    name: "Claude",
    personality: "Creative Virtuoso",
    description: "Sophisticated, thoughtful, nuanced",
    color: "from-purple-500 to-pink-500",
    avatar: "🎨",
    traits: ["artistic", "empathetic", "nuanced"],
    mood: "inspired",
    style: "flowing",
    preferredSentiment: "creative",
  },
  {
    id: "gemini",
    name: "Gemini",
    personality: "Futuristic Innovator",
    description: "Cutting-edge, adaptive, lightning-fast",
    color: "from-green-500 to-emerald-500",
    avatar: "⚡",
    traits: ["adaptive", "fast", "innovative"],
    mood: "electric",
    style: "sharp",
    preferredSentiment: "problem-solving",
  },
  {
    id: "llama",
    name: "Llama",
    personality: "Practical Sage",
    description: "Down-to-earth, reliable, wise",
    color: "from-orange-500 to-red-500",
    avatar: "🦙",
    traits: ["reliable", "grounded", "wise"],
    mood: "steady",
    style: "organic",
    preferredSentiment: "creative",
  },
];

// Mock chat data - in real app this would come from API/database
const mockChats = {
  "1": {
    id: "1",
    title: "Creative Writing Project",
    preview: "Help me write a sci-fi story about...",
    timestamp: "2 hours ago",
    sentiment: "creative",
    model: "claude",
    messages: [
      {
        role: "user",
        content: "Help me write a sci-fi story about time travel",
        timestamp: "2:30 PM",
      },
      {
        role: "assistant",
        content:
          "I'd love to help you craft a compelling time travel story! What if time travel wasn't about changing the past, but about experiencing multiple timelines simultaneously? We could explore a protagonist who discovers they can 'layer' themselves across different temporal possibilities...",
        timestamp: "2:31 PM",
      },
      {
        role: "user",
        content:
          "That's fascinating! How would the character experience these multiple timelines? Would they be aware of all versions?",
        timestamp: "2:33 PM",
      },
      {
        role: "assistant",
        content:
          "Excellent question! I imagine it like this: the character experiences a kind of 'temporal synesthesia' where each timeline has its own sensory signature. They might taste copper when accessing the timeline where they became a scientist, or feel a cool breeze when exploring the path where they moved to the coast. The challenge becomes learning to navigate these layered experiences without losing their sense of self.",
        timestamp: "2:34 PM",
      },
    ],
  },
  "2": {
    id: "2",
    title: "Debug React Performance",
    preview: "My React app is running slowly...",
    timestamp: "1 day ago",
    sentiment: "technical",
    model: "gpt-4",
    messages: [
      {
        role: "user",
        content:
          "My React app is running slowly. How can I identify performance bottlenecks?",
        timestamp: "Yesterday 3:15 PM",
      },
      {
        role: "assistant",
        content:
          "Let's systematically identify those bottlenecks! Start with React DevTools Profiler - it's your best friend for performance debugging. Here's a step-by-step approach:\n\n1. **Profile renders**: Use the React DevTools Profiler to record a session while reproducing the slow behavior\n2. **Check for unnecessary re-renders**: Look for components that render frequently without prop/state changes\n3. **Analyze bundle size**: Use webpack-bundle-analyzer to identify heavy dependencies\n4. **Memory leaks**: Check for uncleared intervals, event listeners, or large objects not being garbage collected\n\nWhat specific slowness are you experiencing? Initial load, user interactions, or something else?",
        timestamp: "Yesterday 3:16 PM",
      },
    ],
  },
};

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params?.id as string;

  // Get chat data based on ID
  const currentChat = mockChats[chatId as keyof typeof mockChats];

  // Find the AI model for this chat
  const selectedModel =
    aiModels.find((model) => model.id === currentChat?.model) || aiModels[0];

  // State management
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [visualizationMode, setVisualizationMode] = useState(false);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationSentiment, setConversationSentiment] = useState(
    currentChat?.sentiment || "creative"
  );
  const [showConversationThreads, setShowConversationThreads] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState(false);
  const [showConversationArtifacts, setShowConversationArtifacts] =
    useState(false);

  // Redirect if chat not found
  useEffect(() => {
    if (!currentChat) {
      router.push("/");
    }
  }, [currentChat, router]);

  if (!currentChat) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-2">Chat not found</h1>
          <p className="text-white/60 mb-4">
            The chat you're looking for doesn't exist.
          </p>
          <Button
            onClick={() => router.push("/")}
            className="bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Floating particles
  const FloatingParticles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-white/20 rounded-full"
          animate={{
            x: [0, Math.random() * 100 - 50],
            y: [0, Math.random() * 100 - 50],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: Math.random() * 10 + 10,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </div>
  );

  // Generate conversation artifact data
  const generateArtifact = () => {
    const totalMessages = currentChat.messages.length;
    const wordCount = currentChat.messages.reduce(
      (acc, msg) => acc + msg.content.split(" ").length,
      0
    );

    return {
      title: currentChat.title,
      summary:
        "An engaging discussion with sophisticated AI assistance, showcasing collaborative problem-solving.",
      stats: { totalMessages, wordCount, duration: "2h 15m" },
      insights: [
        `Primary focus: ${conversationSentiment}`,
        "Tone: Collaborative",
      ],
      keyQuotes: currentChat.messages
        .filter((msg) => msg.role === "assistant")
        .slice(0, 2)
        .map((msg) => msg.content.slice(0, 80) + "..."),
      model: selectedModel,
    };
  };

  // Conversation Artifacts Component
  const ConversationArtifacts = () => {
    const artifact = generateArtifact();

    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-xl font-semibold">
            Conversation Artifacts
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConversationArtifacts(false)}
            className="text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-white/20 backdrop-blur-xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`w-16 h-16 rounded-full bg-gradient-to-r ${artifact.model.color} flex items-center justify-center text-2xl`}
                >
                  {artifact.model.avatar}
                </div>
                <div>
                  <h3 className="text-white text-lg font-semibold">
                    {artifact.title}
                  </h3>
                  <p className="text-white/60 text-sm">
                    {artifact.model.name} • {artifact.model.personality}
                  </p>
                </div>
              </div>

              <p className="text-white/80 text-sm leading-relaxed mb-6">
                {artifact.summary}
              </p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-white text-2xl font-bold">
                    {artifact.stats.totalMessages}
                  </div>
                  <div className="text-white/60 text-xs">Messages</div>
                </div>
                <div className="text-center">
                  <div className="text-white text-2xl font-bold">
                    {artifact.stats.wordCount}
                  </div>
                  <div className="text-white/60 text-xs">Words</div>
                </div>
                <div className="text-center">
                  <div className="text-white text-2xl font-bold">
                    {artifact.stats.duration}
                  </div>
                  <div className="text-white/60 text-xs">Duration</div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-white font-medium mb-3">Key Insights</h4>
                <div className="space-y-2">
                  {artifact.insights.map((insight, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-yellow-400" />
                      <span className="text-white/70 text-sm">{insight}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-white font-medium">Memorable Quotes</h4>
                {artifact.keyQuotes.map((quote, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white/10 rounded-lg p-4 border-l-4 border-purple-400"
                  >
                    <p className="text-white/90 text-sm italic">"{quote}"</p>
                  </motion.div>
                ))}
              </div>

              <div className="flex gap-3 mt-8">
                <Button className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  };

  return (
    <AuthGuard>
      <div className="h-screen flex bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        <FloatingParticles />

        {/* Sidebar */}
        <AnimatePresence>
          {(sidebarOpen ||
            (typeof window !== "undefined" && window.innerWidth >= 768)) && (
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="w-80 bg-black/20 backdrop-blur-xl border-r border-white/10 flex flex-col relative z-20"
            >
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <ConversationalGlassLogo
                      size="sm"
                      animated={false}
                      showText={false}
                    />
                    <h2 className="text-white font-semibold text-lg">
                      Chat #{chatId}
                    </h2>
                  </div>
                  <div className="flex gap-2 items-center">
                    <UserProfile />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/")}
                      className="text-white/60 hover:text-white"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSidebarOpen(false)}
                      className="md:hidden text-white/60 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-white/60 text-sm">Chat Details</label>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-white text-sm font-medium mb-1">
                      {currentChat.title}
                    </div>
                    <div className="text-white/60 text-xs">
                      {currentChat.timestamp}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-white/10 text-white/80 border-white/20"
                      >
                        {conversationSentiment}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-white/10">
                <div className="space-y-3">
                  {/* Power User Mode Toggles */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFocusMode(!focusMode)}
                      className={`text-white/60 hover:text-white transition-all ${
                        focusMode
                          ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white"
                          : ""
                      }`}
                    >
                      <Focus className="w-4 h-4 mr-2" />
                      Focus
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setVisualizationMode(!visualizationMode)}
                      className={`text-white/60 hover:text-white transition-all ${
                        visualizationMode
                          ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-white"
                          : ""
                      }`}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Visualize
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setShowConversationThreads(!showConversationThreads)
                      }
                      className={`text-white/60 hover:text-white transition-all ${
                        showConversationThreads
                          ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-white"
                          : ""
                      }`}
                    >
                      <GitBranch className="w-4 h-4 mr-2" />
                      Threads
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setWorkspaceMode(!workspaceMode)}
                      className={`text-white/60 hover:text-white transition-all ${
                        workspaceMode
                          ? "bg-gradient-to-r from-orange-500/20 to-red-500/20 text-white"
                          : ""
                      }`}
                    >
                      <Split className="w-4 h-4 mr-2" />
                      Workspace
                    </Button>
                  </div>

                  {/* Killer Features */}
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setShowConversationArtifacts(!showConversationArtifacts)
                      }
                      className="w-full text-white/60 hover:text-white bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 transition-all"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Artifact ✨
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const sentiments = [
                          "technical",
                          "creative",
                          "problem-solving",
                        ];
                        const current = sentiments.indexOf(
                          conversationSentiment
                        );
                        setConversationSentiment(
                          sentiments[(current + 1) % sentiments.length]
                        );
                      }}
                      className="w-full text-white/60 hover:text-white text-xs"
                    >
                      <Palette className="w-4 h-4 mr-2" />
                      Mood: {conversationSentiment}
                    </Button>
                  </div>

                  {/* Current AI Model Status */}
                  <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full bg-gradient-to-r ${selectedModel.color} flex items-center justify-center text-sm relative`}
                      >
                        {selectedModel.avatar}
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-white/20"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">
                          {selectedModel.name}
                        </div>
                        <div className="text-white/60 text-xs">
                          {selectedModel.mood} mode
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedModel.traits.map((trait, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-xs bg-white/10 text-white/80 border-white/20"
                        >
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative">
          {showConversationArtifacts ? (
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-white/10 bg-black/20 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-semibold">
                    Conversation Artifacts
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConversationArtifacts(false)}
                    className="text-white/60 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ConversationArtifacts />
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-white/10 bg-black/20 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSidebarOpen(true)}
                      className="md:hidden text-white/60 hover:text-white"
                    >
                      <Menu className="w-4 h-4" />
                    </Button>
                    <ConversationalGlassLogo
                      size="sm"
                      animated={false}
                      showText={false}
                      className="md:hidden"
                    />
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-r ${selectedModel.color} flex items-center justify-center text-white font-bold relative`}
                      >
                        {selectedModel.avatar}
                        <div
                          className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-r ${selectedModel.color} border-2 border-white/20`}
                        />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">
                          {selectedModel.name}
                        </h3>
                        <p className="text-white/60 text-sm">
                          {selectedModel.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/60 hover:text-white"
                      onClick={() => setShowConversationArtifacts(true)}
                    >
                      <Sparkles className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/60 hover:text-white"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {visualizationMode ? (
                <div className="flex-1 p-8 flex items-center justify-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center"
                  >
                    <div className="w-64 h-64 mx-auto mb-6 relative">
                      <svg viewBox="0 0 200 200" className="w-full h-full">
                        <defs>
                          <linearGradient
                            id="convGradient"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="50%" stopColor="#06b6d4" />
                            <stop offset="100%" stopColor="#10b981" />
                          </linearGradient>
                        </defs>
                        <motion.path
                          d="M20,100 Q60,50 100,100 T180,100"
                          stroke="url(#convGradient)"
                          strokeWidth="4"
                          fill="none"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 2, ease: "easeInOut" }}
                        />
                        {[30, 70, 130, 170].map((x, i) => (
                          <motion.circle
                            key={i}
                            cx={x}
                            cy={100 + (i % 2 === 0 ? -20 : 20)}
                            r="8"
                            fill="white"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.3 + 1 }}
                          />
                        ))}
                      </svg>
                    </div>
                    <h3 className="text-white text-xl font-semibold mb-2">
                      Conversation Flow
                    </h3>
                    <p className="text-white/60 mb-6">
                      Your dialogue visualized as abstract art
                    </p>
                    <Button
                      onClick={() => setVisualizationMode(false)}
                      className="bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Return to Chat
                    </Button>
                  </motion.div>
                </div>
              ) : (
                <>
                  {/* Revolutionary "Conversation River" with depth and perspective */}
                  <div
                    className={`flex-1 overflow-y-auto p-6 space-y-8 ${
                      focusMode ? "bg-black/40" : ""
                    } conversation-river`}
                    style={{
                      background: focusMode
                        ? "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 20%, rgba(0,0,0,0.6) 80%, transparent 100%)"
                        : `linear-gradient(to bottom, ${getSentimentGradient(
                            conversationSentiment
                          )}/10 0%, transparent 20%, transparent 80%, ${getSentimentGradient(
                            conversationSentiment
                          )}/10 100%)`,
                    }}
                  >
                    <AnimatePresence>
                      {currentChat.messages.map((msg, index) => {
                        const isLatest =
                          index === currentChat.messages.length - 1;
                        const distanceFromLatest =
                          currentChat.messages.length - 1 - index;
                        const perspective = Math.max(
                          0.7,
                          1 - distanceFromLatest * 0.1
                        );

                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 50, scale: 0.8, z: -100 }}
                            animate={{
                              opacity:
                                focusMode && !isLatest ? 0.2 : perspective,
                              y: 0,
                              scale: focusMode && !isLatest ? 0.9 : perspective,
                              z: -distanceFromLatest * 20,
                              filter:
                                focusMode && !isLatest
                                  ? "blur(3px)"
                                  : `blur(${
                                      distanceFromLatest * 0.5
                                    }px) brightness(${
                                      0.7 + perspective * 0.3
                                    })`,
                              rotateX: distanceFromLatest * 2,
                            }}
                            transition={{
                              duration: 0.8,
                              type: "spring",
                              stiffness: 100,
                            }}
                            className={`flex ${
                              msg.role === "user"
                                ? "justify-end"
                                : "justify-start"
                            } relative group`}
                            whileHover={{
                              scale: 1.02,
                              y: -5,
                              z: 10,
                              transition: { duration: 0.2 },
                            }}
                            style={{
                              transformStyle: "preserve-3d",
                              transform: `perspective(1000px) translateZ(${
                                -distanceFromLatest * 10
                              }px)`,
                            }}
                          >
                            {/* Conversation Thread Branches (hover to reveal) */}
                            {showConversationThreads && (
                              <motion.div
                                initial={{
                                  opacity: 0,
                                  x: msg.role === "user" ? 20 : -20,
                                }}
                                animate={{ opacity: 0.6, x: 0 }}
                                className={`absolute ${
                                  msg.role === "user"
                                    ? "right-full mr-4"
                                    : "left-full ml-4"
                                } top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity`}
                              >
                                <div className="flex items-center gap-2">
                                  <GitBranch className="w-4 h-4 text-white/40" />
                                  <div className="text-xs text-white/40">
                                    Explore alternate path
                                  </div>
                                </div>
                              </motion.div>
                            )}

                            <div
                              className={`max-w-2xl ${
                                msg.role === "user" ? "order-2" : "order-1"
                              }`}
                            >
                              <motion.div
                                className={`p-6 rounded-3xl backdrop-blur-xl border relative overflow-hidden ${
                                  msg.role === "user"
                                    ? `bg-gradient-to-br from-purple-500/90 to-pink-500/90 text-white border-purple-300/20 shadow-2xl shadow-purple-500/20 transform rotate-1 ${
                                        selectedModel.style === "geometric"
                                          ? "rounded-lg"
                                          : selectedModel.style === "sharp"
                                          ? "rounded-none"
                                          : "rounded-3xl"
                                      }`
                                    : `bg-white/5 text-white border-white/10 shadow-2xl shadow-black/20 transform -rotate-0.5 ${
                                        selectedModel.style === "geometric"
                                          ? "rounded-lg border-2"
                                          : selectedModel.style === "sharp"
                                          ? "rounded-none border border-cyan-400/30"
                                          : "rounded-3xl"
                                      }`
                                }`}
                                whileHover={{
                                  scale: 1.03,
                                  y: -8,
                                  rotateY: msg.role === "user" ? -2 : 2,
                                  boxShadow:
                                    msg.role === "user"
                                      ? "0 25px 50px -12px rgba(168, 85, 247, 0.4)"
                                      : "0 25px 50px -12px rgba(255, 255, 255, 0.1)",
                                }}
                                style={{
                                  boxShadow: `0 ${20 * perspective}px ${
                                    40 * perspective
                                  }px -${12 * perspective}px ${
                                    msg.role === "user"
                                      ? "rgba(168, 85, 247, 0.3)"
                                      : "rgba(0, 0, 0, 0.4)"
                                  }`,
                                }}
                              >
                                {/* Message glow effect based on AI personality */}
                                {msg.role === "assistant" && (
                                  <div
                                    className={`absolute inset-0 bg-gradient-to-r ${selectedModel.color} opacity-5 rounded-3xl`}
                                  />
                                )}

                                {/* Message content with enhanced typography */}
                                <div className="relative z-10">
                                  <motion.p
                                    className={`leading-relaxed ${
                                      msg.role === "user"
                                        ? "text-base"
                                        : "text-base"
                                    }`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                  >
                                    {msg.content}
                                  </motion.p>

                                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                                    <motion.p
                                      className="text-xs opacity-60"
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 0.6 }}
                                      transition={{ delay: 0.4 }}
                                    >
                                      {msg.timestamp}
                                    </motion.p>

                                    {msg.role === "assistant" && (
                                      <div className="flex items-center gap-2">
                                        <div
                                          className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${selectedModel.color} text-white/90`}
                                        >
                                          {selectedModel.personality}
                                        </div>
                                        <div className="text-lg">
                                          {selectedModel.avatar}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Floating micro-interactions */}
                                <motion.div
                                  className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100"
                                  initial={{ scale: 0 }}
                                  whileHover={{ scale: 1 }}
                                >
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-6 h-6 p-0 bg-white/10 hover:bg-white/20 text-white/60"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="w-6 h-6 p-0 bg-white/10 hover:bg-white/20 text-white/60"
                                    >
                                      <Heart className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </motion.div>
                              </motion.div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {/* Conversation Flow Visualization */}
                    <motion.div
                      className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 hover:opacity-80 transition-opacity"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.3 }}
                    >
                      <svg width="20" height="200" className="text-white/20">
                        <motion.path
                          d="M10,0 Q10,50 10,100 Q10,150 10,200"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          strokeDasharray="5,5"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 2, delay: 1 }}
                        />
                      </svg>
                    </motion.div>
                  </div>

                  <div className="p-6 border-t border-white/10 bg-black/20 backdrop-blur-xl">
                    <div className="flex items-end gap-3">
                      <div className="flex-1 relative">
                        <Textarea
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Continue the conversation..."
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none backdrop-blur-md focus:bg-white/15 transition-all"
                          rows={1}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              // Handle message sending here
                            }
                          }}
                        />
                        <div className="absolute right-3 bottom-3 flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-white/60 hover:text-white p-1"
                          >
                            <Paperclip className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-white/60 hover:text-white p-1"
                          >
                            <Mic className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <Button
                        size="lg"
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
