import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import CentralInbox from "@/models/CentralInbox";
import Tag from "@/models/Tag";
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
 * PUT /api/central-inboxes/[id]/tags/[tagId]
 * Update a tag (admin only)
 */
export async function PUT(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, tagId } = await params;
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

    const tag = await Tag.findOne({ _id: tagId, centralInboxId: id });

    if (!tag) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      );
    }

    if (name !== undefined) tag.name = name.trim();
    if (color !== undefined) tag.color = color;

    await tag.save();

    return NextResponse.json(tag);
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "A tag with this name already exists" },
        { status: 409 }
      );
    }
    console.error("Update tag error:", error);
    return NextResponse.json(
      { error: "Failed to update tag" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/central-inboxes/[id]/tags/[tagId]
 * Delete a tag (admin only)
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, tagId } = await params;

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

    const tag = await Tag.findOne({ _id: tagId, centralInboxId: id });

    if (!tag) {
      return NextResponse.json(
        { error: "Tag not found" },
        { status: 404 }
      );
    }

    // Remove this tag from all emails that have it
    await Email.updateMany(
      { centralInboxId: id, tags: tagId },
      { $pull: { tags: tagId } }
    );

    await Tag.deleteOne({ _id: tagId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete tag error:", error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}
