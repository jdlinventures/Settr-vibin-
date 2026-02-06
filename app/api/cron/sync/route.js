import { NextResponse } from "next/server";
import { syncAllEmails } from "@/libs/sync";

/**
 * GET /api/cron/sync
 * Cron job endpoint to sync all connected emails
 *
 * This is called by Vercel Cron Jobs every 2 minutes.
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sync",
 *     "schedule": "star/2 * * * *" (replace star with *)
 *   }]
 * }
 */
export async function GET(request) {
  try {
    // Verify cron secret (optional but recommended for security)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, verify it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting scheduled email sync...");
    const startTime = Date.now();

    const results = await syncAllEmails();

    const duration = Date.now() - startTime;
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(
      `Sync complete: ${successCount} succeeded, ${failCount} failed, took ${duration}ms`
    );

    return NextResponse.json({
      success: true,
      duration,
      total: results.length,
      succeeded: successCount,
      failed: failCount,
      results,
    });
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", message: error.message },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering or testing
export async function POST(request) {
  return GET(request);
}
