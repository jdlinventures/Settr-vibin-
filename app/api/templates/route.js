import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import connectMongo from "@/libs/mongoose";
import Template from "@/models/Template";

/**
 * GET /api/templates
 * List templates for current user
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();

    const { searchParams } = new URL(request.url);
    const centralInboxId = searchParams.get("centralInboxId");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const filter = { userId: session.user.id };

    if (centralInboxId) {
      filter.$or = [
        { centralInboxId },
        { centralInboxId: null },
      ];
    }

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const templates = await Template.find(filter)
      .sort({ usageCount: -1, updatedAt: -1 })
      .limit(50);

    return NextResponse.json(templates);
  } catch (error) {
    console.error("List templates error:", error);
    return NextResponse.json(
      { error: "Failed to list templates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates
 * Create a new template
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, subject, bodyHtml, variables, category, centralInboxId } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Template name is required" },
        { status: 400 }
      );
    }

    await connectMongo();

    const template = await Template.create({
      userId: session.user.id,
      centralInboxId: centralInboxId || null,
      name: name.trim(),
      subject: subject || "",
      bodyHtml: bodyHtml || "",
      variables: variables || [],
      category: category || "general",
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Create template error:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
