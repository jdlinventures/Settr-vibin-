import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import CentralInbox from "@/models/CentralInbox";
import User from "@/models/User";
import Invitation from "@/models/Invitation";
import Notification from "@/models/Notification";

/**
 * Check if user is admin (owner or admin team member)
 */
function userIsAdmin(centralInbox, userId) {
  if (centralInbox.userId.toString() === userId) return true;

  const member = centralInbox.teamMembers.find(
    (m) => m.userId.toString() === userId
  );

  return member?.role === "admin";
}

/**
 * GET /api/central-inboxes/[id]/team
 * List team members for a central inbox
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await connectMongo();

    const centralInbox = await CentralInbox.findById(id).populate(
      "teamMembers.userId",
      "name email image"
    );

    if (!centralInbox) {
      return NextResponse.json(
        { error: "Central inbox not found" },
        { status: 404 }
      );
    }

    // Check if user has access
    const isOwner = centralInbox.userId.toString() === session.user.id;
    const isMember = centralInbox.teamMembers.some(
      (m) => m.userId?._id?.toString() === session.user.id
    );

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get owner info
    const owner = await User.findById(centralInbox.userId).select(
      "name email image"
    );

    // Get pending invitations
    const pendingInvitations = await Invitation.find({
      centralInboxId: id,
      status: "pending",
    }).populate("invitedBy", "name email");

    return NextResponse.json({
      owner: {
        ...owner.toJSON(),
        role: "owner",
      },
      members: centralInbox.teamMembers.map((m) => ({
        userId: m.userId?._id || m.userId,
        name: m.userId?.name,
        email: m.userId?.email,
        image: m.userId?.image,
        role: m.role,
      })),
      pendingInvitations: pendingInvitations.map((inv) => ({
        id: inv._id,
        email: inv.email,
        role: inv.role,
        invitedBy: inv.invitedBy,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
      })),
    });
  } catch (error) {
    console.error("List team error:", error);
    return NextResponse.json(
      { error: "Failed to list team" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/central-inboxes/[id]/team
 * Invite a team member by email
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { email, role = "agent" } = body;

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!["admin", "agent"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be 'admin' or 'agent'" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    await connectMongo();

    const centralInbox = await CentralInbox.findById(id);

    if (!centralInbox) {
      return NextResponse.json(
        { error: "Central inbox not found" },
        { status: 404 }
      );
    }

    if (!userIsAdmin(centralInbox, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if user is already a member
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      // Check if already owner
      if (centralInbox.userId.toString() === existingUser._id.toString()) {
        return NextResponse.json(
          { error: "This user is already the owner" },
          { status: 400 }
        );
      }

      // Check if already a member
      const alreadyMember = centralInbox.teamMembers.some(
        (m) => m.userId.toString() === existingUser._id.toString()
      );

      if (alreadyMember) {
        return NextResponse.json(
          { error: "This user is already a team member" },
          { status: 400 }
        );
      }

      // Add user directly to team
      centralInbox.teamMembers.push({
        userId: existingUser._id,
        role,
      });
      await centralInbox.save();

      // Create notification for the user
      await Notification.create({
        userId: existingUser._id,
        type: "invitation",
        title: "Added to team",
        body: `You've been added to "${centralInbox.name}" as ${role}`,
        link: `/dashboard/inbox/${id}`,
        relatedCentralInboxId: id,
      });

      return NextResponse.json({
        success: true,
        message: "User added to team",
        member: {
          userId: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          image: existingUser.image,
          role,
        },
      });
    }

    // User doesn't exist - create invitation
    // Check for existing pending invitation
    const existingInvitation = await Invitation.findOne({
      email: normalizedEmail,
      centralInboxId: id,
      status: "pending",
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: "An invitation is already pending for this email" },
        { status: 400 }
      );
    }

    // Create invitation
    const invitation = await Invitation.create({
      email: normalizedEmail,
      centralInboxId: id,
      role,
      invitedBy: session.user.id,
    });

    // TODO: Send invitation email via Resend

    return NextResponse.json({
      success: true,
      message: "Invitation sent",
      invitation: {
        id: invitation._id,
        email: normalizedEmail,
        role,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("Invite team member error:", error);
    return NextResponse.json(
      { error: "Failed to invite team member" },
      { status: 500 }
    );
  }
}
