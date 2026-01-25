import type { ScheduleData, ScheduleEvent } from "@/types";
import { addDays, addWeeks, format, parse, startOfDay } from "date-fns";
import { setTimeInTimezone } from "./utils";

type Semester = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

type Course = {
  id: string;
  code: string;
  color: string | null;
  schedule: ScheduleData | null;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    courseId: string;
    courseCode: string;
    type: string;
    section: string;
    location?: string;
    building?: string;
    isExamSlot?: boolean;
  };
  color: string;
};

/**
 * Detects which semester a schedule belongs to based on start and end dates.
 * Finds the semester that best overlaps with the given date range.
 * @param startDate - ISO date string (e.g., "2025-09-08")
 * @param endDate - ISO date string (e.g., "2025-12-02")
 * @param semesters - Array of semesters with their date ranges
 * @returns The matching semester or null if no match found
 */
export function detectSemester(
  startDate: string,
  endDate: string,
  semesters: Semester[],
): { id: string; name: string } | null {
  try {
    const scheduleStart = parse(startDate, "yyyy-MM-dd", new Date());
    const scheduleEnd = parse(endDate, "yyyy-MM-dd", new Date());

    let bestMatch: { id: string; name: string } | null = null;
    let maxOverlap = 0;

    for (const semester of semesters) {
      const semStart = parse(semester.startDate, "yyyy-MM-dd", new Date());
      const semEnd = parse(semester.endDate, "yyyy-MM-dd", new Date());

      // Calculate overlap days
      const overlapStart = scheduleStart > semStart ? scheduleStart : semStart;
      const overlapEnd = scheduleEnd < semEnd ? scheduleEnd : semEnd;

      if (overlapStart <= overlapEnd) {
        const overlapDays = Math.floor(
          (overlapEnd.getTime() - overlapStart.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (overlapDays > maxOverlap) {
          maxOverlap = overlapDays;
          bestMatch = { id: semester.id, name: semester.name };
        }
      }
    }

    // Only return if there's significant overlap (at least 30 days)
    return maxOverlap >= 30 ? bestMatch : null;
  } catch (error) {
    console.error("Error detecting semester:", error);
    return null;
  }
}

/**
 * Converts course schedule data to calendar events for display.
 * Generates recurring events for each week between startDate and endDate,
 * excluding exception dates (like reading week).
 * @param course - Course object with schedule data
 * @param timezone - Optional IANA timezone string (e.g., "America/New_York").
 *                   If not provided, uses the user's browser timezone.
 * @returns Array of calendar events ready for react-big-calendar
 */
export function scheduleToCalendarEvents(
  course: Course,
  timezone?: string,
): CalendarEvent[] {
  if (!course.schedule || !course.schedule.events.length) {
    return [];
  }

  // Use browser timezone if not provided
  const userTimezone =
    timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const events: CalendarEvent[] = [];
  const defaultColor = course.color || "#3b82f6";

  for (const scheduleEvent of course.schedule.events) {
    try {
      const dateRangeStart = startOfDay(
        parse(scheduleEvent.startDate, "yyyy-MM-dd", new Date()),
      );
      const dateRangeEnd = startOfDay(
        parse(scheduleEvent.endDate, "yyyy-MM-dd", new Date()),
      );

      if (dateRangeStart > dateRangeEnd) {
        console.warn(
          `[schedule-utils] Invalid date range: startDate (${dateRangeStart}) > endDate (${dateRangeEnd})`,
        );
        continue;
      }

      const [startHour, startMinute] = scheduleEvent.startTime
        .split(":")
        .map(Number);
      const [endHour, endMinute] = scheduleEvent.endTime.split(":").map(Number);

      let currentDate = dateRangeStart;
      while (
        currentDate.getDay() !== scheduleEvent.dayOfWeek &&
        currentDate <= dateRangeEnd
      ) {
        currentDate = addDays(currentDate, 1);
      }

      // Generate events for each week
      while (currentDate <= dateRangeEnd) {
        const eventDateStr = format(currentDate, "yyyy-MM-dd");

        // Check if this date is an exception
        const isException =
          scheduleEvent.exceptionDates?.includes(eventDateStr) || false;

        if (!isException) {
          const eventStart = setTimeInTimezone(
            new Date(currentDate),
            startHour,
            startMinute,
            userTimezone,
          );

          const eventEnd = setTimeInTimezone(
            new Date(currentDate),
            endHour,
            endMinute,
            userTimezone,
          );

          events.push({
            id: `${course.id}-${scheduleEvent.type}-${scheduleEvent.section}-${eventDateStr}-${scheduleEvent.startTime}`,
            title: `${course.code} ${scheduleEvent.type}${scheduleEvent.section}`,
            start: eventStart,
            end: eventEnd,
            resource: {
              courseId: course.id,
              courseCode: course.code,
              type: scheduleEvent.type,
              section: scheduleEvent.section,
              location: scheduleEvent.location,
              building: scheduleEvent.building,
              isExamSlot: scheduleEvent.isExamSlot,
            },
            color: defaultColor,
          });
        }

        // Move to next week
        currentDate = addWeeks(currentDate, 1);
      }
    } catch (error) {
      console.error("Error generating calendar events for schedule:", error);
    }
  }

  return events;
}

/**
 * Formats a time range in 12-hour format with AM/PM.
 * Example: "13:00", "15:00" → "1:00 PM - 3:00 PM"
 * @param startTime - Start time in HH:mm format (e.g., "13:00")
 * @param endTime - End time in HH:mm format (e.g., "15:00")
 * @returns Formatted time range string
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  try {
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const formatTime = (hour: number, minute: number): string => {
      const period = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const displayMinute = minute.toString().padStart(2, "0");
      return `${displayHour}:${displayMinute} ${period}`;
    };

    return `${formatTime(startHour, startMinute)} - ${formatTime(endHour, endMinute)}`;
  } catch (error) {
    console.error("Error formatting time range:", error);
    return `${startTime} - ${endTime}`;
  }
}

/**
 * Converts a day of week number to its name.
 * Example: 0 → "Sunday", 1 → "Monday", etc.
 * @param dayOfWeek - Day number (0=Sunday, 1=Monday, ..., 6=Saturday)
 * @returns Day name
 */
export function getDayName(dayOfWeek: number): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[dayOfWeek] || "Unknown";
}

/**
 * Gets a short day name abbreviation.
 * Example: 0 → "Sun", 1 → "Mon", etc.
 * @param dayOfWeek - Day number (0=Sunday, 1=Monday, ..., 6=Saturday)
 * @returns Short day name
 */
export function getShortDayName(dayOfWeek: number): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[dayOfWeek] || "???";
}

/**
 * Validates that a schedule event has all required fields and valid values.
 * @param event - Schedule event to validate
 * @returns true if valid, false otherwise
 */
export function validateScheduleEvent(event: ScheduleEvent): boolean {
  try {
    // Check required fields
    if (!event.type || !event.section || !event.startTime || !event.endTime) {
      return false;
    }

    // Validate day of week
    if (event.dayOfWeek < 0 || event.dayOfWeek > 6) {
      return false;
    }

    // Validate time format (HH:mm)
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(event.startTime) || !timeRegex.test(event.endTime)) {
      return false;
    }

    // Validate dates
    const startDate = parse(event.startDate, "yyyy-MM-dd", new Date());
    const endDate = parse(event.endDate, "yyyy-MM-dd", new Date());

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return false;
    }

    if (startDate > endDate) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating schedule event:", error);
    return false;
  }
}
