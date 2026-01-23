import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Draft from "@/models/Draft";
import CentralInbox from "@/models/CentralInbox";

/**
 * GET /api/drafts
 * List all drafts for the current user
 */
export async function GET(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();

    const drafts = await Draft.find({ userId: session.user.id })
      .sort({ updatedAt: -1 })
      .populate("sendFromEmailId", "emailAddress")
      .populate("replyToEmailId", "subject from");

    return NextResponse.json(drafts);
  } catch (error) {
    console.error("List drafts error:", error);
    return NextResponse.json(
      { error: "Failed to list drafts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/drafts
 * Create or update a draft (upsert by replyToEmailId if provided)
 */
export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      centralInboxId,
      replyToEmailId,
      sendFromEmailId,
      to,
      cc,
      subject,
      bodyHtml,
    } = body;

    if (!centralInboxId) {
      return NextResponse.json(
        { error: "centralInboxId is required" },
        { status: 400 }
      );
    }

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

    // If replyToEmailId is provided, try to find existing draft
    let draft;

    if (replyToEmailId) {
      draft = await Draft.findOne({
        userId: session.user.id,
        replyToEmailId,
      });
    }

    if (draft) {
      // Update existing draft
      if (sendFromEmailId !== undefined) draft.sendFromEmailId = sendFromEmailId;
      if (to !== undefined) draft.to = to;
      if (cc !== undefined) draft.cc = cc;
      if (subject !== undefined) draft.subject = subject;
      if (bodyHtml !== undefined) draft.bodyHtml = bodyHtml;
      draft.lastSavedAt = new Date();
      await draft.save();
    } else {
      // Create new draft
      draft = await Draft.create({
        userId: session.user.id,
        centralInboxId,
        replyToEmailId,
        sendFromEmailId,
        to: to || [],
        cc: cc || [],
        subject: subject || "",
        bodyHtml: bodyHtml || "",
        lastSavedAt: new Date(),
      });
    }

    return NextResponse.json(draft);
  } catch (error) {
    console.error("Save draft error:", error);
    return NextResponse.json(
      { error: "Failed to save draft" },
      { status: 500 }
    );
  }
}
