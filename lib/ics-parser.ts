import ical from "node-ical";
import type { ParsedICSCourse, ScheduleEvent } from "@/types";
import { format } from "date-fns-tz";

/**
 * Extracts the course code from an ICS event summary.
 * Example: "CSC108H5 LEC0106" -> "CSC108H5"
 * @param summary - The SUMMARY field from the ICS event
 * @returns The extracted course code
 */
export function extractCourseCode(summary: string): string {
  // Match course code pattern: 3-4 letters + 3 digits + optional letter + optional digit
  const match = summary.match(/^([A-Z]{3,4}\d{3}[A-Z]?\d?)/);
  return match ? match[1] : summary.split(" ")[0];
}

/**
 * Extracts the event type from an ICS event summary.
 * Example: "CSC108H5 LEC0106" -> "LEC"
 * @param summary - The SUMMARY field from the ICS event
 * @returns The extracted event type (LEC, TUT, PRA, LAB, etc.)
 */
export function extractEventType(summary: string): string {
  const match = summary.match(/\s([A-Z]{3})\d+/);
  return match ? match[1] : "LEC";
}

/**
 * Extracts the section number from an ICS event summary.
 * Example: "CSC108H5 LEC0106" -> "0106"
 * @param summary - The SUMMARY field from the ICS event
 * @returns The extracted section number
 */
export function extractSection(summary: string): string {
  const match = summary.match(/\s[A-Z]{3}(\d+)/);
  return match ? match[1] : "0000";
}

/**
 * Extracts the building name from an ICS event description.
 * The building name is typically on the second line after \n
 * Example: "Introduction to Computer\nMAANJIWE NENDAMOWINAN" -> "MAANJIWE NENDAMOWINAN"
 * @param description - The DESCRIPTION field from the ICS event
 * @returns The extracted building name or undefined
 */
export function extractBuilding(
  description: string | undefined,
): string | undefined {
  if (!description) return undefined;
  const lines = description.split("\n");
  if (lines.length < 2) return undefined;
  const building = lines[1].trim();
  // Filter out placeholder building names
  if (building === "**********************" || building === "")
    return undefined;
  return building;
}

/**
 * Converts an ICS event with RRULE to a ScheduleEvent object.
 * Handles recurring weekly events, EXDATE exceptions, and timezone conversion.
 * @param event - The parsed ICS event object
 * @param timezone - IANA timezone string (e.g., "America/Toronto")
 * @returns A ScheduleEvent object representing recurring event
 */
export function rruleToSchedule(
  event: Record<string, unknown>,
  timezone = "America/Toronto",
): ScheduleEvent | null {
  try {
    if (
      !event.start ||
      !event.end ||
      !event.summary ||
      typeof event.summary !== "string"
    ) {
      return null;
    }

    const summary = event.summary;
    const startDate = event.start as Date;
    const endDate = event.end as Date;

    // Extract event details
    const type = extractEventType(summary);
    const section = extractSection(summary);
    const dayOfWeek = startDate.getDay();
    const startTime = format(startDate, "HH:mm", { timeZone: timezone });
    const endTimeStr = format(endDate, "HH:mm", { timeZone: timezone });
    const location =
      typeof event.location === "string" ? event.location : undefined;
    const building =
      typeof event.description === "string"
        ? extractBuilding(event.description)
        : undefined;

    // Determine end date from RRULE
    // Default to 4 months from start date if no RRULE.UNTIL is specified
    const defaultEndDate = new Date(startDate);
    defaultEndDate.setMonth(defaultEndDate.getMonth() + 4);

    let finalEndDate = format(defaultEndDate, "yyyy-MM-dd", {
      timeZone: timezone,
    });
    if (event.rrule && typeof event.rrule === "object") {
      const rruleOptions = event.rrule as Record<string, unknown>;
      if (rruleOptions.until && rruleOptions.until instanceof Date) {
        finalEndDate = format(rruleOptions.until, "yyyy-MM-dd", {
          timeZone: timezone,
        });
      }
    }

    // Handle exception dates (EXDATE)
    let exceptionDates: string[] | undefined = undefined;
    if (event.exdate) {
      const exdates = Array.isArray(event.exdate)
        ? event.exdate
        : Object.values(event.exdate);
      exceptionDates = exdates
        .map((exdate: unknown) => {
          const date =
            typeof exdate === "string" ? new Date(exdate) : (exdate as Date);
          return format(date, "yyyy-MM-dd", { timeZone: timezone });
        })
        .filter((d): d is string => typeof d === "string");
    }

    // Check if location is ZZ TBA (exam/test slot)
    const isExamSlot = location === "ZZ TBA";

    return {
      type,
      section,
      dayOfWeek,
      startTime,
      endTime: endTimeStr,
      location,
      building,
      startDate: format(startDate, "yyyy-MM-dd", { timeZone: timezone }),
      endDate: finalEndDate,
      exceptionDates,
      isExamSlot,
    };
  } catch (error) {
    console.error("Error converting RRULE to schedule:", error);
    return null;
  }
}

/**
 * Parses an ICS calendar file and extracts course schedules.
 * Groups events by course code and returns an array of ParsedICSCourse objects.
 * @param fileContent - The raw ICS file content as a string
 * @param timezone - IANA timezone string (e.g., "America/Toronto")
 * @returns An array of ParsedICSCourse objects, each containing course code, name, and events
 */
export function parseICSFile(
  fileContent: string,
  timezone = "America/Toronto",
): ParsedICSCourse[] {
  try {
    const events = ical.sync.parseICS(fileContent);
    const courseMap = new Map<
      string,
      { courseName: string; events: ScheduleEvent[] }
    >();

    for (const event of Object.values(events)) {
      // Only process VEVENT types
      if (
        !event ||
        typeof event !== "object" ||
        event.type !== "VEVENT" ||
        !event.summary ||
        typeof event.summary !== "string"
      ) {
        continue;
      }

      const scheduleEvent = rruleToSchedule(event, timezone);
      if (!scheduleEvent) continue;

      const courseCode = extractCourseCode(event.summary);
      // Extract course name from description (first line)
      const courseName =
        typeof event.description === "string"
          ? event.description.split("\n")[0]
          : courseCode;

      if (!courseMap.has(courseCode)) {
        courseMap.set(courseCode, { courseName, events: [] });
      }

      courseMap.get(courseCode)!.events.push(scheduleEvent);
    }

    // Convert map to array of ParsedICSCourse objects
    return Array.from(courseMap.entries()).map(([courseCode, data]) => ({
      courseCode,
      courseName: data.courseName,
      events: data.events,
    }));
  } catch (error) {
    console.error("Error parsing ICS file:", error);
    throw new Error(
      `Failed to parse ICS file: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
