import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  toggleCalendarVisibility,
  getUserCalendars,
} from "@/lib/google-calendar";

interface ToggleRequestBody {
  isVisible: boolean;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id } = await params;
    const body: ToggleRequestBody = await req.json();
    const { isVisible } = body;

    if (typeof isVisible !== "boolean") {
      return NextResponse.json(
        { error: "isVisible must be a boolean" },
        { status: 400 },
      );
    }

    await toggleCalendarVisibility(user.id, id, isVisible);

    const updatedCalendars = await getUserCalendars(user.id);

    return NextResponse.json(updatedCalendars);
  } catch (error) {
    console.error("Error toggling calendar visibility:", error);
    return NextResponse.json(
      { error: "Failed to toggle calendar visibility" },
      { status: 500 },
    );
  }
}
