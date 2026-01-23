import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import CentralInbox from "@/models/CentralInbox";
import Stage from "@/models/Stage";
import Email from "@/models/Email";

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
 * PUT /api/central-inboxes/[id]/stages/[stageId]
 * Update a stage (admin only)
 */
export async function PUT(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, stageId } = await params;
    const body = await request.json();
    const { name, color } = body;

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

    const stage = await Stage.findOne({ _id: stageId, centralInboxId: id });

    if (!stage) {
      return NextResponse.json(
        { error: "Stage not found" },
        { status: 404 }
      );
    }

    if (name !== undefined) stage.name = name.trim();
    if (color !== undefined) stage.color = color;

    await stage.save();

    return NextResponse.json(stage);
  } catch (error) {
    console.error("Update stage error:", error);
    return NextResponse.json(
      { error: "Failed to update stage" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/central-inboxes/[id]/stages/[stageId]
 * Delete a stage (admin only)
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, stageId } = await params;

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

    const stage = await Stage.findOne({ _id: stageId, centralInboxId: id });

    if (!stage) {
      return NextResponse.json(
        { error: "Stage not found" },
        { status: 404 }
      );
    }

    // Cannot delete the default stage
    if (stage.isDefault) {
      return NextResponse.json(
        { error: "Cannot delete the default stage" },
        { status: 400 }
      );
    }

    // Find the default stage to reassign emails
    const defaultStage = await Stage.findOne({ centralInboxId: id, isDefault: true });

    // Reassign emails from this stage to the default stage
    if (defaultStage) {
      await Email.updateMany(
        { centralInboxId: id, stageId: stageId },
        { $set: { stageId: defaultStage._id } }
      );
    } else {
      // If no default stage, just unset the stageId
      await Email.updateMany(
        { centralInboxId: id, stageId: stageId },
        { $unset: { stageId: "" } }
      );
    }

    await Stage.deleteOne({ _id: stageId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete stage error:", error);
    return NextResponse.json(
      { error: "Failed to delete stage" },
      { status: 500 }
    );
  }
}
