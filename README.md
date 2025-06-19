# Conversational Glass AI

An AI chat application featuring real-time streaming responses, automatic stream recovery, and multi-LLM support. Built for the T3 ChatCloneathon competition.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

![Main Interface](./public/ui/main-welcom-ui.png)

## Features

### Real-Time Streaming & Recovery

**Live Response Streaming** - All AI responses stream in real-time as they're generated, providing immediate feedback and natural conversation flow.

**Automatic Stream Recovery** - If a user refreshes the page or loses connection during an AI response, the system automatically detects the interruption and continues streaming from where it left off.

**Message Synchronization** - Real-time message sync ensures conversations stay synchronized across devices and browser sessions.

**Interrupted Response Handling** - Advanced persistence system saves streaming progress and recovers partial responses without data loss.

![Chat Interface](./public/ui/actual-chat.png)

### Voice Integration

**Speech-to-Text** - Users can speak their messages instead of typing using Groq Whisper integration for accurate voice transcription.

**Text-to-Speech** - Listen to AI responses with natural voice synthesis, supporting multiple languages and voices.

**Real-Time Voice Processing** - Low-latency voice interactions with streaming support for both input and output.

### File Attachments & Web Search

**Multi-Modal Attachments** - Upload and process images, PDFs, documents, and text files with intelligent content extraction.

**PDF Text Extraction** - Automatic text extraction from PDF documents for AI processing.

**Real-Time Web Search** - Integration with Tavily, Serper, and Brave Search APIs for live web information during conversations.

**Search Integration** - Web search results are intelligently woven into AI responses with context awareness.

### Multi-LLM Support

**OpenAI Integration** - Full support for GPT-4, GPT-3.5 Turbo with streaming responses and context preservation

**Anthropic Claude** - Claude-3.5 Sonnet and Claude-3 Haiku integration with personality-aware conversations

**Google Gemini** - Gemini Pro and Gemini Flash support with multi-modal capabilities

**Groq Acceleration** - Ultra-fast inference with Llama models for quick responses

**OpenRouter Access** - Gateway to 100+ additional AI models with unified interface

**Context Preservation** - Model switching mid-conversation while maintaining context continuity

### Glassmorphic Interface

**Glass Design** - Chat interface with glassmorphic effects, depth illusions, backdrop blur effects, and animations powered by Framer Motion.

![UI Overview](./public/ui/settings.png)

**Responsive Design** - Adapts across mobile, tablet, and desktop devices with touch-optimized interactions.

**Boring Theme Mode** - Reduced animation theme option that minimizes visual effects for better performance and accessibility.

### Security Features

**Clerk Authentication** - User management with social login and MFA support

**BYOK Architecture** - "Bring Your Own Keys" system with end-to-end encryption

**Data Protection** - Advanced encryption for sensitive data and API keys

**Privacy First** - Zero-knowledge architecture ensuring user data remains private and secure

## Quick Start

### Prerequisites

- Node.js 18+ with npm or pnpm
- PostgreSQL database (local or hosted)
- Clerk account for authentication

### Installation

1. **Clone and Install**

   ```bash
   git clone https://github.com/yourusername/conversational-glass-ai.git
   cd conversational-glass-ai
   npm install
   ```

2. **Environment Setup**
   Create `.env.local` with required configuration:

   ```env
   # REQUIRED: Authentication & Database
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_your_key_here"
   CLERK_SECRET_KEY="sk_test_your_secret_here"
   CLERK_WEBHOOK_SECRET="whsec_your_webhook_secret"
   DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

   # AI PROVIDERS (At least one required)
   OPENAI_API_KEY="sk-your_openai_key_here"
   ANTHROPIC_API_KEY="sk-ant-your_anthropic_key_here"
   GOOGLE_AI_API_KEY="your_google_ai_key_here"
   GROQ_API_KEY="gsk_your_groq_key_here"
   OPENROUTER_API_KEY="sk-or-your_openrouter_key_here"

   # SEARCH PROVIDERS (Optional)
   TAVILY_API_KEY="tvly-your_tavily_key_here"
   SERPER_API_KEY="your_serper_key_here"

   # FILE STORAGE (Optional)
   IBM_COS_ENDPOINT="your_ibm_cos_endpoint"
   IBM_COS_API_KEY_ID="your_ibm_cos_key"
   IBM_COS_BUCKET_NAME="your_bucket_name"

   # SECURITY
   ENCRYPTION_SECRET="your_32_char_encryption_secret_here"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

3. **Database Initialization**

   ```bash
   npm run db:migrate
   npm run db:seed  # Optional: Add sample data
   ```

4. **Start Development**

   ```bash
   npm run dev
   ```

5. **Access Application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Architecture

### Technology Stack

- **Frontend Framework**: Next.js 15 with App Router
- **Runtime**: React 19 with Server Components
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS with custom design system
- **Animation**: Framer Motion for 60fps animations
- **UI Components**: Radix UI primitives
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Clerk with webhook integration
- **Deployment**: Vercel with edge functions
- **Testing**: Vitest with React Testing Library

### Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes and webhooks
│   │   ├── chat/          # Chat functionality endpoints
│   │   ├── conversations/ # Conversation management
│   │   ├── files/         # File upload and processing
│   │   ├── models/        # AI model management
│   │   └── user/          # User preferences and settings
│   ├── chat/              # Chat interface pages
│   ├── settings/          # Configuration pages
│   └── shared/            # Public conversation sharing
├── components/            # React components
│   ├── ui/               # Reusable UI primitives
│   ├── chat/             # Chat-specific components
│   ├── auth/             # Authentication components
│   └── settings/         # Settings page components
├── lib/                  # Core utilities and integrations
│   ├── ai/              # AI provider implementations
│   │   ├── providers/   # Individual provider clients
│   │   └── search-providers/ # Web search integrations
│   ├── db/              # Database schema and queries
│   ├── storage/         # File storage utilities
│   └── utils/           # Shared utility functions
├── hooks/               # Custom React hooks
└── test/                # Test suites and configurations
```

## Contributing

We welcome contributions from the community! This guide will help you get started with contributing to Conversational Glass AI.

### 🚀 Quick Start for Contributors

1. **Fork & Clone**

   ```bash
   git clone https://github.com/yourusername/conversational-glass-ai.git
   cd conversational-glass-ai
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Set Up Environment**

   ```bash
   cp .env.example .env.local
   # Fill in your API keys and database connection
   ```

4. **Run Database Migrations**

   ```bash
   npm run db:migrate
   ```

5. **Start Development Server**

   ```bash
   npm run dev
   ```

### 📋 Development Workflow

#### Creating a Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

#### Branch Naming Conventions

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks

Examples:

- `feature/voice-recognition-improvements`
- `fix/stream-recovery-edge-case`
- `docs/api-documentation-update`

### 💻 Code Standards

#### TypeScript Guidelines

- **Strict Types**: No `any` types allowed
- **Explicit Return Types**: All functions must have explicit return types
- **Interface First**: Define interfaces for all data structures
- **Error Handling**: Proper try-catch blocks with typed errors

```typescript
// ✅ Good
interface UserPreferences {
  theme: "light" | "dark" | "boring";
  language: string;
}

async function updatePreferences(
  userId: string,
  preferences: UserPreferences
): Promise<UserPreferences> {
  try {
    // implementation
  } catch (error) {
    throw new Error(`Failed to update preferences: ${error.message}`);
  }
}

// ❌ Bad
function updatePreferences(userId: any, preferences: any): any {
  // implementation
}
```

#### React Best Practices

- **Functional Components**: Use hooks exclusively, no class components
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Memoization**: Use `React.memo`, `useMemo`, `useCallback` strategically
- **Props Validation**: TypeScript interfaces + runtime validation with Zod

```typescript
// ✅ Good
interface ChatMessageProps {
  message: ChatMessage;
  isStreaming: boolean;
  onRetry?: () => void;
}

const ChatMessage = React.memo<ChatMessageProps>(
  ({ message, isStreaming, onRetry }) => {
    // implementation
  }
);

// ❌ Bad
const ChatMessage = (props: any) => {
  // implementation
};
```

#### File Organization

```
components/
├── ui/                 # Reusable UI primitives
├── chat/              # Chat-specific components
│   ├── MessageBubble.tsx
│   ├── ChatInput.tsx
│   └── index.ts       # Export all components
├── auth/              # Authentication components
└── settings/          # Settings page components

hooks/
├── useChat.ts         # Chat-related hooks
├── useModels.ts       # Model management hooks
└── useSettings.ts     # Settings hooks

lib/
├── ai/               # AI provider integrations
├── db/               # Database utilities
├── utils/            # Shared utilities
└── types/            # Type definitions
```

### 🧪 Testing Requirements

#### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

#### Test Requirements

- **Unit Tests**: All utility functions and hooks must have unit tests
- **Integration Tests**: API endpoints and database interactions
- **Component Tests**: Critical UI components with user interactions
- **Type Tests**: Type safety validation for complex types

```typescript
// Example test structure
describe("useChat Hook", () => {
  it("should handle message sending", async () => {
    // Test implementation
  });

  it("should recover interrupted streams", async () => {
    // Test implementation
  });

  it("should handle API errors gracefully", async () => {
    // Test implementation
  });
});
```

### 📝 Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

#### Examples

```bash
feat(chat): add automatic stream recovery functionality

fix(api): resolve race condition in message persistence

docs(readme): update installation instructions

refactor(components): extract reusable message components

test(hooks): add comprehensive tests for useChat hook

chore(deps): update dependencies to latest versions
```

### 🔄 Pull Request Process

#### Before Submitting

1. **Code Quality Checks**

   ```bash
   npm run lint
   npm run type-check
   npm run test
   npm run build
   ```

2. **Manual Testing**

   - Test your changes in development
   - Verify responsive design on mobile/desktop
   - Test with different AI providers
   - Check for accessibility issues

#### Pull Request Template

When creating a PR, please include:

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Manual testing completed

## Screenshots (if applicable)

Include screenshots for UI changes

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No breaking changes (or marked as such)
```

#### Review Process

1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one maintainer review required
3. **Testing**: Changes must be manually tested
4. **Documentation**: Update docs if needed

### 🐛 Issue Reporting

#### Bug Reports

Use the bug report template:

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen

**Screenshots**
If applicable, add screenshots

**Environment**

- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome, Firefox, Safari]
- Version: [e.g. 1.0.0]
```

#### Feature Requests

```markdown
**Feature Description**
Clear description of the feature

**Problem Statement**
What problem does this solve?

**Proposed Solution**
How would you like it to work?

**Alternatives Considered**
Other solutions you've considered

**Additional Context**
Screenshots, mockups, examples
```

### 🏗️ Development Environment

#### Recommended Tools

- **Editor**: VS Code with recommended extensions
- **Node Version Manager**: nvm or fnm
- **Database**: PostgreSQL 14+
- **Testing**: Vitest + React Testing Library

#### VS Code Extensions

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "vitest.explorer"
  ]
}
```

#### Environment Variables

Required for development:

```env
# Core
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
CLERK_SECRET_KEY=""
DATABASE_URL=""

# AI Providers (at least one required)
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
GOOGLE_AI_API_KEY=""

# Optional
TAVILY_API_KEY=""
GROQ_API_KEY=""
```

### 🎯 Focus Areas for Contributors

We're particularly looking for contributions in:

1. **AI Provider Integrations** - Adding new AI models and providers
2. **Voice Features** - Improving speech-to-text and text-to-speech
3. **File Processing** - Enhanced file type support and processing
4. **Performance** - Optimization and bundle size reduction
5. **Accessibility** - Improving screen reader support and keyboard navigation
6. **Testing** - Expanding test coverage
7. **Documentation** - API docs, tutorials, and examples

### 🤝 Community Guidelines

- **Be Respectful**: Treat everyone with respect and kindness
- **Be Collaborative**: Work together and help each other
- **Be Patient**: Remember that everyone is learning
- **Be Constructive**: Provide helpful feedback and suggestions

### 🆘 Getting Help

- **Discord**: Join our development Discord server
- **GitHub Discussions**: Ask questions and share ideas
- **Documentation**: Check our comprehensive docs
- **Stack Overflow**: Tag with `conversational-glass-ai`

### 🎉 Recognition

Contributors will be:

- Listed in our contributors file
- Mentioned in release notes for significant contributions
- Invited to our contributor Discord channel
- Eligible for special contributor badges

### 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built for the T3 ChatCloneathon with gratitude to:

- **T3 Stack Community** for the modern development foundation
- **Clerk** for seamless authentication infrastructure
- **Radix UI** for accessible component primitives
- **Framer Motion** for smooth animation capabilities
- **Vercel** for exceptional deployment platform
- **Open Source Community** for the incredible ecosystem of tools
