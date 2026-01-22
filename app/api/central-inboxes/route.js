import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import CentralInbox from "@/models/CentralInbox";
import Stage from "@/models/Stage";

// Default stages created with every new central inbox
const DEFAULT_STAGES = [
  { name: "New", color: "#6366f1", order: 0, isDefault: true },
  { name: "Interested", color: "#22c55e", order: 1, isDefault: false },
  { name: "Meeting Booked", color: "#3b82f6", order: 2, isDefault: false },
  { name: "Not Interested", color: "#ef4444", order: 3, isDefault: false },
  { name: "No Response", color: "#9ca3af", order: 4, isDefault: false },
];

/**
 * GET /api/central-inboxes
 * List all central inboxes the user has access to (owned or team member)
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();

    // Find inboxes where user is owner OR team member
    const centralInboxes = await CentralInbox.find({
      $or: [
        { userId: session.user.id },
        { "teamMembers.userId": session.user.id },
      ],
    }).sort({ createdAt: -1 });

    return NextResponse.json(centralInboxes);
  } catch (error) {
    console.error("List central inboxes error:", error);
    return NextResponse.json(
      { error: "Failed to list central inboxes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/central-inboxes
 * Create a new central inbox
 */
export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    await connectMongo();

    // Create the central inbox
    const centralInbox = await CentralInbox.create({
      userId: session.user.id,
      name: name.trim(),
      description: description?.trim() || "",
      teamMembers: [],
      warmupKeywords: [],
    });

    // Create default stages for this inbox
    const stageDocs = DEFAULT_STAGES.map((stage) => ({
      ...stage,
      centralInboxId: centralInbox._id,
    }));
    await Stage.insertMany(stageDocs);

    return NextResponse.json(centralInbox, { status: 201 });
  } catch (error) {
    console.error("Create central inbox error:", error);
    return NextResponse.json(
      { error: "Failed to create central inbox" },
      { status: 500 }
    );
  }
}
