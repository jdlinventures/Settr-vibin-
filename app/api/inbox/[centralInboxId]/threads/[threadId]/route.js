import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import CentralInbox from "@/models/CentralInbox";
import Email from "@/models/Email";

/**
 * GET /api/inbox/[centralInboxId]/threads/[threadId]
 * Get all emails in a thread
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { centralInboxId, threadId } = await params;

    await connectMongo();

    // Verify user has access to this inbox
    const centralInbox = await CentralInbox.findById(centralInboxId);

    if (!centralInbox) {
      return NextResponse.json(
        { error: "Central inbox not found" },
        { status: 404 }
      );
    }

    const isOwner = centralInbox.userId.toString() === session.user.id;
    const isMember = centralInbox.teamMembers.some(
      (m) => m.userId.toString() === session.user.id
    );

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all emails in this thread
    const emails = await Email.find({
      centralInboxId,
      threadId,
    })
      .sort({ receivedAt: 1 }) // Oldest first for conversation view
      .populate("tags")
      .populate("assignedTo", "name email image");

    if (emails.length === 0) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    // Get thread metadata from the latest email
    const latestEmail = emails[emails.length - 1];

    return NextResponse.json({
      threadId,
      emails,
      tags: latestEmail.tags,
      stageId: latestEmail.stageId,
      assignedTo: latestEmail.assignedTo,
      subject: latestEmail.subject,
    });
  } catch (error) {
    console.error("Get thread error:", error);
    return NextResponse.json(
      { error: "Failed to get thread" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/inbox/[centralInboxId]/threads/[threadId]
 * Update all emails in a thread (mark as read, archive, etc.)
 */
export async function PATCH(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { centralInboxId, threadId } = await params;
    const body = await request.json();
    const { isRead, isArchived, tags, stageId, assignedTo } = body;

    await connectMongo();

    // Verify user has access
    const centralInbox = await CentralInbox.findById(centralInboxId);

    if (!centralInbox) {
      return NextResponse.json(
        { error: "Central inbox not found" },
        { status: 404 }
      );
    }

    const isOwner = centralInbox.userId.toString() === session.user.id;
    const isMember = centralInbox.teamMembers.some(
      (m) => m.userId.toString() === session.user.id
    );

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build update object
    const update = {};

    if (isRead !== undefined) update.isRead = isRead;
    if (isArchived !== undefined) update.isArchived = isArchived;
    if (tags !== undefined) update.tags = tags;
    if (stageId !== undefined) update.stageId = stageId;
    if (assignedTo !== undefined) update.assignedTo = assignedTo || null;

    // Update all emails in thread
    await Email.updateMany(
      { centralInboxId, threadId },
      { $set: update }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update thread error:", error);
    return NextResponse.json(
      { error: "Failed to update thread" },
      { status: 500 }
    );
  }
}
