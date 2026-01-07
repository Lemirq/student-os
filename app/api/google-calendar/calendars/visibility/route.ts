import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { toggleCalendarVisibility } from "@/lib/google-calendar";

interface VisibilityRequestBody {
  calendarId: string;
  visible: boolean;
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body: VisibilityRequestBody = await req.json();
    const { calendarId, visible } = body;

    if (typeof calendarId !== "string" || typeof visible !== "boolean") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    await toggleCalendarVisibility(user.id, calendarId, visible);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating calendar visibility:", error);
    return NextResponse.json(
      { error: "Failed to update calendar visibility" },
      { status: 500 },
    );
  }
}
