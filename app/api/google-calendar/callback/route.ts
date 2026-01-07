import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  exchangeCodeForTokens,
  getGoogleUserInfo,
} from "@/lib/google-calendar";
import { db } from "@/drizzle";
import { googleCalendarIntegrations } from "@/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    console.log("[GoogleCalendar Callback]", {
      hasCode: !!code,
      codeLength: code?.length,
      error,
      url: req.url,
    });

    if (error) {
      return NextResponse.redirect(
        new URL("/schedule?error=oauth_error", req.url),
      );
    }

    if (!code) {
      return NextResponse.redirect(new URL("/schedule?error=no_code", req.url));
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    console.log("[GoogleCalendar] Exchanging code for tokens...");
    const { accessToken, refreshToken, expiryDate } =
      await exchangeCodeForTokens(code);

    console.log("[GoogleCalendar] Getting user info...");
    const { email: googleEmail } = await getGoogleUserInfo(accessToken);

    const existing = await db
      .select()
      .from(googleCalendarIntegrations)
      .where(eq(googleCalendarIntegrations.userId, user.id))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(googleCalendarIntegrations).values({
        userId: user.id,
        accessToken,
        refreshToken,
        expiresAt: expiryDate,
        googleEmail,
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      await db
        .update(googleCalendarIntegrations)
        .set({
          accessToken,
          refreshToken,
          expiresAt: expiryDate,
          googleEmail,
          updatedAt: new Date(),
        })
        .where(eq(googleCalendarIntegrations.userId, user.id));
    }

    const { syncUserCalendars } = await import("@/lib/google-calendar");
    await syncUserCalendars(user.id);

    return NextResponse.redirect(new URL("/schedule?connected=true", req.url));
  } catch (error) {
    console.error("Error in Google Calendar callback:", error);
    return NextResponse.redirect(
      new URL("/schedule?error=callback_failed", req.url),
    );
  }
}
