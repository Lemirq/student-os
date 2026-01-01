import * as chrono from "chrono-node";

/**
 * Parse natural language date/time input into a Date object
 * Supports formats like:
 * - "tomorrow at 11:59pm"
 * - "next friday at 2pm"
 * - "jan 15 at 9am"
 * - "in 3 days at noon"
 * - "12/31/2025 11:59pm"
 *
 * @param input - Natural language date/time string
 * @param referenceDate - Optional reference date (defaults to now)
 * @returns Date object or null if parsing fails
 */
export function parseNaturalDate(
  input: string,
  referenceDate?: Date,
): Date | null {
  if (!input || input.trim() === "") {
    return null;
  }

  try {
    const parsed = chrono.parseDate(input, referenceDate);
    return parsed;
  } catch (error) {
    console.error("Error parsing date:", error);
    return null;
  }
}

/**
 * Parse natural language date/time input and return an ISO string
 * Useful for form inputs and API calls
 *
 * @param input - Natural language date/time string
 * @param referenceDate - Optional reference date (defaults to now)
 * @returns ISO 8601 string or null if parsing fails
 */
export function parseNaturalDateToISO(
  input: string,
  referenceDate?: Date,
): string | null {
  const date = parseNaturalDate(input, referenceDate);
  return date ? date.toISOString() : null;
}

/**
 * Format a date for display with optional time
 * @param date - Date object or ISO string
 * @param includeTime - Whether to include time in output
 * @returns Formatted string like "Jan 15, 2025" or "Jan 15, 2025 at 2:00 PM"
 */
export function formatDate(
  date: Date | string,
  includeTime: boolean = false,
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return "Invalid date";
  }

  const dateStr = dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (includeTime) {
    const timeStr = dateObj.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateStr} at ${timeStr}`;
  }

  return dateStr;
}

/**
 * Format a date for form input (YYYY-MM-DDTHH:mm format for datetime-local input)
 * @param date - Date object or ISO string
 * @returns Formatted string for datetime-local input
 */
export function formatDateForInput(date: Date | string | null): string {
  if (!date) return "";

  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return "";
  }

  // Format as YYYY-MM-DDTHH:mm (local time)
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  const hours = String(dateObj.getHours()).padStart(2, "0");
  const minutes = String(dateObj.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Check if a date string has time information
 * @param dateStr - ISO date string
 * @returns true if the time is not midnight (00:00:00)
 */
export function hasTime(dateStr: string | Date | null): boolean {
  if (!dateStr) return false;

  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;

  if (isNaN(date.getTime())) return false;

  // Check if time is not midnight (00:00:00)
  return (
    date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0
  );
}

/**
 * Get relative time string (e.g., "in 2 days", "tomorrow at 3pm", "overdue by 5 hours")
 * @param date - Date object or ISO string
 * @param includeTime - Whether to include time in output for today/tomorrow
 * @returns Relative time string
 */
export function getRelativeTime(
  date: Date | string,
  includeTime: boolean = true,
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return "Invalid date";
  }

  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Overdue
  if (diffMs < 0) {
    const absDiffHours = Math.abs(diffHours);
    const absDiffDays = Math.abs(diffDays);

    if (absDiffDays >= 1) {
      return `overdue by ${absDiffDays} day${absDiffDays === 1 ? "" : "s"}`;
    } else if (absDiffHours >= 1) {
      return `overdue by ${absDiffHours} hour${absDiffHours === 1 ? "" : "s"}`;
    } else {
      return "overdue";
    }
  }

  // Today
  if (diffDays === 0) {
    if (includeTime && hasTime(dateObj)) {
      const timeStr = dateObj.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `today at ${timeStr}`;
    }
    return "today";
  }

  // Tomorrow
  if (diffDays === 1) {
    if (includeTime && hasTime(dateObj)) {
      const timeStr = dateObj.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `tomorrow at ${timeStr}`;
    }
    return "tomorrow";
  }

  // Within a week
  if (diffDays < 7) {
    return `in ${diffDays} days`;
  }

  // More than a week - show actual date
  return formatDate(dateObj, includeTime && hasTime(dateObj));
}
