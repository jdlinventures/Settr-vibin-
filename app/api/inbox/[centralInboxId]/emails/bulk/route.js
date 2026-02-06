import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Email from "@/models/Email";
import CentralInbox from "@/models/CentralInbox";

/**
 * POST /api/inbox/[centralInboxId]/emails/bulk
 * Perform bulk actions on multiple emails
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { centralInboxId } = await params;
    const { emailIds, action, value } = await request.json();

    if (!emailIds?.length || !action) {
      return NextResponse.json(
        { error: "emailIds and action are required" },
        { status: 400 }
      );
    }

    await connectMongo();

    // Verify user has access to this inbox
    const centralInbox = await CentralInbox.findById(centralInboxId);
    if (!centralInbox) {
      return NextResponse.json(
        { error: "Inbox not found" },
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

    const filter = {
      _id: { $in: emailIds },
      centralInboxId,
    };

    let update;

    switch (action) {
      case "archive":
        update = { isArchived: true };
        break;
      case "unarchive":
        update = { isArchived: false };
        break;
      case "markRead":
        update = { isRead: true };
        break;
      case "markUnread":
        update = { isRead: false };
        break;
      case "delete":
        update = { isDeleted: true };
        break;
      case "setStage":
        if (!value) {
          return NextResponse.json(
            { error: "value is required for setStage" },
            { status: 400 }
          );
        }
        update = { stageId: value };
        break;
      case "addTag":
        if (!value) {
          return NextResponse.json(
            { error: "value is required for addTag" },
            { status: 400 }
          );
        }
        await Email.updateMany(filter, { $addToSet: { tags: value } });
        return NextResponse.json({ success: true, action, count: emailIds.length });
      case "removeTag":
        if (!value) {
          return NextResponse.json(
            { error: "value is required for removeTag" },
            { status: 400 }
          );
        }
        await Email.updateMany(filter, { $pull: { tags: value } });
        return NextResponse.json({ success: true, action, count: emailIds.length });
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    const result = await Email.updateMany(filter, update);

    return NextResponse.json({
      success: true,
      action,
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error("Bulk action error:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk action" },
      { status: 500 }
    );
  }
}
