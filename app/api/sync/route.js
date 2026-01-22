import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import { syncUserEmails, syncConnectedEmail } from "@/libs/sync";

/**
 * POST /api/sync
 * Manually trigger sync for the current user's connected emails
 */
export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { connectedEmailId } = body;

    let results;

    if (connectedEmailId) {
      // Sync a specific connected email
      const result = await syncConnectedEmail(connectedEmailId);
      results = [{ id: connectedEmailId, success: true, ...result }];
    } else {
      // Sync all user's connected emails
      results = await syncUserEmails(session.user.id);
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Manual sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", message: error.message },
      { status: 500 }
    );
  }
}
