import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Invitation from "@/models/Invitation";
import CentralInbox from "@/models/CentralInbox";
import Notification from "@/models/Notification";

/**
 * POST /api/invitations/[id]/accept
 * Accept an invitation
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

    // Check if invitation is still valid
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: `Invitation has already been ${invitation.status}` },
        { status: 400 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = "expired";
      await invitation.save();
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Get the central inbox
    const centralInbox = await CentralInbox.findById(invitation.centralInboxId);

    if (!centralInbox) {
      return NextResponse.json(
        { error: "Central inbox no longer exists" },
        { status: 404 }
      );
    }

    // Check if already a member
    const alreadyMember = centralInbox.teamMembers.some(
      (m) => m.userId.toString() === session.user.id
    );

    if (alreadyMember) {
      invitation.status = "accepted";
      await invitation.save();
      return NextResponse.json({
        success: true,
        message: "You're already a member of this inbox",
        centralInboxId: centralInbox._id,
      });
    }

    // Add user to team
    centralInbox.teamMembers.push({
      userId: session.user.id,
      role: invitation.role,
    });
    await centralInbox.save();

    // Update invitation status
    invitation.status = "accepted";
    await invitation.save();

    // Notify the person who invited them
    await Notification.create({
      userId: invitation.invitedBy,
      type: "invitation",
      title: "Invitation accepted",
      body: `${session.user.name || session.user.email} accepted your invitation to "${centralInbox.name}"`,
      link: `/dashboard/inbox/${centralInbox._id}`,
      relatedCentralInboxId: centralInbox._id,
    });

    return NextResponse.json({
      success: true,
      message: "Invitation accepted",
      centralInboxId: centralInbox._id,
      role: invitation.role,
    });
  } catch (error) {
    console.error("Accept invitation error:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
