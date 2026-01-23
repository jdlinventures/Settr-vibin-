import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Invitation from "@/models/Invitation";

/**
 * POST /api/invitations/[id]/decline
 * Decline an invitation
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await connectMongo();

    const invitation = await Invitation.findById(id);

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Verify invitation is for this user
    if (invitation.email !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation is not for you" },
        { status: 403 }
      );
    }

    // Check if invitation is still pending
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: `Invitation has already been ${invitation.status}` },
        { status: 400 }
      );
    }

    // Update invitation status
    invitation.status = "declined";
    await invitation.save();

    return NextResponse.json({
      success: true,
      message: "Invitation declined",
    });
  } catch (error) {
    console.error("Decline invitation error:", error);
    return NextResponse.json(
      { error: "Failed to decline invitation" },
      { status: 500 }
    );
  }
}
