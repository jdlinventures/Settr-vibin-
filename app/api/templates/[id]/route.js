import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Template from "@/models/Template";

/**
 * GET /api/templates/[id]
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectMongo();

    const template = await Template.findOne({
      _id: id,
      userId: session.user.id,
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Get template error:", error);
    return NextResponse.json(
      { error: "Failed to get template" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/templates/[id]
 */
export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, subject, bodyHtml, variables, category, centralInboxId } = body;

    await connectMongo();

    const template = await Template.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      {
        ...(name !== undefined && { name: name.trim() }),
        ...(subject !== undefined && { subject }),
        ...(bodyHtml !== undefined && { bodyHtml }),
        ...(variables !== undefined && { variables }),
        ...(category !== undefined && { category }),
        ...(centralInboxId !== undefined && { centralInboxId: centralInboxId || null }),
      },
      { new: true }
    );

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Update template error:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/templates/[id]
 */
export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectMongo();

    const template = await Template.findOneAndDelete({
      _id: id,
      userId: session.user.id,
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete template error:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
