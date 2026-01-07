import { db } from "@/drizzle";
import {
  googleCalendarIntegrations,
  googleCalendars,
  googleCalendarEvents,
} from "@/schema";
import { OAuth2Client } from "google-auth-library";
import { calendar_v3, google } from "googleapis";
import { eq, and, or, gte, lte, inArray, desc, sql } from "drizzle-orm";
import {
  googleClientId,
  googleClientSecret,
  googleOAuthRedirectUri,
} from "@/lib/env";

type CalendarClient = calendar_v3.Calendar;

export const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function createOAuth2Client(): OAuth2Client {
  return new OAuth2Client(
    googleClientId,
    googleClientSecret,
    googleOAuthRedirectUri,
  );
}

export function generateAuthUrl(): string {
  const oauth2Client = createOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    redirect_uri: googleOAuthRedirectUri,
  });

  console.log("[GoogleCalendar] Generated auth URL:", {
    authUrl,
    redirectUri: googleOAuthRedirectUri,
  });

  return authUrl;
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<{ accessToken: string; refreshToken: string; expiryDate: Date }> {
  const oauth2Client = createOAuth2Client();
  const tokens = await oauth2Client.getToken(code);

  console.log("[GoogleCalendar] Raw tokens response:", {
    tokensType: typeof tokens,
    tokensValue: JSON.stringify(tokens, null, 2),
  });

  // Handle the actual structure from google-auth-library
  const result = tokens as unknown as Record<string, unknown>;

  // Based on logs: tokens.tokens.access_token contains the token
  let accessToken: string | undefined;
  let refreshToken: string | undefined;
  let expiryDate: Date | undefined;

  // Try result.tokens.access_token (the actual structure from logs)
  if (result.tokens) {
    const tokensObj = result.tokens as unknown as Record<string, unknown>;
    if (typeof tokensObj.access_token === "string") {
      accessToken = tokensObj.access_token;
      refreshToken =
        typeof tokensObj.refresh_token === "string"
          ? tokensObj.refresh_token
          : accessToken;
      if (tokensObj.expiry_date) {
        expiryDate = new Date(tokensObj.expiry_date as number | string);
      }
    }
  }

  // Fallback to other structures
  if (!accessToken && result.res) {
    const res = result.res as unknown as Record<string, unknown>;
    if (res.data) {
      const data = res.data as unknown as Record<string, unknown>;
      if (typeof data.access_token === "string") {
        accessToken = data.access_token;
        refreshToken =
          typeof data.refresh_token === "string"
            ? data.refresh_token
            : accessToken;
        if (data.expiry_date) {
          expiryDate = new Date(data.expiry_date as number | string);
        }
      }
    }
  }

  if (!accessToken) {
    throw new Error(
      "Failed to get access token. Response structure: " +
        JSON.stringify(tokens),
    );
  }

  // Default expiry to 1 hour from now if not found
  if (!expiryDate) {
    expiryDate = new Date(Date.now() + 3600 * 1000);
  }

  console.log("[GoogleCalendar] Tokens extracted successfully", {
    hasAccessToken: !!accessToken,
    hasRefreshToken: !!refreshToken,
    expiryDate: expiryDate.toISOString(),
  });

  return {
    accessToken,
    refreshToken: refreshToken || accessToken,
    expiryDate,
  };
}

export async function getGoogleUserInfo(
  accessToken: string,
): Promise<{ email: string }> {
  console.log("[GoogleCalendar] Fetching user info with token:", {
    tokenLength: accessToken.length,
    tokenPrefix: accessToken.substring(0, 20) + "...",
  });

  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  console.log("[GoogleCalendar] User info response:", {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to get Google user info:", {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    throw new Error(`Failed to get user email from Google: ${response.status}`);
  }

  const data = (await response.json()) as { email?: string };

  console.log("[GoogleCalendar] User info data:", { email: data.email });

  if (!data.email) {
    throw new Error("Failed to get user email from Google");
  }

  return { email: data.email };
}

export async function getUserCalendars(userId: string): Promise<{
  isConnected: boolean;
  googleEmail: string | null;
  lastSync: Date | null;
  calendars: Array<{
    id: string;
    name: string;
    isVisible: boolean | null;
    backgroundColor: string | null;
    lastSyncedAt: Date | null;
  }>;
}> {
  const integration = await db.query.googleCalendarIntegrations.findFirst({
    where: eq(googleCalendarIntegrations.userId, userId),
  });

  if (!integration) {
    return {
      isConnected: false,
      googleEmail: null,
      lastSync: null,
      calendars: [],
    };
  }

  const calendars = await db
    .select({
      id: googleCalendars.id,
      name: googleCalendars.name,
      isVisible: googleCalendars.isVisible,
      backgroundColor: googleCalendars.backgroundColor,
      lastSyncedAt: googleCalendars.lastSyncedAt,
    })
    .from(googleCalendars)
    .where(eq(googleCalendars.integrationId, integration.id));

  return {
    isConnected: true,
    googleEmail: integration.googleEmail,
    lastSync: integration.lastSyncAt,
    calendars,
  };
}

export async function syncAllVisibleCalendars(
  userId: string,
): Promise<{ calendarCount: number; syncedCalendars: string[] }> {
  const integration = await db.query.googleCalendarIntegrations.findFirst({
    where: eq(googleCalendarIntegrations.userId, userId),
  });

  if (!integration) {
    throw new Error("Google Calendar integration not found");
  }

  await syncUserCalendars(userId);

  const visibleCalendars = await db.query.googleCalendars.findMany({
    where: and(
      eq(googleCalendars.integrationId, integration.id),
      eq(googleCalendars.isVisible, true),
    ),
  });

  const syncedCalendars: string[] = [];

  for (const calendar of visibleCalendars) {
    try {
      await syncCalendarEvents(userId, calendar.id);
      syncedCalendars.push(calendar.name);
    } catch (error) {
      console.error(`Failed to sync calendar ${calendar.name}:`, error);
    }
  }

  return {
    calendarCount: visibleCalendars.length,
    syncedCalendars,
  };
}

export async function getGoogleCalendarClient(
  userId: string,
): Promise<CalendarClient> {
  const integration = await db.query.googleCalendarIntegrations.findFirst({
    where: eq(googleCalendarIntegrations.userId, userId),
  });

  if (!integration) {
    throw new Error("Google Calendar integration not found for user");
  }

  const oauth2Client = new OAuth2Client(
    googleClientId,
    googleClientSecret,
    googleOAuthRedirectUri,
  );

  oauth2Client.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken,
  });

  const expiryDate = new Date(integration.expiresAt);
  const now = new Date();

  if (expiryDate <= now) {
    const newTokens = await refreshAccessToken(integration.refreshToken);

    await db
      .update(googleCalendarIntegrations)
      .set({
        accessToken: newTokens.access_token,
        expiresAt: new Date(Date.now() + newTokens.expiry_date!),
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarIntegrations.id, integration.id));

    oauth2Client.setCredentials({
      access_token: newTokens.access_token,
      refresh_token: integration.refreshToken,
    });
  }

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  return calendar;
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expiry_date: number;
}> {
  const oauth2Client = new OAuth2Client(
    googleClientId,
    googleClientSecret,
    googleOAuthRedirectUri,
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Failed to refresh access token");
  }

  return {
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token || refreshToken,
    expiry_date: credentials.expiry_date || Date.now() + 3600000,
  };
}

export async function syncUserCalendars(userId: string): Promise<number> {
  const calendar = await getGoogleCalendarClient(userId);

  const integration = await db.query.googleCalendarIntegrations.findFirst({
    where: eq(googleCalendarIntegrations.userId, userId),
  });

  if (!integration) {
    throw new Error("Google Calendar integration not found for user");
  }

  const response = await calendar.calendarList.list();

  const googleCalendarsList = response.data.items || [];

  let syncedCount = 0;

  for (const googleCal of googleCalendarsList) {
    if (!googleCal.id || !googleCal.summary) {
      continue;
    }

    const existingCalendar = await db.query.googleCalendars.findFirst({
      where: and(
        eq(googleCalendars.integrationId, integration.id),
        eq(googleCalendars.googleCalendarId, googleCal.id),
      ),
    });

    if (existingCalendar) {
      await db
        .update(googleCalendars)
        .set({
          name: googleCal.summary,
          description: googleCal.description || null,
          backgroundColor: googleCal.backgroundColor || null,
          foregroundColor: googleCal.foregroundColor || null,
          primary: googleCal.primary || false,
          timezone: googleCal.timeZone || null,
          isVisible: existingCalendar.isVisible,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(googleCalendars.id, existingCalendar.id));
    } else {
      await db.insert(googleCalendars).values({
        integrationId: integration.id,
        googleCalendarId: googleCal.id,
        name: googleCal.summary,
        description: googleCal.description || null,
        backgroundColor: googleCal.backgroundColor || null,
        foregroundColor: googleCal.foregroundColor || null,
        primary: googleCal.primary || false,
        timezone: googleCal.timeZone || null,
        isVisible: true,
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    syncedCount++;
  }

  await db
    .update(googleCalendarIntegrations)
    .set({
      lastSyncAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(googleCalendarIntegrations.id, integration.id));

  return syncedCount;
}

export async function syncCalendarEvents(
  userId: string,
  calendarId: string,
  timeMin?: Date,
  timeMax?: Date,
): Promise<number> {
  const calendar = await getGoogleCalendarClient(userId);

  const dbCalendar = await db.query.googleCalendars.findFirst({
    where: eq(googleCalendars.id, calendarId),
    with: {
      integration: true,
    },
  });

  if (!dbCalendar || dbCalendar.integration.userId !== userId) {
    throw new Error("Calendar not found or unauthorized");
  }

  let syncedCount = 0;
  let pageToken: string | undefined = undefined;

  do {
    // @ts-expect-error - false positive: response is not used in its own initializer
    const response = await calendar.events.list({
      calendarId: dbCalendar.googleCalendarId,
      timeMin: timeMin ? timeMin.toISOString() : undefined,
      timeMax: timeMax ? timeMax.toISOString() : undefined,
      singleEvents: true,
      orderBy: "startTime",
      pageToken,
    });

    const events = response.data.items || [];

    for (const event of events) {
      if (!event.id) {
        continue;
      }

      const startDateTime = event.start?.dateTime
        ? new Date(event.start.dateTime)
        : event.start?.date
          ? new Date(event.start.date)
          : null;

      const endDateTime = event.end?.dateTime
        ? new Date(event.end.dateTime)
        : event.end?.date
          ? new Date(event.end.date)
          : null;

      const isAllDay = !event.start?.dateTime && !!event.start?.date;

      const existingEvent = await db.query.googleCalendarEvents.findFirst({
        where: and(
          eq(googleCalendarEvents.calendarId, calendarId),
          eq(googleCalendarEvents.googleEventId, event.id),
        ),
      });

      const lastUpdated = event.updated ? new Date(event.updated) : new Date();

      if (existingEvent) {
        if (existingEvent.lastUpdated < lastUpdated) {
          await db
            .update(googleCalendarEvents)
            .set({
              summary: event.summary || null,
              description: event.description || null,
              location: event.location || null,
              htmlLink: event.htmlLink || null,
              startDateTime,
              endDateTime,
              isAllDay,
              lastUpdated,
            })
            .where(eq(googleCalendarEvents.id, existingEvent.id));
        }
      } else {
        await db.insert(googleCalendarEvents).values({
          calendarId,
          googleEventId: event.id,
          summary: event.summary || null,
          description: event.description || null,
          location: event.location || null,
          htmlLink: event.htmlLink || null,
          startDateTime,
          endDateTime,
          isAllDay,
          lastUpdated,
          createdAt: new Date(),
        });

        syncedCount++;
      }
    }

    pageToken = response.data.nextPageToken;
  } while (pageToken);

  await db
    .update(googleCalendars)
    .set({
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(googleCalendars.id, calendarId));

  return syncedCount;
}

export async function toggleCalendarVisibility(
  userId: string,
  calendarId: string,
  isVisible: boolean,
): Promise<void> {
  const calendar = await db.query.googleCalendars.findFirst({
    where: eq(googleCalendars.id, calendarId),
    with: {
      integration: true,
    },
  });

  if (!calendar || calendar.integration.userId !== userId) {
    throw new Error("Calendar not found or unauthorized");
  }

  await db
    .update(googleCalendars)
    .set({
      isVisible,
      updatedAt: new Date(),
    })
    .where(eq(googleCalendars.id, calendarId));

  await db.$cache.invalidate({ tables: [googleCalendars] });
}

export async function getVisibleEvents(
  userId: string,
  timeMin?: Date,
  timeMax?: Date,
): Promise<
  Array<{
    id: string;
    googleEventId: string;
    summary: string | null;
    description: string | null;
    location: string | null;
    htmlLink: string | null;
    startDateTime: Date | null;
    endDateTime: Date | null;
    isAllDay: boolean | null;
    calendarId: string;
    googleCalendarId: string;
    calendarName: string;
    backgroundColor: string | null;
    foregroundColor: string | null;
    primary: boolean;
  }>
> {
  const integration = await db.query.googleCalendarIntegrations.findFirst({
    where: eq(googleCalendarIntegrations.userId, userId),
  });

  if (!integration) {
    throw new Error("Google Calendar integration not found for user");
  }

  const visibleCalendars = await db.query.googleCalendars.findMany({
    where: and(
      eq(googleCalendars.integrationId, integration.id),
      eq(googleCalendars.isVisible, true),
    ),
  });

  if (visibleCalendars.length === 0) {
    return [];
  }

  const calendarIds = visibleCalendars.map((c) => c.id);

  let whereConditions = inArray(googleCalendarEvents.calendarId, calendarIds);

  if (timeMin || timeMax) {
    const dateConditions: Array<
      ReturnType<typeof gte> | ReturnType<typeof lte>
    > = [];

    if (timeMin) {
      dateConditions.push(gte(googleCalendarEvents.startDateTime, timeMin));
    }

    if (timeMax) {
      dateConditions.push(lte(googleCalendarEvents.endDateTime, timeMax));
    }

    if (dateConditions.length > 0) {
      whereConditions = and(whereConditions, ...dateConditions)!;
    }
  }

  const events = await db.query.googleCalendarEvents.findMany({
    where: whereConditions,
    orderBy: [desc(googleCalendarEvents.startDateTime)],
  });

  return events.map((event) => {
    const calendar = visibleCalendars.find((c) => c.id === event.calendarId);

    return {
      id: event.id,
      googleEventId: event.googleEventId,
      summary: event.summary,
      description: event.description,
      location: event.location,
      htmlLink: event.htmlLink,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      isAllDay: event.isAllDay,
      calendarId: event.calendarId,
      googleCalendarId: calendar?.googleCalendarId || "",
      calendarName: calendar?.name || "",
      backgroundColor: calendar?.backgroundColor || null,
      foregroundColor: calendar?.foregroundColor || null,
      primary: calendar?.primary || false,
    };
  });
}
