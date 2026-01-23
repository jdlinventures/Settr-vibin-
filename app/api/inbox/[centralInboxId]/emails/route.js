import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import CentralInbox from "@/models/CentralInbox";
import Email from "@/models/Email";
import Tag from "@/models/Tag";
import Stage from "@/models/Stage";

/**
 * GET /api/inbox/[centralInboxId]/emails
 * Get paginated emails for a central inbox
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { centralInboxId } = await params;
    const { searchParams } = new URL(request.url);

    // Query parameters
    const cursor = searchParams.get("cursor"); // Last email ID for pagination
    const limit = Math.min(parseInt(searchParams.get("limit")) || 50, 100);
    const filter = searchParams.get("filter"); // unread, assigned, archived
    const tags = searchParams.getAll("tag"); // Tag IDs (can be multiple)
    const stage = searchParams.get("stage"); // Stage ID
    const search = searchParams.get("search"); // Search query
    const showWarmup = searchParams.get("showWarmup") === "true";

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

    // Build query
    const query = {
      centralInboxId,
      isArchived: false,
    };

    // Filter out warmup emails by default
    if (!showWarmup) {
      query.isWarmupFiltered = false;
    }

    // Apply filters
    if (filter === "unread") {
      query.isRead = false;
    } else if (filter === "assigned") {
      query.assignedTo = session.user.id;
    } else if (filter === "archived") {
      query.isArchived = true;
    }

    if (tags.length > 0) {
      query.tags = { $all: tags };
    }

    if (stage) {
      query.stageId = stage;
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Cursor-based pagination
    if (cursor) {
      const cursorEmail = await Email.findById(cursor);
      if (cursorEmail) {
        query.receivedAt = { $lt: cursorEmail.receivedAt };
      }
    }

    // Fetch emails - group by threadId and get the latest in each thread
    const emails = await Email.aggregate([
      { $match: query },
      { $sort: { receivedAt: -1 } },
      {
        $group: {
          _id: "$threadId",
          latestEmail: { $first: "$$ROOT" },
          emailCount: { $sum: 1 },
          unreadCount: {
            $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] },
          },
        },
      },
      { $sort: { "latestEmail.receivedAt": -1 } },
      { $limit: limit + 1 }, // Fetch one extra to check if there are more
      // Populate tags
      {
        $lookup: {
          from: "tags",
          localField: "latestEmail.tags",
          foreignField: "_id",
          as: "latestEmail.tags",
        },
      },
      // Populate stage
      {
        $lookup: {
          from: "stages",
          localField: "latestEmail.stageId",
          foreignField: "_id",
          as: "stageArray",
        },
      },
      {
        $addFields: {
          "latestEmail.stage": { $arrayElemAt: ["$stageArray", 0] },
        },
      },
      {
        $project: {
          stageArray: 0,
        },
      },
    ]);

    // Check if there are more results
    const hasMore = emails.length > limit;
    const resultEmails = hasMore ? emails.slice(0, limit) : emails;

    // Format response
    const formattedEmails = resultEmails.map((e) => ({
      ...e.latestEmail,
      id: e.latestEmail._id.toString(),
      _id: undefined,
      threadEmailCount: e.emailCount,
      threadUnreadCount: e.unreadCount,
    }));

    // Get next cursor
    const nextCursor =
      hasMore && resultEmails.length > 0
        ? resultEmails[resultEmails.length - 1].latestEmail._id.toString()
        : null;

    return NextResponse.json({
      emails: formattedEmails,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Get emails error:", error);
    return NextResponse.json(
      { error: "Failed to get emails" },
      { status: 500 }
    );
  }
}
