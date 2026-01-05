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
  const match = summary.match(/[A-Z]{3}(\d+)/);
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
 * @returns A ScheduleEvent object representing recurring event
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rruleToSchedule(event: any): ScheduleEvent | null {
  try {
    if (!event.start || !event.end || !event.summary) {
      return null;
    }

    const summary: string = event.summary;
    const startDate = event.start as Date;
    const endDate = event.end as Date;

    // Extract event details
    const type = extractEventType(summary);
    const section = extractSection(summary);
    const dayOfWeek = startDate.getDay();
    const startTime = format(startDate, "HH:mm", {
      timeZone: "America/Toronto",
    });
    const endTimeStr = format(endDate, "HH:mm", {
      timeZone: "America/Toronto",
    });
    const location = event.location || undefined;
    const building = extractBuilding(event.description);

    // Determine end date from RRULE
    let finalEndDate = format(startDate, "yyyy-MM-dd", {
      timeZone: "America/Toronto",
    });
    if (event.rrule) {
      const rruleOptions = event.rrule.options;
      if (rruleOptions && rruleOptions.until) {
        finalEndDate = format(rruleOptions.until, "yyyy-MM-dd", {
          timeZone: "America/Toronto",
        });
      }
    }

    // Handle exception dates (EXDATE)
    let exceptionDates: string[] | undefined = undefined;
    if (event.exdate) {
      const exdates = Array.isArray(event.exdate)
        ? event.exdate
        : Object.values(event.exdate);
      exceptionDates = exdates.map((exdate: unknown) => {
        const date =
          typeof exdate === "string" ? new Date(exdate) : (exdate as Date);
        return format(date, "yyyy-MM-dd", {
          timeZone: "America/Toronto",
        });
      });
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
      startDate: format(startDate, "yyyy-MM-dd", {
        timeZone: "America/Toronto",
      }),
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
 * @returns An array of ParsedICSCourse objects, each containing course code, name, and events
 */
export function parseICSFile(fileContent: string): ParsedICSCourse[] {
  try {
    const events = ical.sync.parseICS(fileContent);
    const courseMap = new Map<
      string,
      { courseName: string; events: ScheduleEvent[] }
    >();

    for (const event of Object.values(events)) {
      // Only process VEVENT types
      if (event.type !== "VEVENT") continue;

      const scheduleEvent = rruleToSchedule(event);
      if (!scheduleEvent) continue;

      const courseCode = extractCourseCode(event.summary);
      // Extract course name from description (first line)
      const courseName = event.description?.split("\n")[0] || courseCode;

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
