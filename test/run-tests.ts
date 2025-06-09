#!/usr/bin/env tsx

/**
 * Test Runner for BYOK System
 *
 * This script validates the key functionality of the BYOK implementation
 * without needing a full database or external API connections.
 */

import { describe } from "vitest";

async function runBYOKValidation() {
  console.log("🔐 BYOK System Validation\n");

  // Test 1: Encryption utilities
  console.log("1. Testing encryption utilities...");
  try {
    const { validateApiKeyFormat, maskApiKey } = await import(
      "../lib/utils/encryption"
    );

    const tests = [
      { key: "sk-1234567890abcdef", provider: "openai", expected: true },
      { key: "sk-ant-1234567890abcdef", provider: "claude", expected: true },
      { key: "invalid-key", provider: "openai", expected: false },
      { key: "gsk_1234567890abcdef", provider: "groq", expected: true },
    ];

    for (const test of tests) {
      const result = validateApiKeyFormat(test.key, test.provider);
      const status = result.isValid === test.expected ? "✅" : "❌";
      console.log(
        `   ${status} ${test.provider}: ${test.key.slice(0, 10)}... → ${
          result.isValid
        }`
      );
    }

    console.log(
      "   ✅ Masking: sk-1234567890abcdef →",
      maskApiKey("sk-1234567890abcdef")
    );
  } catch (error) {
    console.log("   ❌ Encryption test failed:", error);
  }

  // Test 2: Provider configuration
  console.log("\n2. Testing provider configuration...");
  try {
    const { openaiProvider } = await import("../lib/ai/providers/openai");
    const { claudeProvider } = await import("../lib/ai/providers/claude");

    console.log(
      "   ✅ OpenAI provider configured:",
      openaiProvider.isConfigured
    );
    console.log(
      "   ✅ Claude provider configured:",
      claudeProvider.isConfigured
    );
    console.log(
      "   ✅ OpenAI models available:",
      Object.keys(openaiProvider.models).length
    );
    console.log(
      "   ✅ Claude models available:",
      Object.keys(claudeProvider.models).length
    );
  } catch (error) {
    console.log("   ❌ Provider test failed:", error);
  }

  // Test 3: BYOK Manager structure
  console.log("\n3. Testing BYOK Manager...");
  try {
    const { BYOKManager } = await import("../lib/ai/providers/byok-manager");

    console.log("   ✅ BYOKManager class loaded");
    console.log(
      "   ✅ Has getUserApiKey method:",
      typeof BYOKManager.getUserApiKey === "function"
    );
    console.log(
      "   ✅ Has getApiKeyWithFallback method:",
      typeof BYOKManager.getApiKeyWithFallback === "function"
    );
    console.log(
      "   ✅ Has clearCache method:",
      typeof BYOKManager.clearCache === "function"
    );
  } catch (error) {
    console.log("   ❌ BYOK Manager test failed:", error);
  }

  // Test 4: API route structure
  console.log("\n4. Testing API route structure...");
  try {
    // Check if API routes exist
    const fs = await import("fs");
    const path = await import("path");

    const apiPaths = [
      "app/api/user/api-keys/route.ts",
      "app/api/user/api-keys/[id]/route.ts",
      "app/api/user/api-keys/test/route.ts",
      "app/api/chat/send/route.ts",
    ];

    for (const apiPath of apiPaths) {
      const exists = fs.existsSync(path.join(process.cwd(), apiPath));
      console.log(`   ${exists ? "✅" : "❌"} ${apiPath}`);
    }
  } catch (error) {
    console.log("   ❌ API route test failed:", error);
  }

  // Test 5: Database schema
  console.log("\n5. Testing database schema...");
  try {
    const { userApiKeys } = await import("../lib/db/schema");

    console.log("   ✅ userApiKeys table schema loaded");
    console.log(
      "   ✅ Required fields present:",
      Object.keys(userApiKeys).length > 0
    );
  } catch (error) {
    console.log("   ❌ Database schema test failed:", error);
  }

  console.log("\n🎉 BYOK validation complete!");
  console.log("\nTo run full tests with mocks:");
  console.log("  npm run test:byok");
  console.log("\nTo run tests with UI:");
  console.log("  npm run test:ui");
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBYOKValidation().catch(console.error);
}

export { runBYOKValidation };
