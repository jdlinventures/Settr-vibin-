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
 * GET /api/central-inboxes/[id]/leads/[leadId]
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, leadId } = await params;

    await connectMongo();

    const centralInbox = await CentralInbox.findById(id);
    if (!centralInbox || !userHasAccess(centralInbox, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const lead = await Lead.findOne({ _id: leadId, centralInboxId: id })
      .populate("stageId", "name color")
      .populate("tags", "name color")
      .populate("assignedTo", "name email")
      .populate("notes.userId", "name email");

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Get lead error:", error);
    return NextResponse.json({ error: "Failed to get lead" }, { status: 500 });
  }
}

/**
 * PUT /api/central-inboxes/[id]/leads/[leadId]
 */
export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, leadId } = await params;
    const body = await request.json();

    await connectMongo();

    const centralInbox = await CentralInbox.findById(id);
    if (!centralInbox || !userHasAccess(centralInbox, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowedFields = [
      "firstName", "lastName", "company", "title", "phone", "website",
      "linkedIn", "stageId", "tags", "assignedTo", "followUpDate",
      "isPositiveReply", "customFields",
    ];

    const update = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        update[field] = body[field];
      }
    }

    const lead = await Lead.findOneAndUpdate(
      { _id: leadId, centralInboxId: id },
      { $set: update },
      { new: true }
    )
      .populate("stageId", "name color")
      .populate("tags", "name color")
      .populate("assignedTo", "name email");

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Update lead error:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

/**
 * DELETE /api/central-inboxes/[id]/leads/[leadId]
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, leadId } = await params;

    await connectMongo();

    const centralInbox = await CentralInbox.findById(id);
    if (!centralInbox || !userHasAccess(centralInbox, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const lead = await Lead.findOneAndDelete({ _id: leadId, centralInboxId: id });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete lead error:", error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
