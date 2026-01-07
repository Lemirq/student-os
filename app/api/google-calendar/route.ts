import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generateAuthUrl } from "@/lib/google-calendar";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL(
          "/login",
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        ),
      );
    }

    const authUrl = generateAuthUrl();

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error generating Google Calendar auth URL:", error);
    return NextResponse.redirect(
      new URL(
        "/login",
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      ),
    );
  }
}
