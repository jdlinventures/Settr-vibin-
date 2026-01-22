import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { getAuthUrl } from "@/libs/gmail";

/**
 * POST /api/emails/connect/gmail
 * Generate Gmail OAuth URL for user to authorize
 */
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create state with user ID for callback verification
    const state = Buffer.from(
      JSON.stringify({
        userId: session.user.id,
        timestamp: Date.now(),
      })
    ).toString("base64");

    const authUrl = getAuthUrl(state);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Gmail OAuth error:", error);
    return NextResponse.json(
      { error: "Failed to generate OAuth URL" },
      { status: 500 }
    );
  }
}
