import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock environment variables
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_mock";
process.env.CLERK_SECRET_KEY = "sk_test_mock";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

// Mock Clerk
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() => Promise.resolve({ userId: "user_test123" })),
  clerkClient: {
    users: {
      getUser: vi.fn(),
    },
  },
}));

// Mock database connection
vi.mock("@/lib/db/connection", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock crypto for Node.js environment
Object.defineProperty(globalThis, "crypto", {
  value: {
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    randomUUID: () => "123e4567-e89b-12d3-a456-426614174000",
    subtle: {
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      importKey: vi.fn(),
      deriveKey: vi.fn(),
    },
  },
});

// Mock fetch for API calls
global.fetch = vi.fn();

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
