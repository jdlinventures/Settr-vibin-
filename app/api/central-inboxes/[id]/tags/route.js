import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import CentralInbox from "@/models/CentralInbox";
import Tag from "@/models/Tag";

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
 * GET /api/central-inboxes/[id]/tags
 * List all tags for a central inbox
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

    const tags = await Tag.find({ centralInboxId: id }).sort({ name: 1 });

    return NextResponse.json(tags);
  } catch (error) {
    console.error("List tags error:", error);
    return NextResponse.json(
      { error: "Failed to list tags" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/central-inboxes/[id]/tags
 * Create a new tag for a central inbox (admin only)
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

    const tag = await Tag.create({
      centralInboxId: id,
      name: name.trim(),
      color: color || "#6366f1",
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "A tag with this name already exists" },
        { status: 409 }
      );
    }
    console.error("Create tag error:", error);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 }
    );
  }
}
