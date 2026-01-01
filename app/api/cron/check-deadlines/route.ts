import { checkAndNotifyDeadlines } from "@/lib/deadline-checker";
import { Receiver } from "@upstash/qstash";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Verifies that the request is from QStash using signature verification.
 * Falls back to CRON_SECRET for local testing or Vercel cron (if still configured).
 */
async function verifyRequest(request: NextRequest): Promise<boolean> {
  // Check for QStash signature first
  const signature = request.headers.get("upstash-signature");

  if (signature) {
    // Verify QStash signature
    if (
      !process.env.QSTASH_CURRENT_SIGNING_KEY ||
      !process.env.QSTASH_NEXT_SIGNING_KEY
    ) {
      console.error("QStash signing keys not configured");
      return false;
    }

    const receiver = new Receiver({
      currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
      nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
    });

    try {
      const body = await request.text();
      const isValid = await receiver.verify({
        signature,
        body,
        url: request.url,
      });
      return isValid;
    } catch (error) {
      console.error("QStash signature verification failed:", error);
      return false;
    }
  }

  // Fall back to CRON_SECRET for Vercel cron or local testing
  const authHeader = request.headers.get("authorization");
  if (authHeader && process.env.CRON_SECRET) {
    return authHeader === `Bearer ${process.env.CRON_SECRET}`;
  }

  return false;
}

/**
 * HTTP POST handler for QStash-triggered deadline checks.
 * QStash sends POST requests by default.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const isAuthorized = await verifyRequest(request);

    if (!isAuthorized) {
      console.error("Unauthorized cron job access attempt");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    console.log("Starting deadline check cron job (QStash)...");

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

/**
 * HTTP GET handler for Vercel cron or manual testing.
 * Kept for backwards compatibility and local testing.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // For GET requests, only check CRON_SECRET
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
