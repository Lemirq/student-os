import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/drizzle";
import {
  googleCalendarIntegrations,
  googleCalendars,
  googleCalendarEvents,
} from "@/schema";
import { eq, inArray } from "drizzle-orm";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const integration = await db.query.googleCalendarIntegrations.findFirst({
      where: eq(googleCalendarIntegrations.userId, user.id),
    });

    if (!integration) {
      return NextResponse.json(
        { error: "No integration found" },
        { status: 404 },
      );
    }

    const calendars = await db.query.googleCalendars.findMany({
      where: eq(googleCalendars.integrationId, integration.id),
    });

    const calendarIds = calendars.map((c) => c.id);

    if (calendarIds.length > 0) {
      await db
        .delete(googleCalendarEvents)
        .where(inArray(googleCalendarEvents.calendarId, calendarIds));
    }

    await db
      .delete(googleCalendars)
      .where(eq(googleCalendars.integrationId, integration.id));
    await db
      .delete(googleCalendarIntegrations)
      .where(eq(googleCalendarIntegrations.id, integration.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting Google Calendar:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 },
    );
  }
}
