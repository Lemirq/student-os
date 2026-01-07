import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getVisibleEvents } from "@/lib/google-calendar";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const timeMin = searchParams.get("timeMin");
    const timeMax = searchParams.get("timeMax");

    const events = await getVisibleEvents(
      user.id,
      timeMin ? new Date(timeMin) : undefined,
      timeMax ? new Date(timeMax) : undefined,
    );

    return NextResponse.json(events);
  } catch (error) {
    console.error("Error fetching Google Calendar events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}
