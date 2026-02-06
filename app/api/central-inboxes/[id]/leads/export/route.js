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
 * GET /api/central-inboxes/[id]/leads/export
 * Export all leads as CSV
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
    if (!centralInbox || !userHasAccess(centralInbox, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const leads = await Lead.find({ centralInboxId: id })
      .populate("stageId", "name")
      .populate("tags", "name")
      .populate("assignedTo", "name email")
      .sort({ createdAt: -1 });

    // Build CSV
    const headers = [
      "Email", "First Name", "Last Name", "Company", "Title",
      "Phone", "Website", "LinkedIn", "Stage", "Tags",
      "Assigned To", "Source", "Follow-up Date",
      "Last Contacted", "Last Replied", "Positive Reply", "Created At",
    ];

    const escCsv = (val) => {
      if (!val) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = leads.map((lead) => [
      escCsv(lead.email),
      escCsv(lead.firstName),
      escCsv(lead.lastName),
      escCsv(lead.company),
      escCsv(lead.title),
      escCsv(lead.phone),
      escCsv(lead.website),
      escCsv(lead.linkedIn),
      escCsv(lead.stageId?.name),
      escCsv(lead.tags?.map((t) => t.name).join("; ")),
      escCsv(lead.assignedTo?.email),
      escCsv(lead.source),
      escCsv(lead.followUpDate?.toISOString().split("T")[0]),
      escCsv(lead.lastContactedAt?.toISOString().split("T")[0]),
      escCsv(lead.lastRepliedAt?.toISOString().split("T")[0]),
      escCsv(lead.isPositiveReply ? "Yes" : "No"),
      escCsv(lead.createdAt?.toISOString().split("T")[0]),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leads-${id}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export leads error:", error);
    return NextResponse.json({ error: "Failed to export leads" }, { status: 500 });
  }
}
