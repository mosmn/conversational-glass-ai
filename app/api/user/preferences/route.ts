import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Validation schema for user preferences
const preferencesSchema = z
  .object({
    notifications: z
      .object({
        email: z.boolean(),
        push: z.boolean(),
        marketing: z.boolean(),
      })
      .optional(),
    privacy: z
      .object({
        publicProfile: z.boolean(),
        showActivity: z.boolean(),
        dataCollection: z.boolean(),
      })
      .optional(),
    appearance: z
      .object({
        theme: z.enum(["light", "dark", "auto"]),
        animations: z.boolean(),
        compactMode: z.boolean(),
      })
      .optional(),
    ai: z
      .object({
        defaultModel: z.enum(["gpt-4", "claude", "gemini"]),
        streamingMode: z.boolean(),
        autoSave: z.boolean(),
      })
      .optional(),
    personalization: z
      .object({
        displayName: z.string().max(50),
        description: z.string().max(100),
        traits: z.array(z.string().max(100)).max(50),
        additionalInfo: z.string().max(3000),
      })
      .optional(),
    visual: z
      .object({
        boringTheme: z.boolean(),
        hidePersonalInfo: z.boolean(),
        disableThematicBreaks: z.boolean(),
        statsForNerds: z.boolean(),
      })
      .optional(),
    fonts: z
      .object({
        mainFont: z.string(),
        codeFont: z.string(),
      })
      .optional(),
    usage: z
      .object({
        messagesThisMonth: z.number().min(0),
        resetDate: z.string(),
        plan: z.enum(["free", "pro"]),
      })
      .optional(),
    shortcuts: z
      .object({
        enabled: z.boolean(),
        customMappings: z.record(z.string()),
      })
      .optional(),
  })
  .partial();

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user preferences from database
    const user = await db
      .select({
        preferences: users.preferences,
      })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    const preferences = user[0]?.preferences || {};

    return NextResponse.json({
      success: true,
      data: preferences,
    });
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate the request body
    const validationResult = preferencesSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid preferences data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const preferences = validationResult.data;

    // Update user preferences in database
    await db
      .update(users)
      .set({
        preferences: body,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, userId));

    return NextResponse.json({
      success: true,
      message: "Preferences updated successfully",
      data: body,
    });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
