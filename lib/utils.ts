import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { PageContext } from "@/actions/page-context";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
