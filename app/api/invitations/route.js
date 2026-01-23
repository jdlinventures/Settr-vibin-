import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Invitation from "@/models/Invitation";

/**
 * GET /api/invitations
 * List pending invitations for the current user
 */
export async function GET(request) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();

    const invitations = await Invitation.find({
      email: session.user.email.toLowerCase(),
      status: "pending",
      expiresAt: { $gt: new Date() },
    })
      .populate("centralInboxId", "name description")
      .populate("invitedBy", "name email image")
      .sort({ createdAt: -1 });

    return NextResponse.json(invitations);
  } catch (error) {
    console.error("List invitations error:", error);
    return NextResponse.json(
      { error: "Failed to list invitations" },
      { status: 500 }
    );
  }
}
