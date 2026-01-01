import { checkAndNotifyDeadlines } from "@/lib/deadline-checker";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * HTTP GET handler that runs the daily cron to check and notify upcoming deadlines.
 *
 * This endpoint is protected by a Bearer token derived from the `CRON_SECRET` environment variable.
 *
 * @param request - Incoming request; must include an `Authorization` header with value `Bearer <CRON_SECRET>`.
 * @returns A JSON response object:
 * - On success: `{ success: true, timestamp: string, stats: unknown }`
 * - If `CRON_SECRET` is not configured: `{ success: false, error: "Cron secret not configured" }` with status 500
 * - If authorization fails: `{ success: false, error: "Unauthorized" }` with status 401
 * - On other errors: `{ success: false, timestamp: string, error: string }` with status 500
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
      console.error("CRON_SECRET not configured");
      return NextResponse.json(
        { success: false, error: "Cron secret not configured" },
        { status: 500 },
      );
    }

    if (authHeader !== expectedAuth) {
      console.error("Unauthorized cron job access attempt");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    console.log("Starting deadline check cron job...");

    // Run the deadline checker
    const stats = await checkAndNotifyDeadlines();

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      stats,
    };

    console.log("Deadline check cron job completed successfully:", stats);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error in deadline check cron job:", error);

    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
