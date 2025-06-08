"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import UserProfile from "@/components/auth/UserProfile";
import { useChat } from "@/hooks/useChat";
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
  AlertCircle,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params?.id as string;

  // State management
  const [selectedModel, setSelectedModel] = useState<"gpt-4" | "gpt-3.5-turbo">(
    "gpt-4"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [visualizationMode, setVisualizationMode] = useState(false);
  const [message, setMessage] = useState("");
  const [conversationSentiment, setConversationSentiment] =
    useState("creative");
  const [showConversationThreads, setShowConversationThreads] = useState(false);
  const [workspaceMode, setWorkspaceMode] = useState(false);
  const [showConversationArtifacts, setShowConversationArtifacts] =
    useState(false);

  // Chat functionality using our custom hook
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    clearError,
    setMessages,
  } = useChat({
    conversationId: chatId,
    model: selectedModel,
    onMessageReceived: (message) => {
      // Could add analytics or other side effects here
      console.log("New message received:", message);
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  // Load existing messages on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/conversations/${chatId}/messages`);
        if (response.ok) {
          const data = await response.json();
          // Transform database messages to chat format
          const transformedMessages = data.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            model: msg.model,
          }));
          setMessages(transformedMessages);
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
    };

    if (chatId) {
      loadMessages();
    }
  }, [chatId, setMessages]);

  // Find the AI model for this chat
  const currentAiModel =
    aiModels.find((model) => model.id === selectedModel) || aiModels[0];

  // Redirect if no chat ID
  useEffect(() => {
    if (!chatId) {
      router.push("/");
    }
  }, [chatId, router]);

  if (!chatId) {
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

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const messageContent = message.trim();
    setMessage(""); // Clear input immediately for better UX

    await sendMessage(messageContent);
  };

  // Handle key press in textarea
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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
    const totalMessages = messages.length;
    const wordCount = messages.reduce(
      (acc, msg) => acc + msg.content.split(" ").length,
      0
    );

    return {
      title: `Chat with ${currentAiModel.name}`,
      summary:
        "An engaging discussion with sophisticated AI assistance, showcasing collaborative problem-solving.",
      stats: { totalMessages, wordCount, duration: "Active" },
      insights: [
        `Primary model: ${currentAiModel.name}`,
        "Tone: Collaborative",
      ],
      keyQuotes: messages
        .filter((msg) => msg.role === "assistant")
        .slice(-2)
        .map((msg) => msg.content.slice(0, 80) + "..."),
      model: currentAiModel,
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

              {artifact.keyQuotes.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-white font-medium">Recent Quotes</h4>
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
              )}

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
                  Export
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
      <div className="min-h-screen relative">
        {/* Dynamic Background */}
        <div
          className={`fixed inset-0 bg-gradient-to-br ${getSentimentGradient(
            conversationSentiment
          )} transition-all duration-1000`}
        />
        <FloatingParticles />

        {/* Main Interface */}
        <div className="relative z-10 min-h-screen flex">
          {/* Sidebar */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ x: -400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -400, opacity: 0 }}
                className="w-80 bg-black/30 backdrop-blur-2xl border-r border-white/10"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-8">
                    <ConversationalGlassLogo />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSidebarOpen(false)}
                      className="text-white/60 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Model Selection */}
                  <div className="mb-6">
                    <h3 className="text-white text-sm font-medium mb-3">
                      AI Model
                    </h3>
                    <div className="space-y-2">
                      {["gpt-4", "gpt-3.5-turbo"].map((modelId) => {
                        const model = aiModels.find((m) => m.id === modelId);
                        if (!model) return null;

                        return (
                          <Button
                            key={modelId}
                            variant={
                              selectedModel === modelId ? "default" : "ghost"
                            }
                            className={`w-full justify-start ${
                              selectedModel === modelId
                                ? `bg-gradient-to-r ${model.color} text-white`
                                : "text-white/60 hover:text-white hover:bg-white/10"
                            }`}
                            onClick={() => setSelectedModel(modelId as any)}
                          >
                            <span className="mr-3 text-lg">{model.avatar}</span>
                            <div className="text-left">
                              <div className="font-medium">{model.name}</div>
                              <div className="text-xs opacity-60">
                                {model.personality}
                              </div>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Chat Controls */}
                  <div className="space-y-3">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-white/60 hover:text-white"
                      onClick={() => setShowConversationArtifacts(true)}
                    >
                      <BarChart3 className="w-4 h-4 mr-3" />
                      Conversation Artifacts
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-white/60 hover:text-white"
                      onClick={() =>
                        setShowConversationThreads(!showConversationThreads)
                      }
                    >
                      <GitBranch className="w-4 h-4 mr-3" />
                      Thread Visualization
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-white/60 hover:text-white"
                      onClick={() => setFocusMode(!focusMode)}
                    >
                      <Focus className="w-4 h-4 mr-3" />
                      Focus Mode
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 bg-black/20 backdrop-blur-xl border-b border-white/10">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="text-white/60 hover:text-white"
                >
                  <Menu className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-r ${currentAiModel.color} flex items-center justify-center text-lg`}
                  >
                    {currentAiModel.avatar}
                  </div>
                  <div>
                    <h1 className="text-white font-semibold">
                      {currentAiModel.name}
                    </h1>
                    <p className="text-white/60 text-sm">
                      {currentAiModel.personality}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isStreaming && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={stopStreaming}
                    className="border-red-400/50 text-red-400 hover:bg-red-400/10"
                  >
                    <Square className="w-3 h-3 mr-2" />
                    Stop
                  </Button>
                )}
                <UserProfile />
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mx-6 mt-4">
                <Alert className="bg-red-900/50 border-red-500/50 text-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    {error}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearError}
                      className="text-red-200 hover:text-white h-6 px-2"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-8">
                <AnimatePresence mode="popLayout">
                  {messages.map((msg, index) => {
                    const distanceFromLatest = messages.length - index - 1;
                    const perspective = Math.max(
                      0,
                      1 - distanceFromLatest * 0.1
                    );

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className={`flex ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        } relative group`}
                        style={{
                          transformStyle: "preserve-3d",
                          transform: `perspective(1000px) translateZ(${
                            -distanceFromLatest * 10
                          }px)`,
                        }}
                      >
                        <div
                          className={`max-w-2xl ${
                            msg.role === "user" ? "order-2" : "order-1"
                          }`}
                        >
                          <motion.div
                            className={`p-6 rounded-3xl backdrop-blur-xl border relative overflow-hidden ${
                              msg.role === "user"
                                ? `bg-gradient-to-br from-purple-500/90 to-pink-500/90 text-white border-purple-300/20 shadow-2xl shadow-purple-500/20 transform rotate-1`
                                : `bg-white/5 text-white border-white/10 shadow-2xl shadow-black/20 transform -rotate-0.5`
                            }`}
                            whileHover={{
                              scale: 1.03,
                              y: -8,
                              rotateY: msg.role === "user" ? -2 : 2,
                            }}
                          >
                            {/* Message glow effect based on AI personality */}
                            {msg.role === "assistant" && (
                              <div
                                className={`absolute inset-0 bg-gradient-to-r ${currentAiModel.color} opacity-5 rounded-3xl`}
                              />
                            )}

                            {/* Message content */}
                            <div className="relative z-10">
                              <motion.div
                                className="leading-relaxed"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                              >
                                {/* Streaming indicator */}
                                {msg.isStreaming ? (
                                  <div className="flex items-center gap-2">
                                    <span>{msg.content}</span>
                                    <motion.span
                                      animate={{ opacity: [1, 0] }}
                                      transition={{
                                        duration: 1,
                                        repeat: Infinity,
                                      }}
                                      className="w-2 h-4 bg-current inline-block"
                                    />
                                  </div>
                                ) : (
                                  <span>{msg.content}</span>
                                )}

                                {/* Error indicator */}
                                {msg.error && (
                                  <div className="mt-2 text-red-300 text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {msg.error}
                                  </div>
                                )}
                              </motion.div>

                              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                                <motion.p
                                  className="text-xs opacity-60"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 0.6 }}
                                  transition={{ delay: 0.4 }}
                                >
                                  {new Date(msg.timestamp).toLocaleTimeString()}
                                </motion.p>

                                {msg.role === "assistant" && (
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${currentAiModel.color} text-white/90`}
                                    >
                                      {currentAiModel.personality}
                                    </div>
                                    <div className="text-lg">
                                      {currentAiModel.avatar}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Message actions */}
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
                                  onClick={() =>
                                    navigator.clipboard.writeText(msg.content)
                                  }
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                              </div>
                            </motion.div>
                          </motion.div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Empty state */}
                {messages.length === 0 && !isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-12"
                  >
                    <div
                      className={`w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r ${currentAiModel.color} flex items-center justify-center text-3xl`}
                    >
                      {currentAiModel.avatar}
                    </div>
                    <h3 className="text-white text-xl font-semibold mb-2">
                      Start a conversation with {currentAiModel.name}
                    </h3>
                    <p className="text-white/60 max-w-md mx-auto">
                      {currentAiModel.description}. Ask me anything to get
                      started!
                    </p>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-white/10 bg-black/20 backdrop-blur-xl">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-end gap-3">
                  <div className="flex-1 relative">
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={`Message ${currentAiModel.name}...`}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none backdrop-blur-md focus:bg-white/15 transition-all min-h-[60px]"
                      rows={1}
                      onKeyDown={handleKeyPress}
                      disabled={isLoading}
                    />
                    <div className="absolute right-3 bottom-3 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/60 hover:text-white p-1"
                        disabled={isLoading}
                      >
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white/60 hover:text-white p-1"
                        disabled={isLoading}
                      >
                        <Mic className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || isLoading}
                    className={`bg-gradient-to-r ${
                      currentAiModel.color
                    } hover:opacity-90 text-white border-0 px-6 transition-all ${
                      isLoading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Zap className="w-4 h-4" />
                      </motion.div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Conversation Artifacts Sidebar */}
          <AnimatePresence>
            {showConversationArtifacts && (
              <motion.div
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                className="w-96 bg-black/30 backdrop-blur-2xl border-l border-white/10"
              >
                <ConversationArtifacts />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AuthGuard>
  );
}
