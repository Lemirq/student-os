import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getUserCalendars } from "@/lib/google-calendar";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const result = await getUserCalendars(user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching Google Calendars:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendars" },
      { status: 500 },
    );
  }
}
