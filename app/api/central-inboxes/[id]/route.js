import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import CentralInbox from "@/models/CentralInbox";
import ConnectedEmail from "@/models/ConnectedEmail";
import Email from "@/models/Email";
import Tag from "@/models/Tag";
import Stage from "@/models/Stage";

/**
 * Check if user has access to a central inbox
 */
async function userHasAccess(centralInbox, userId, requiredRole = null) {
  // Owner always has access
  if (centralInbox.userId.toString() === userId) {
    return true;
  }

  // Check team membership
  const member = centralInbox.teamMembers.find(
    (m) => m.userId.toString() === userId
  );

  if (!member) return false;

  // If specific role required, check it
  if (requiredRole && member.role !== requiredRole) {
    return false;
  }

  return true;
}

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
 * GET /api/central-inboxes/[id]
 * Get a single central inbox
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await connectMongo();

    const centralInbox = await CentralInbox.findById(id);

    if (!centralInbox) {
      return NextResponse.json(
        { error: "Central inbox not found" },
        { status: 404 }
      );
    }

    if (!await userHasAccess(centralInbox, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(centralInbox);
  } catch (error) {
    console.error("Get central inbox error:", error);
    return NextResponse.json(
      { error: "Failed to get central inbox" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/central-inboxes/[id]
 * Update a central inbox (admin only)
 */
export async function PUT(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, warmupKeywords } = body;

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

    // Update fields
    if (name !== undefined) centralInbox.name = name.trim();
    if (description !== undefined) centralInbox.description = description.trim();
    if (warmupKeywords !== undefined) {
      centralInbox.warmupKeywords = warmupKeywords
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);
    }

    await centralInbox.save();

    return NextResponse.json(centralInbox);
  } catch (error) {
    console.error("Update central inbox error:", error);
    return NextResponse.json(
      { error: "Failed to update central inbox" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/central-inboxes/[id]
 * Delete a central inbox (owner only)
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await connectMongo();

    const centralInbox = await CentralInbox.findById(id);

    if (!centralInbox) {
      return NextResponse.json(
        { error: "Central inbox not found" },
        { status: 404 }
      );
    }

    // Only owner can delete
    if (centralInbox.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Unassign all connected emails from this inbox
    await ConnectedEmail.updateMany(
      { centralInboxId: id },
      { $unset: { centralInboxId: "" } }
    );

    // Delete all related data
    await Email.deleteMany({ centralInboxId: id });
    await Tag.deleteMany({ centralInboxId: id });
    await Stage.deleteMany({ centralInboxId: id });

    // Delete the inbox
    await CentralInbox.deleteOne({ _id: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete central inbox error:", error);
    return NextResponse.json(
      { error: "Failed to delete central inbox" },
      { status: 500 }
    );
  }
}
