import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import CentralInbox from "@/models/CentralInbox";
import ConnectedEmail from "@/models/ConnectedEmail";

/**
 * POST /api/central-inboxes/[id]/assign-email
 * Assign a connected email to this central inbox
 */
export async function POST(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { connectedEmailId } = body;

    if (!connectedEmailId) {
      return NextResponse.json(
        { error: "connectedEmailId is required" },
        { status: 400 }
      );
    }

    await connectMongo();

    // Verify central inbox exists and user has access
    const centralInbox = await CentralInbox.findById(id);

    if (!centralInbox) {
      return NextResponse.json(
        { error: "Central inbox not found" },
        { status: 404 }
      );
    }

    // Check user is owner or admin
    const isOwner = centralInbox.userId.toString() === session.user.id;
    const isAdmin = centralInbox.teamMembers.some(
      (m) => m.userId.toString() === session.user.id && m.role === "admin"
    );

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify connected email exists and belongs to user
    const connectedEmail = await ConnectedEmail.findOne({
      _id: connectedEmailId,
      userId: session.user.id,
    });

    if (!connectedEmail) {
      return NextResponse.json(
        { error: "Connected email not found" },
        { status: 404 }
      );
    }

    // Assign to central inbox
    connectedEmail.centralInboxId = id;
    await connectedEmail.save();

    // Note: Email sync will happen via the cron job or can be triggered manually
    // We skip immediate sync here to avoid module loading issues in dev

    return NextResponse.json({
      success: true,
      message: "Email assigned successfully. Emails will sync shortly.",
    });
  } catch (error) {
    console.error("Assign email error:", error);
    return NextResponse.json(
      { error: "Failed to assign email" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/central-inboxes/[id]/assign-email
 * Unassign a connected email from this central inbox
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const connectedEmailId = searchParams.get("connectedEmailId");

    if (!connectedEmailId) {
      return NextResponse.json(
        { error: "connectedEmailId is required" },
        { status: 400 }
      );
    }

    await connectMongo();

    // Verify central inbox exists and user has access
    const centralInbox = await CentralInbox.findById(id);

    if (!centralInbox) {
      return NextResponse.json(
        { error: "Central inbox not found" },
        { status: 404 }
      );
    }

    // Check user is owner or admin
    const isOwner = centralInbox.userId.toString() === session.user.id;
    const isAdmin = centralInbox.teamMembers.some(
      (m) => m.userId.toString() === session.user.id && m.role === "admin"
    );

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Unassign connected email
    await ConnectedEmail.updateOne(
      { _id: connectedEmailId, centralInboxId: id },
      { $unset: { centralInboxId: "" } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unassign email error:", error);
    return NextResponse.json(
      { error: "Failed to unassign email" },
      { status: 500 }
    );
  }
}
