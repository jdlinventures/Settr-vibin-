import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import ConnectedEmail from "@/models/ConnectedEmail";

/**
 * GET /api/emails
 * List all connected emails for the current user
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();

    const connectedEmails = await ConnectedEmail.find({
      userId: session.user.id,
    })
      .select("-oauthTokens -smtpConfig") // Exclude sensitive fields
      .sort({ createdAt: -1 });

    return NextResponse.json(connectedEmails);
  } catch (error) {
    console.error("List connected emails error:", error);
    return NextResponse.json(
      { error: "Failed to list connected emails" },
      { status: 500 }
    );
  }
}
