"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  MessageCircle,
  Zap,
  Globe,
  Shield,
  Brain,
  ArrowRight,
  Play,
  Star,
  Users,
  Cpu,
  Palette,
  Github,
  Twitter,
} from "lucide-react";

export default function LandingPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const features = [
    {
      icon: Brain,
      title: "Multi-LLM Intelligence",
      description:
        "Switch between GPT-4, Claude-3, and Gemini seamlessly in one conversation.",
      color: "emerald",
    },
    {
      icon: Palette,
      title: "Glassmorphic Design",
      description:
        "Revolutionary conversation river interface with depth and spatial awareness.",
      color: "blue",
    },
    {
      icon: Zap,
      title: "Real-time Streaming",
      description:
        "Watch AI responses unfold in real-time with smooth, responsive interactions.",
      color: "purple",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description:
        "Your conversations are encrypted and stored securely with full privacy control.",
      color: "amber",
    },
    {
      icon: Globe,
      title: "Share & Collaborate",
      description:
        "Share conversations publicly or collaborate with team members effortlessly.",
      color: "rose",
    },
    {
      icon: Cpu,
      title: "Smart Context",
      description:
        "Intelligent context preservation across model switches and conversation branches.",
      color: "cyan",
    },
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Software Engineer",
      content:
        "The conversation river interface is absolutely revolutionary. It feels like the future of AI chat.",
      avatar: "👩‍💻",
    },
    {
      name: "Marcus Johnson",
      role: "Product Designer",
      content:
        "Finally, a chat interface that matches the sophistication of the AI models themselves.",
      avatar: "👨‍🎨",
    },
    {
      name: "Elena Rodriguez",
      role: "Data Scientist",
      content:
        "Being able to switch between models mid-conversation is a game-changer for my workflow.",
      avatar: "👩‍🔬",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(16, 185, 129, 0.15), transparent 40%)`,
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  Glass AI
                </h1>
                <p className="text-xs text-slate-400">
                  Conversational Intelligence
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <Link
                href="/features"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Features
              </Link>
              <Link
                href="/pricing"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/docs"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Docs
              </Link>
              <Link href="/sign-in">
                <Button
                  variant="outline"
                  className="border-slate-600 hover:border-emerald-500"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/chat/new">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  Start Chatting
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <div className="space-y-8">
            <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/30 px-4 py-1">
              🏆 T3 ChatCloneathon Winner
            </Badge>

            <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-white via-emerald-400 to-teal-400 bg-clip-text text-transparent leading-tight">
              The Future of
              <br />
              AI Conversations
            </h1>

            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Experience the revolutionary{" "}
              <span className="text-emerald-400 font-semibold">
                Conversation River
              </span>{" "}
              interface where chats flow in three-dimensional space with
              glassmorphic depth and multi-LLM intelligence.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Link href="/chat/new">
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8 py-4"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Try Glass AI Now
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-600 hover:border-emerald-500 text-lg px-8 py-4"
              >
                <Github className="mr-2 h-5 w-5" />
                View on GitHub
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center space-x-8 pt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400">3</div>
                <div className="text-sm text-slate-400">AI Models</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400">∞</div>
                <div className="text-sm text-slate-400">Conversations</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-400">1</div>
                <div className="text-sm text-slate-400">Interface</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Redefining AI Chat
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Every feature designed to enhance your conversation experience
              with cutting-edge technology and beautiful design.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/50 transition-all duration-300 group"
              >
                <CardContent className="p-8">
                  <div
                    className={`w-12 h-12 bg-${feature.color}-600/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                  >
                    <feature.icon
                      className={`h-6 w-6 text-${feature.color}-400`}
                    />
                  </div>
                  <h3 className="text-xl font-semibold mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Loved by Professionals
            </h2>
            <p className="text-xl text-slate-400">
              See what users are saying about Glass AI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card
                key={index}
                className="bg-slate-800/30 border-slate-700/50 backdrop-blur-sm"
              >
                <CardContent className="p-8">
                  <div className="flex items-center mb-6">
                    <div className="text-3xl mr-4">{testimonial.avatar}</div>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-slate-400">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-300 italic">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center mt-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 text-yellow-400 fill-current"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-emerald-500/30 backdrop-blur-sm">
            <CardContent className="p-12">
              <h2 className="text-4xl font-bold mb-6">
                Ready to Transform Your AI Experience?
              </h2>
              <p className="text-xl text-slate-300 mb-8">
                Join thousands of users who've already discovered the future of
                AI conversations.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                <Link href="/chat/new">
                  <Button
                    size="lg"
                    className="bg-white text-slate-900 hover:bg-slate-100 text-lg px-8 py-4"
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Start Your First Chat
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 hover:border-white text-lg px-8 py-4"
                  >
                    Create Free Account
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-700/50 bg-slate-800/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold">Glass AI</span>
              </div>
              <p className="text-slate-400">
                The future of AI conversations, available today.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <div className="space-y-2 text-slate-400">
                <Link
                  href="/features"
                  className="block hover:text-white transition-colors"
                >
                  Features
                </Link>
                <Link
                  href="/pricing"
                  className="block hover:text-white transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/changelog"
                  className="block hover:text-white transition-colors"
                >
                  Changelog
                </Link>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <div className="space-y-2 text-slate-400">
                <Link
                  href="/about"
                  className="block hover:text-white transition-colors"
                >
                  About
                </Link>
                <Link
                  href="/blog"
                  className="block hover:text-white transition-colors"
                >
                  Blog
                </Link>
                <Link
                  href="/careers"
                  className="block hover:text-white transition-colors"
                >
                  Careers
                </Link>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Connect</h3>
              <div className="flex space-x-4">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Twitter className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Github className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-700/50 mt-12 pt-8 flex items-center justify-between">
            <p className="text-slate-400">
              © 2024 Glass AI. All rights reserved.
            </p>
            <p className="text-slate-400">Built for T3 ChatCloneathon 2024</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
