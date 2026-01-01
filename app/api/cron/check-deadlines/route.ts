import { checkAndNotifyDeadlines } from "@/lib/deadline-checker";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cron job endpoint for checking and notifying about upcoming deadlines
 * Called daily at 9 AM UTC by Vercel Cron
 * Requires CRON_SECRET environment variable for authorization
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
