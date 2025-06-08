import { db } from "./connection";
import {
  users,
  conversations,
  messages,
  conversationArtifacts,
} from "./schema";

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // Sample user data (this would typically be created via Clerk webhook)
    const sampleUsers = [
      {
        clerkId: "user_sample_1",
        email: "demo@example.com",
        firstName: "Demo",
        lastName: "User",
        bio: "AI enthusiast and developer",
        preferences: {
          notifications: { email: true, push: true, marketing: false },
          privacy: {
            publicProfile: false,
            showActivity: true,
            dataCollection: true,
          },
          appearance: {
            theme: "dark" as const,
            animations: true,
            compactMode: false,
          },
          ai: {
            defaultModel: "gpt-4" as const,
            streamingMode: true,
            autoSave: true,
          },
        },
      },
    ];

    // Insert sample users
    console.log("👤 Creating sample users...");
    const insertedUsers = await db
      .insert(users)
      .values(sampleUsers)
      .returning();
    console.log(`✅ Created ${insertedUsers.length} users`);

    // Sample conversations
    const sampleConversations = [
      {
        userId: insertedUsers[0].id,
        title: "Welcome to Conversational Glass AI",
        description: "Your first conversation with our AI assistant",
        model: "gpt-4",
        metadata: {
          totalMessages: 4,
          lastModel: "gpt-4",
          tags: ["welcome", "introduction"],
          sentiment: "positive" as const,
          summary: "Introduction conversation about AI capabilities",
        },
      },
      {
        userId: insertedUsers[0].id,
        title: "Planning a React App",
        description: "Discussion about React architecture and best practices",
        model: "claude",
        metadata: {
          totalMessages: 8,
          lastModel: "claude",
          tags: ["react", "development", "architecture"],
          sentiment: "positive" as const,
          summary: "Technical discussion about React application design",
        },
      },
    ];

    console.log("💬 Creating sample conversations...");
    const insertedConversations = await db
      .insert(conversations)
      .values(sampleConversations)
      .returning();
    console.log(`✅ Created ${insertedConversations.length} conversations`);

    // Sample messages for the first conversation
    const welcomeMessages = [
      {
        conversationId: insertedConversations[0].id,
        userId: insertedUsers[0].id,
        role: "user",
        content: "Hello! I'd like to learn about your capabilities.",
        tokenCount: 12,
        metadata: {
          streamingComplete: true,
          regenerated: false,
        },
      },
      {
        conversationId: insertedConversations[0].id,
        userId: insertedUsers[0].id,
        role: "assistant",
        content:
          "Hello! I'm your AI assistant powered by Conversational Glass AI. I can help you with a wide variety of tasks including:\n\n• **Coding & Development** - Write, debug, and explain code in multiple languages\n• **Writing & Communication** - Draft emails, articles, and creative content\n• **Analysis & Research** - Analyze data, summarize information, and provide insights\n• **Problem Solving** - Break down complex problems and suggest solutions\n• **Creative Tasks** - Brainstorming, storytelling, and creative writing\n\nI support multiple AI models (GPT-4, Claude, Gemini) so you can choose the best one for your specific needs. What would you like to explore today?",
        model: "gpt-4",
        tokenCount: 156,
        metadata: {
          streamingComplete: true,
          regenerated: false,
          processingTime: 1.2,
        },
      },
      {
        conversationId: insertedConversations[0].id,
        userId: insertedUsers[0].id,
        role: "user",
        content:
          "That's impressive! Can you switch between different AI models during our conversation?",
        tokenCount: 18,
        metadata: {
          streamingComplete: true,
          regenerated: false,
        },
      },
      {
        conversationId: insertedConversations[0].id,
        userId: insertedUsers[0].id,
        role: "assistant",
        content:
          "Absolutely! One of the unique features of Conversational Glass AI is seamless model switching. Here's how it works:\n\n🤖 **Model Personalities:**\n- **GPT-4**: Analytical and precise, great for coding and technical tasks\n- **Claude**: Creative and nuanced, excellent for writing and complex reasoning\n- **Gemini**: Innovative and versatile, perfect for multi-modal tasks\n\n✨ **Seamless Context Preservation:**\nWhen you switch models, the entire conversation context is maintained, so each AI knows exactly what we've been discussing.\n\n🎨 **Visual Differentiation:**\nEach model has its own visual identity in the interface - you'll see different colors, animations, and styling that reflect each AI's personality.\n\nWould you like to see this in action? I can have Claude respond to your next message to demonstrate the model switching!",
        model: "gpt-4",
        tokenCount: 198,
        metadata: {
          streamingComplete: true,
          regenerated: false,
          processingTime: 1.8,
        },
      },
    ];

    // Sample messages for the React conversation
    const reactMessages = [
      {
        conversationId: insertedConversations[1].id,
        userId: insertedUsers[0].id,
        role: "user",
        content:
          "I'm building a React application and need advice on component architecture. What are the best practices?",
        tokenCount: 24,
        metadata: {
          streamingComplete: true,
          regenerated: false,
        },
      },
      {
        conversationId: insertedConversations[1].id,
        userId: insertedUsers[0].id,
        role: "assistant",
        content:
          "Excellent question! Let me share some proven React architecture patterns that will make your application scalable and maintainable:\n\n## 🏗️ Component Architecture Best Practices\n\n### 1. **Component Composition Over Inheritance**\n```jsx\n// Good - Composable components\nfunction Card({ children, variant = 'default' }) {\n  return (\n    <div className={`card card--${variant}`}>\n      {children}\n    </div>\n  );\n}\n\nfunction UserCard({ user }) {\n  return (\n    <Card variant=\"user\">\n      <Avatar src={user.avatar} />\n      <UserInfo user={user} />\n    </Card>\n  );\n}\n```\n\n### 2. **Separation of Concerns**\n- **Presentational Components**: Focus on how things look\n- **Container Components**: Focus on how things work\n- **Custom Hooks**: Extract and reuse stateful logic\n\n### 3. **Folder Structure**\n```\nsrc/\n  components/\n    ui/           # Reusable UI components\n    forms/        # Form-specific components  \n    layout/       # Layout components\n  hooks/          # Custom hooks\n  services/       # API calls and business logic\n  utils/          # Pure utility functions\n```\n\nWhat specific aspect of your React app would you like to dive deeper into?",
        model: "claude",
        tokenCount: 312,
        metadata: {
          streamingComplete: true,
          regenerated: false,
          processingTime: 2.1,
          codeBlocks: [
            {
              language: "jsx",
              code: "function Card({ children, variant = 'default' }) {\n  return (\n    <div className={`card card--${variant}`}>\n      {children}\n    </div>\n  );\n}",
              startLine: 8,
              endLine: 14,
            },
          ],
        },
      },
    ];

    console.log("💬 Creating sample messages...");
    const allMessages = [...welcomeMessages, ...reactMessages];
    const insertedMessages = await db
      .insert(messages)
      .values(allMessages)
      .returning();
    console.log(`✅ Created ${insertedMessages.length} messages`);

    // Sample conversation artifacts
    const sampleArtifacts = [
      {
        conversationId: insertedConversations[0].id,
        type: "summary",
        title: "Conversation Summary",
        content:
          "Introduction to Conversational Glass AI capabilities, including multi-model support, seamless context switching, and visual differentiation between AI personalities.",
        model: "gpt-4",
        metadata: {
          confidence: 0.95,
          keywords: ["AI", "multi-model", "conversation", "capabilities"],
          relevanceScore: 0.9,
        },
      },
      {
        conversationId: insertedConversations[1].id,
        type: "insights",
        title: "Key React Architecture Insights",
        content:
          "Discussion covered component composition, separation of concerns, and proper folder structure for React applications. Emphasized the importance of reusable components and custom hooks.",
        model: "claude",
        metadata: {
          confidence: 0.88,
          keywords: ["React", "architecture", "components", "hooks"],
          relevanceScore: 0.85,
        },
      },
    ];

    console.log("📊 Creating conversation artifacts...");
    const insertedArtifacts = await db
      .insert(conversationArtifacts)
      .values(sampleArtifacts)
      .returning();
    console.log(`✅ Created ${insertedArtifacts.length} artifacts`);

    console.log("🎉 Database seeded successfully!");
    console.log("\n📈 Summary:");
    console.log(`   Users: ${insertedUsers.length}`);
    console.log(`   Conversations: ${insertedConversations.length}`);
    console.log(`   Messages: ${insertedMessages.length}`);
    console.log(`   Artifacts: ${insertedArtifacts.length}`);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run the seed function
seed()
  .then(() => {
    console.log("✅ Seeding completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
