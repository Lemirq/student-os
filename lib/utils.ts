import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { PageContext } from "@/actions/page-context";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sets the time on a Date object in a specific timezone.
 * This is necessary because setHours() uses the server's local time (UTC on Vercel),
 * but we need to set the time in the user's timezone.
 *
 * @param date - The original date
 * @param hours - Hours to set (0-23)
 * @param minutes - Minutes to set (0-59)
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns A new Date with the time set in the specified timezone
 */
export function setTimeInTimezone(
  date: Date,
  hours: number,
  minutes: number,
  timezone: string,
): Date {
  // Format the date part in the user's timezone
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // Get the date string in YYYY-MM-DD format in the user's timezone
  const dateParts = dateFormatter.formatToParts(date);
  const year = dateParts.find((p) => p.type === "year")?.value;
  const month = dateParts.find((p) => p.type === "month")?.value;
  const day = dateParts.find((p) => p.type === "day")?.value;

  // Build a date-time string in the user's timezone
  const hoursStr = hours.toString().padStart(2, "0");
  const minutesStr = minutes.toString().padStart(2, "0");
  const dateTimeStr = `${year}-${month}-${day}T${hoursStr}:${minutesStr}:00`;

  // Get the offset for this timezone at this specific date/time
  // by creating a formatter that includes the timezone offset
  const tempDate = new Date(dateTimeStr);
  const offsetFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
  });

  const parts = offsetFormatter.formatToParts(tempDate);
  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value || "";

  // Parse the offset (e.g., "GMT-05:00" -> "-05:00")
  const offsetMatch = tzPart.match(/GMT([+-]\d{2}:\d{2})/);
  const offset = offsetMatch ? offsetMatch[1] : "+00:00";

  // Create the final ISO string with the correct offset
  const isoString = `${dateTimeStr}${offset}`;

  return new Date(isoString);
}

/**
 * Formats the page context into a string for the system prompt.
 * This provides the AI with awareness of what page the user is viewing.
 */
export function formatContextForAI(context: PageContext): string {
  switch (context.type) {
    case "dashboard":
      return "User is viewing the main dashboard page.";

    case "course":
      return `User is viewing the course page for ${context.code} (${context.name}). Course ID: ${context.id}`;

    case "semester":
      return `User is viewing the semester page for "${context.name}". Semester ID: ${context.id}`;

    case "task": {
      const courseInfo =
        context.courseCode && context.courseName
          ? ` This task belongs to ${context.courseCode} (${context.courseName}).`
          : "";
      return `User is viewing the task "${context.title}".${courseInfo} Task ID: ${context.id}`;
    }

    case "unknown":
    default:
      return "User's current page is unknown.";
  }
}

export function stripSystemReminders(text: string): string {
  return text
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
    .trim();
}
