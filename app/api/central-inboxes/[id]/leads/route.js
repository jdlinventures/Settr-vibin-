import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import CentralInbox from "@/models/CentralInbox";
import Lead from "@/models/Lead";

function userHasAccess(centralInbox, userId) {
  if (centralInbox.userId.toString() === userId) return true;
  return centralInbox.teamMembers.some(
    (m) => m.userId.toString() === userId
  );
}

/**
 * GET /api/central-inboxes/[id]/leads
 * List leads with filtering, search, sorting, pagination
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);

    await connectMongo();

    const centralInbox = await CentralInbox.findById(id);
    if (!centralInbox) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!userHasAccess(centralInbox, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build query
    const query = { centralInboxId: id };

    // Filters
    const stageId = searchParams.get("stageId");
    if (stageId) query.stageId = stageId;

    const assignedTo = searchParams.get("assignedTo");
    if (assignedTo) query.assignedTo = assignedTo;

    const source = searchParams.get("source");
    if (source) query.source = source;

    const hasFollowUp = searchParams.get("hasFollowUp");
    if (hasFollowUp === "true") {
      query.followUpDate = { $ne: null, $lte: new Date() };
    }

    const search = searchParams.get("search");
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
      ];
    }

    // Sorting
    const sortField = searchParams.get("sortBy") || "createdAt";
    const sortDir = searchParams.get("sortDir") === "asc" ? 1 : -1;
    const sort = { [sortField]: sortDir };

    // Pagination
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("stageId", "name color")
        .populate("tags", "name color")
        .populate("assignedTo", "name email"),
      Lead.countDocuments(query),
    ]);

    return NextResponse.json({
      leads,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("List leads error:", error);
    return NextResponse.json({ error: "Failed to list leads" }, { status: 500 });
  }
}

/**
 * POST /api/central-inboxes/[id]/leads
 * Create a new lead
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    await connectMongo();

    const centralInbox = await CentralInbox.findById(id);
    if (!centralInbox) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!userHasAccess(centralInbox, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email, firstName, lastName, company, title, phone, website, linkedIn, stageId, tags, followUpDate } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const lead = await Lead.create({
      centralInboxId: id,
      email: email.trim().toLowerCase(),
      firstName: firstName?.trim() || undefined,
      lastName: lastName?.trim() || undefined,
      company: company?.trim() || undefined,
      title: title?.trim() || undefined,
      phone: phone?.trim() || undefined,
      website: website?.trim() || undefined,
      linkedIn: linkedIn?.trim() || undefined,
      stageId: stageId || undefined,
      tags: tags || [],
      followUpDate: followUpDate || undefined,
      source: "manual",
    });

    const populated = await Lead.findById(lead._id)
      .populate("stageId", "name color")
      .populate("tags", "name color");

    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "A lead with this email already exists in this inbox" },
        { status: 409 }
      );
    }
    console.error("Create lead error:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
