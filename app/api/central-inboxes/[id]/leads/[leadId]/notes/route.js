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
 * POST /api/central-inboxes/[id]/leads/[leadId]/notes
 * Add a note to a lead
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, leadId } = await params;
    const { text } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Note text is required" }, { status: 400 });
    }

    await connectMongo();

    const centralInbox = await CentralInbox.findById(id);
    if (!centralInbox || !userHasAccess(centralInbox, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const lead = await Lead.findOneAndUpdate(
      { _id: leadId, centralInboxId: id },
      {
        $push: {
          notes: { userId: session.user.id, text: text.trim() },
        },
      },
      { new: true }
    ).populate("notes.userId", "name email");

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(lead.notes[lead.notes.length - 1], { status: 201 });
  } catch (error) {
    console.error("Add note error:", error);
    return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
  }
}

/**
 * DELETE /api/central-inboxes/[id]/leads/[leadId]/notes
 * Delete a note from a lead (pass noteId in query string)
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, leadId } = await params;
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get("noteId");

    if (!noteId) {
      return NextResponse.json({ error: "noteId is required" }, { status: 400 });
    }

    await connectMongo();

    const centralInbox = await CentralInbox.findById(id);
    if (!centralInbox || !userHasAccess(centralInbox, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const lead = await Lead.findOneAndUpdate(
      { _id: leadId, centralInboxId: id },
      { $pull: { notes: { _id: noteId } } },
      { new: true }
    );

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete note error:", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
