import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import CentralInbox from "@/models/CentralInbox";
import Stage from "@/models/Stage";

/**
 * Check if user has access to a central inbox
 */
function userHasAccess(centralInbox, userId) {
  if (centralInbox.userId.toString() === userId) {
    return true;
  }

  const member = centralInbox.teamMembers.find(
    (m) => m.userId.toString() === userId
  );

  return !!member;
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
 * GET /api/central-inboxes/[id]/stages
 * List all stages for a central inbox (sorted by order)
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

    if (!userHasAccess(centralInbox, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const stages = await Stage.find({ centralInboxId: id }).sort({ order: 1 });

    return NextResponse.json(stages);
  } catch (error) {
    console.error("List stages error:", error);
    return NextResponse.json(
      { error: "Failed to list stages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/central-inboxes/[id]/stages
 * Create a new stage for a central inbox (admin only)
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
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

    // Get the next order value
    const lastStage = await Stage.findOne({ centralInboxId: id }).sort({ order: -1 });
    const nextOrder = (lastStage?.order ?? -1) + 1;

    const stage = await Stage.create({
      centralInboxId: id,
      name: name.trim(),
      color: color || "#6366f1",
      order: nextOrder,
      isDefault: false,
    });

    return NextResponse.json(stage, { status: 201 });
  } catch (error) {
    console.error("Create stage error:", error);
    return NextResponse.json(
      { error: "Failed to create stage" },
      { status: 500 }
    );
  }
}
