# Conversational Glass AI

An AI chat application featuring real-time streaming responses, automatic stream recovery, and multi-LLM support.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

![Main Interface](./public/ui/main-welcom-ui.png)

## Features

-----

### Real-Time Streaming & Recovery

**Live Response Streaming** - All AI responses stream in real-time as they're generated, providing immediate feedback and natural conversation flow.

**Automatic Stream Recovery** - If a user refreshes the page or loses connection during an AI response, the system automatically detects the interruption and continues streaming from where it left off.

**Message Synchronization** - Real-time message sync ensures conversations stay synchronized across devices and browser sessions.

**Interrupted Response Handling** - Advanced persistence system saves streaming progress and recovers partial responses without data loss.

-----

### Voice Integration

**Speech-to-Text** - Users can speak their messages instead of typing using **Groq Whisper** integration for accurate voice transcription.

**Text-to-Speech** - Listen to AI responses with natural voice synthesis, supporting multiple languages and voices.

**Real-Time Voice Processing** - Low-latency voice interactions with streaming support for both input and output.

-----

### File Attachments & Web Search

**Multi-Modal Attachments** - Upload and process images, PDFs, documents, and text files with intelligent content extraction.

**PDF Text Extraction** - Automatic text extraction from PDF documents for AI processing.

**Real-Time Web Search** - Integration with **Tavily, Serper, and Brave Search APIs** for live web information during conversations.

**Search Integration** - Web search results are intelligently woven into AI responses with context awareness.

-----

### Multi-LLM Support

**OpenAI Integration** - Full support for **GPT-4, GPT-3.5 Turbo** with streaming responses and context preservation

**Anthropic Claude** - **Claude-3.5 Sonnet** and **Claude-3 Haiku** integration with personality-aware conversations

**Google Gemini** - **Gemini Pro** and **Gemini Flash** support with multi-modal capabilities

**Groq Acceleration** - Ultra-fast inference with **Llama models** for quick responses

**OpenRouter Access** - Gateway to **100+ additional AI models** with unified interface

**Context Preservation** - Model switching mid-conversation while maintaining context continuity

-----

### Glassmorphic Interface

**Glass Design** - Chat interface with glassmorphic effects, depth illusions, backdrop blur effects, and animations powered by Framer Motion.

**Responsive Design** - Adapts across mobile, tablet, and desktop devices with touch-optimized interactions.

**Boring Theme Mode** - Reduced animation theme option that minimizes visual effects for better performance and accessibility.

-----

### Security Features

**Clerk Authentication** - User management with social login and MFA support

**BYOK Architecture** - "**Bring Your Own Keys**" system with end-to-end encryption

**Data Protection** - Advanced encryption for sensitive data and API keys

**Privacy First** - **Zero-knowledge architecture** ensuring user data remains private and secure

