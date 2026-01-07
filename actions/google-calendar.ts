"use server";

import { db } from "@/drizzle";
import { googleCalendarIntegrations, googleCalendars } from "@/schema";
import { createClient } from "@/utils/supabase/server";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { GoogleCalendar } from "@/types";

export async function disconnectGoogleCalendar(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    await db
      .delete(googleCalendarIntegrations)
      .where(eq(googleCalendarIntegrations.userId, user.id));

    revalidatePath("/schedule");

    return { success: true };
  } catch (error) {
    console.error("Error disconnecting Google Calendar:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getGoogleCalendarStatus(): Promise<{
  isConnected: boolean;
  googleEmail?: string;
  lastSync?: Date;
  calendars: GoogleCalendar[];
  visibleCalendarCount: number;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const integration = await db.query.googleCalendarIntegrations.findFirst({
      where: eq(googleCalendarIntegrations.userId, user.id),
      with: {
        googleCalendars: true,
      },
    });

    if (!integration) {
      return {
        isConnected: false,
        calendars: [],
        visibleCalendarCount: 0,
      };
    }

    const visibleCalendars = integration.googleCalendars.filter(
      (cal) => cal.isVisible,
    ).length;

    return {
      isConnected: true,
      googleEmail: integration.googleEmail,
      lastSync: integration.lastSyncAt || undefined,
      calendars: integration.googleCalendars as GoogleCalendar[],
      visibleCalendarCount: visibleCalendars,
    };
  } catch (error) {
    console.error("Error getting Google Calendar status:", error);
    return {
      isConnected: false,
      calendars: [],
      visibleCalendarCount: 0,
    };
  }
}

export async function toggleGoogleCalendar(
  calendarId: string,
  isVisible: boolean,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const integration = await db.query.googleCalendarIntegrations.findFirst({
      where: eq(googleCalendarIntegrations.userId, user.id),
    });

    if (!integration) {
      throw new Error("Google Calendar not connected");
    }

    await db
      .update(googleCalendars)
      .set({ isVisible })
      .where(
        and(
          eq(googleCalendars.id, calendarId),
          eq(googleCalendars.integrationId, integration.id),
        ),
      );

    revalidatePath("/schedule");

    return { success: true };
  } catch (error) {
    console.error("Error toggling Google Calendar visibility:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
