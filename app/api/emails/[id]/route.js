import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import ConnectedEmail from "@/models/ConnectedEmail";
import Email from "@/models/Email";

/**
 * GET /api/emails/[id]
 * Get a connected email by ID
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await connectMongo();

    const connectedEmail = await ConnectedEmail.findOne({
      _id: id,
      userId: session.user.id,
    }).select("-oauthTokens -smtpConfig"); // Exclude sensitive fields

    if (!connectedEmail) {
      return NextResponse.json(
        { error: "Connected email not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(connectedEmail);
  } catch (error) {
    console.error("Get connected email error:", error);
    return NextResponse.json(
      { error: "Failed to get connected email" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/emails/[id]
 * Disconnect an email account
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const deleteEmails = searchParams.get("deleteEmails") === "true";

    await connectMongo();

    const connectedEmail = await ConnectedEmail.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!connectedEmail) {
      return NextResponse.json(
        { error: "Connected email not found" },
        { status: 404 }
      );
    }

    // Optionally delete all synced emails
    if (deleteEmails) {
      await Email.deleteMany({ connectedEmailId: id });
    }

    // Delete the connected email
    await ConnectedEmail.deleteOne({ _id: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete connected email error:", error);
    return NextResponse.json(
      { error: "Failed to delete connected email" },
      { status: 500 }
    );
  }
}
