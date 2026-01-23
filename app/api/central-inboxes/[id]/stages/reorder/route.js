import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import CentralInbox from "@/models/CentralInbox";
import Stage from "@/models/Stage";

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
 * POST /api/central-inboxes/[id]/stages/reorder
 * Reorder stages (admin only)
 * Body: { stageIds: ['id1', 'id2', ...] }
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { stageIds } = body;

    if (!Array.isArray(stageIds) || stageIds.length === 0) {
      return NextResponse.json(
        { error: "stageIds must be a non-empty array" },
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

    if (!userIsAdmin(centralInbox, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify all stage IDs belong to this inbox
    const existingStages = await Stage.find({ centralInboxId: id });
    const existingIds = new Set(existingStages.map((s) => s._id.toString()));

    for (const stageId of stageIds) {
      if (!existingIds.has(stageId)) {
        return NextResponse.json(
          { error: `Stage ${stageId} not found in this inbox` },
          { status: 400 }
        );
      }
    }

    // Update order for each stage
    const updates = stageIds.map((stageId, index) =>
      Stage.updateOne(
        { _id: stageId, centralInboxId: id },
        { $set: { order: index } }
      )
    );

    await Promise.all(updates);

    // Return the reordered stages
    const stages = await Stage.find({ centralInboxId: id }).sort({ order: 1 });

    return NextResponse.json(stages);
  } catch (error) {
    console.error("Reorder stages error:", error);
    return NextResponse.json(
      { error: "Failed to reorder stages" },
      { status: 500 }
    );
  }
}
