import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import CentralInbox from "@/models/CentralInbox";
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
 * PUT /api/central-inboxes/[id]/team/[userId]
 * Change a team member's role
 */
export async function PUT(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, userId } = await params;
    const body = await request.json();
    const { role } = body;

    if (!role || !["admin", "agent"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be 'admin' or 'agent'" },
        { status: 400 }
      );
    }

    await connectMongo();

    const centralInbox = await CentralInbox.findById(id);

    if (!centralInbox) {
      return NextResponse.json(
        { error: "Central inbox not found" },
        { status: 404 }
      );
    }

    // Only owner can change roles
    if (centralInbox.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "Only the owner can change roles" },
        { status: 403 }
      );
    }

    // Can't change owner's role
    if (userId === centralInbox.userId.toString()) {
      return NextResponse.json(
        { error: "Cannot change owner's role" },
        { status: 400 }
      );
    }

    // Find and update the member
    const memberIndex = centralInbox.teamMembers.findIndex(
      (m) => m.userId.toString() === userId
    );

    if (memberIndex === -1) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    centralInbox.teamMembers[memberIndex].role = role;
    await centralInbox.save();

    // Notify the user
    await Notification.create({
      userId,
      type: "assignment",
      title: "Role updated",
      body: `Your role in "${centralInbox.name}" has been changed to ${role}`,
      link: `/dashboard/inbox/${id}`,
      relatedCentralInboxId: id,
    });

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error("Update team member role error:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/central-inboxes/[id]/team/[userId]
 * Remove a team member
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, userId } = await params;

    await connectMongo();

    const centralInbox = await CentralInbox.findById(id);

    if (!centralInbox) {
      return NextResponse.json(
        { error: "Central inbox not found" },
        { status: 404 }
      );
    }

    // Owner can remove anyone, admins can remove agents, users can remove themselves
    const isOwner = centralInbox.userId.toString() === session.user.id;
    const isSelf = userId === session.user.id;
    const currentUserIsAdmin = userIsAdmin(centralInbox, session.user.id);

    // Find the target member
    const targetMember = centralInbox.teamMembers.find(
      (m) => m.userId.toString() === userId
    );

    if (!targetMember) {
      return NextResponse.json(
        { error: "Team member not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (!isOwner && !isSelf) {
      // Admin trying to remove someone
      if (currentUserIsAdmin && targetMember.role === "admin") {
        return NextResponse.json(
          { error: "Admins cannot remove other admins" },
          { status: 403 }
        );
      }
      if (!currentUserIsAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Can't remove the owner
    if (userId === centralInbox.userId.toString()) {
      return NextResponse.json(
        { error: "Cannot remove the owner" },
        { status: 400 }
      );
    }

    // Remove the member
    centralInbox.teamMembers = centralInbox.teamMembers.filter(
      (m) => m.userId.toString() !== userId
    );
    await centralInbox.save();

    // Notify the removed user (unless they removed themselves)
    if (!isSelf) {
      await Notification.create({
        userId,
        type: "assignment",
        title: "Removed from team",
        body: `You've been removed from "${centralInbox.name}"`,
        relatedCentralInboxId: id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove team member error:", error);
    return NextResponse.json(
      { error: "Failed to remove team member" },
      { status: 500 }
    );
  }
}
