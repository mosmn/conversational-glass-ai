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
        email: z.boolean().optional(),
        push: z.boolean().optional(),
        marketing: z.boolean().optional(),
      })
      .optional(),
    privacy: z
      .object({
        publicProfile: z.boolean().optional(),
        showActivity: z.boolean().optional(),
        dataCollection: z.boolean().optional(),
      })
      .optional(),
    appearance: z
      .object({
        theme: z.enum(["light", "dark", "auto"]).optional(),
        animations: z.boolean().optional(),
        compactMode: z.boolean().optional(),
      })
      .optional(),
    ai: z
      .object({
        defaultModel: z.string().optional(), // Allow any model ID
        enabledModels: z.array(z.string()).optional(), // Array of enabled model IDs
        streamingMode: z.boolean().optional(),
        autoSave: z.boolean().optional(),
        preferredProviders: z.array(z.string()).optional(), // Array of preferred provider IDs
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
    tts: z
      .object({
        defaultEnglishVoice: z.string(),
        defaultArabicVoice: z.string(),
        autoCleanup: z.boolean(),
        enableTTS: z.boolean(),
        testSampleText: z.string(),
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
    console.log("PUT preferences request body:", JSON.stringify(body, null, 2));

    // Validate the request body
    const validationResult = preferencesSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("PUT validation failed:", validationResult.error.issues);
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

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log(
      "PATCH preferences request body:",
      JSON.stringify(body, null, 2)
    );

    // Validate the request body
    const validationResult = preferencesSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("PATCH validation failed:", validationResult.error.issues);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid preferences data",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    // Get current preferences
    const user = await db
      .select({
        preferences: users.preferences,
      })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    const currentPreferences = user[0]?.preferences || {};

    // Merge with new preferences (deep merge for nested objects)
    const updatedPreferences: any = { ...currentPreferences };
    const validatedBody = validationResult.data;

    Object.keys(validatedBody).forEach((key) => {
      const bodyValue = (validatedBody as any)[key];
      const currentValue = (currentPreferences as any)[key];

      if (
        typeof bodyValue === "object" &&
        bodyValue !== null &&
        !Array.isArray(bodyValue)
      ) {
        updatedPreferences[key] = { ...currentValue, ...bodyValue };
      } else {
        updatedPreferences[key] = bodyValue;
      }
    });

    // Update user preferences in database
    await db
      .update(users)
      .set({
        preferences: updatedPreferences,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, userId));

    return NextResponse.json({
      success: true,
      message: "Preferences updated successfully",
      data: updatedPreferences,
    });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
