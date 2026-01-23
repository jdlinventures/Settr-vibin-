import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Draft from "@/models/Draft";

/**
 * GET /api/drafts/[id]
 * Get a single draft
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await connectMongo();

    const draft = await Draft.findOne({
      _id: id,
      userId: session.user.id,
    })
      .populate("sendFromEmailId", "emailAddress")
      .populate("replyToEmailId", "subject from messageId references");

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json(draft);
  } catch (error) {
    console.error("Get draft error:", error);
    return NextResponse.json(
      { error: "Failed to get draft" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/drafts/[id]
 * Delete a draft
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await connectMongo();

    const draft = await Draft.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete draft error:", error);
    return NextResponse.json(
      { error: "Failed to delete draft" },
      { status: 500 }
    );
  }
}
