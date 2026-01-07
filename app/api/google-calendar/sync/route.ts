import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { syncAllVisibleCalendars } from "@/lib/google-calendar";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { calendarCount, syncedCalendars } = await syncAllVisibleCalendars(
      user.id,
    );

    return NextResponse.json({
      success: true,
      calendarCount,
      syncedCalendars,
    });
  } catch (error) {
    console.error("Error syncing Google Calendar:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to sync calendars",
      },
      { status: 500 },
    );
  }
}
