import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import CentralInbox from "@/models/CentralInbox";
import Lead from "@/models/Lead";

/**
 * GET /api/leads
 * List leads across all inboxes the user has access to.
 * Optional ?centralInboxId= filter to scope to one inbox.
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    await connectMongo();

    // Find all inboxes user owns or is a team member of
    const inboxes = await CentralInbox.find({
      $or: [
        { userId: session.user.id },
        { "teamMembers.userId": session.user.id },
      ],
    }).select("_id name");

    const inboxIds = inboxes.map((i) => i._id);

    if (inboxIds.length === 0) {
      return NextResponse.json({ leads: [], total: 0, page: 1, totalPages: 0, inboxes: [] });
    }

    // Build query
    const specificInbox = searchParams.get("centralInboxId");
    const query = {};

    if (specificInbox && inboxIds.some((id) => id.toString() === specificInbox)) {
      query.centralInboxId = specificInbox;
    } else {
      query.centralInboxId = { $in: inboxIds };
    }

    const stageId = searchParams.get("stageId");
    if (stageId) query.stageId = stageId;

    const search = searchParams.get("search");
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
      ];
    }

    const sortField = searchParams.get("sortBy") || "createdAt";
    const sortDir = searchParams.get("sortDir") === "asc" ? 1 : -1;

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit)
        .populate("stageId", "name color")
        .populate("tags", "name color")
        .populate("assignedTo", "name email")
        .populate("centralInboxId", "name"),
      Lead.countDocuments(query),
    ]);

    return NextResponse.json({
      leads,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      inboxes: inboxes.map((i) => ({ id: i._id, name: i.name })),
    });
  } catch (error) {
    console.error("List all leads error:", error);
    return NextResponse.json({ error: "Failed to list leads" }, { status: 500 });
  }
}
