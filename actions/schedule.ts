"use server";

import { db } from "@/drizzle";
import { courses, semesters } from "@/schema";
import { createClient } from "@/utils/supabase/server";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { parseICSFile } from "@/lib/ics-parser";
import { findBestCourseMatches } from "@/lib/course-matcher";
import { detectSemester } from "@/lib/schedule-utils";
import {
  scheduleEventSchema,
  saveScheduleMatchSchema,
  importScheduleSchema,
} from "@/lib/schemas";
import type {
  ScheduleEvent,
  CourseMatch,
  ScheduleData,
  Course,
  Semester,
} from "@/types";

/**
 * Import schedule from ICS file and return course matches for user review
 *
 * @param fileContent - Raw ICS file content as string
 * @param timezone - User's IANA timezone string (e.g., "America/New_York")
 * @returns Object with success status, course matches, and any errors
 */
export async function importScheduleFromICS(
  fileContent: string,
  timezone?: string,
): Promise<{
  success: boolean;
  matches?: CourseMatch[];
  errors?: string[];
}> {
  try {
    // Validate authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Validate input
    const validated = importScheduleSchema.parse({ fileContent, timezone });

    // Parse ICS file
    const parsedCourses = parseICSFile(
      validated.fileContent,
      validated.timezone,
    );
    const parseErrors: string[] = [];

    // Fetch user's courses with semesters
    const userCourses = await db.query.courses.findMany({
      where: eq(courses.userId, user.id),
      with: {
        semester: true,
      },
    });

    // Fetch user's semesters for semester detection
    const userSemesters = await db.query.semesters.findMany({
      where: eq(semesters.userId, user.id),
    });

    // Build course matches
    const matches: CourseMatch[] = [];

    for (const parsedCourse of parsedCourses) {
      // Find best matching courses
      const courseMatches = findBestCourseMatches(
        parsedCourse.courseCode,
        userCourses,
      );

      // Detect semester for these events
      // Find earliest start date and latest end date from all events
      const startDates = parsedCourse.events.map((e) => e.startDate);
      const endDates = parsedCourse.events.map((e) => e.endDate);
      const earliestStart = startDates.sort()[0];
      const latestEnd = endDates.sort().reverse()[0];

      const detectedSemester = detectSemester(
        earliestStart,
        latestEnd,
        userSemesters,
      );

      // Get suggested course (highest score)
      const suggestedCourse =
        courseMatches.length > 0 ? courseMatches[0] : null;

      // Build available courses list
      const availableCourses = courseMatches.map((match) => ({
        id: match.course.id,
        code: match.course.code,
        name: match.course.name,
        semesterName: match.course.semester?.name || null,
      }));

      matches.push({
        icsCode: parsedCourse.courseCode,
        icsCourseName: parsedCourse.courseName,
        events: parsedCourse.events,
        suggestedCourseId: suggestedCourse?.course.id || null,
        suggestedCourseName: suggestedCourse
          ? `${suggestedCourse.course.code} - ${suggestedCourse.course.name}`
          : "No match found",
        availableCourses,
        semesterId: detectedSemester?.id || null,
        semesterName: detectedSemester?.name || null,
      });
    }

    return {
      success: true,
      matches,
      errors: parseErrors.length > 0 ? parseErrors : undefined,
    };
  } catch (error) {
    console.error("Error importing schedule from ICS:", error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Save user-confirmed course-schedule matches to database
 *
 * @param matches - Array of course IDs with their schedule events
 * @returns Object with success status and count of updated courses
 */
export async function saveScheduleMatches(
  matches: Array<{ courseId: string; events: ScheduleEvent[] }>,
): Promise<{
  success: boolean;
  updatedCount?: number;
  error?: string;
}> {
  try {
    // Validate authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Validate input
    const validated = saveScheduleMatchSchema.parse({ matches });

    let updatedCount = 0;

    for (const match of validated.matches) {
      // Verify course ownership
      const course = await db.query.courses.findFirst({
        where: and(eq(courses.id, match.courseId), eq(courses.userId, user.id)),
      });

      if (!course) {
        throw new Error(`Course ${match.courseId} not found or unauthorized`);
      }

      // Update course with schedule
      await db
        .update(courses)
        .set({
          schedule: { events: match.events } as ScheduleData,
        })
        .where(eq(courses.id, match.courseId));

      updatedCount++;
    }

    // Invalidate cache
    await db.$cache.invalidate({ tables: [courses] });

    // Revalidate paths
    revalidatePath("/schedule");
    revalidatePath("/dashboard");

    return {
      success: true,
      updatedCount,
    };
  } catch (error) {
    console.error("Error saving schedule matches:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Manually add a schedule event to a course
 *
 * @param courseId - Course ID
 * @param event - Schedule event to add
 * @returns Object with success status
 */
export async function addScheduleEvent(
  courseId: string,
  event: ScheduleEvent,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Validate authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Validate event
    const validatedEvent = scheduleEventSchema.parse(event);

    // Fetch course with existing schedule
    const course = await db.query.courses.findFirst({
      where: and(eq(courses.id, courseId), eq(courses.userId, user.id)),
    });

    if (!course) {
      throw new Error("Course not found or unauthorized");
    }

    // Get existing schedule or create new one
    const existingSchedule = course.schedule as ScheduleData | null;
    const existingEvents = existingSchedule?.events || [];

    // Append new event
    const updatedEvents = [...existingEvents, validatedEvent];

    // Update database
    await db
      .update(courses)
      .set({
        schedule: { events: updatedEvents } as ScheduleData,
      })
      .where(eq(courses.id, courseId));

    // Invalidate cache
    await db.$cache.invalidate({ tables: [courses] });

    // Revalidate paths
    revalidatePath("/schedule");
    revalidatePath(`/courses/${courseId}`);

    return { success: true };
  } catch (error) {
    console.error("Error adding schedule event:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Update an existing schedule event
 *
 * @param courseId - Course ID
 * @param eventIndex - Index of event to update
 * @param event - Updated schedule event
 * @returns Object with success status
 */
export async function updateScheduleEvent(
  courseId: string,
  eventIndex: number,
  event: ScheduleEvent,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Validate authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Validate event
    const validatedEvent = scheduleEventSchema.parse(event);

    // Fetch course with existing schedule
    const course = await db.query.courses.findFirst({
      where: and(eq(courses.id, courseId), eq(courses.userId, user.id)),
    });

    if (!course) {
      throw new Error("Course not found or unauthorized");
    }

    // Get existing schedule
    const existingSchedule = course.schedule as ScheduleData | null;
    if (!existingSchedule || !existingSchedule.events) {
      throw new Error("No schedule data found for this course");
    }

    // Validate index
    if (eventIndex < 0 || eventIndex >= existingSchedule.events.length) {
      throw new Error("Invalid event index");
    }

    // Update event at index
    const updatedEvents = [...existingSchedule.events];
    updatedEvents[eventIndex] = validatedEvent;

    // Update database
    await db
      .update(courses)
      .set({
        schedule: { events: updatedEvents } as ScheduleData,
      })
      .where(eq(courses.id, courseId));

    // Invalidate cache
    await db.$cache.invalidate({ tables: [courses] });

    // Revalidate paths
    revalidatePath("/schedule");
    revalidatePath(`/courses/${courseId}`);

    return { success: true };
  } catch (error) {
    console.error("Error updating schedule event:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a schedule event
 *
 * @param courseId - Course ID
 * @param eventIndex - Index of event to delete
 * @returns Object with success status
 */
export async function deleteScheduleEvent(
  courseId: string,
  eventIndex: number,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Validate authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch course with existing schedule
    const course = await db.query.courses.findFirst({
      where: and(eq(courses.id, courseId), eq(courses.userId, user.id)),
    });

    if (!course) {
      throw new Error("Course not found or unauthorized");
    }

    // Get existing schedule
    const existingSchedule = course.schedule as ScheduleData | null;
    if (!existingSchedule || !existingSchedule.events) {
      throw new Error("No schedule data found for this course");
    }

    // Validate index
    if (eventIndex < 0 || eventIndex >= existingSchedule.events.length) {
      throw new Error("Invalid event index");
    }

    // Remove event at index
    const updatedEvents = existingSchedule.events.filter(
      (_, index) => index !== eventIndex,
    );

    // Update database
    await db
      .update(courses)
      .set({
        schedule: { events: updatedEvents } as ScheduleData,
      })
      .where(eq(courses.id, courseId));

    // Invalidate cache
    await db.$cache.invalidate({ tables: [courses] });

    // Revalidate paths
    revalidatePath("/schedule");
    revalidatePath(`/courses/${courseId}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting schedule event:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Remove all schedule data from a course
 *
 * @param courseId - Course ID
 * @returns Object with success status
 */
export async function clearCourseSchedule(courseId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Validate authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Verify course ownership
    const course = await db.query.courses.findFirst({
      where: and(eq(courses.id, courseId), eq(courses.userId, user.id)),
    });

    if (!course) {
      throw new Error("Course not found or unauthorized");
    }

    // Clear schedule
    await db
      .update(courses)
      .set({
        schedule: null,
      })
      .where(eq(courses.id, courseId));

    // Invalidate cache
    await db.$cache.invalidate({ tables: [courses] });

    // Revalidate paths
    revalidatePath("/schedule");
    revalidatePath(`/courses/${courseId}`);

    return { success: true };
  } catch (error) {
    console.error("Error clearing course schedule:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetch all courses with schedules for the current user
 *
 * @returns Object with courses that have schedule data
 */
export async function getUserSchedule(): Promise<{
  courses: Array<
    Course & {
      semester: Semester | null;
      schedule: ScheduleData | null;
    }
  >;
}> {
  try {
    // Validate authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { courses: [] };

    // Fetch courses with schedules and semesters
    const coursesWithSchedule = await db.query.courses.findMany({
      where: eq(courses.userId, user.id),
      with: {
        semester: true,
      },
    });

    // Filter to only courses with schedule data
    const coursesWithData = coursesWithSchedule
      .filter((course) => course.schedule !== null)
      .map((course) => ({
        ...course,
        schedule: course.schedule as ScheduleData | null,
      }));

    return { courses: coursesWithData };
  } catch (error) {
    console.error("Error fetching user schedule:", error);
    return { courses: [] };
  }
}

/**
 * Fetch schedule for a specific course
 *
 * @param courseId - Course ID
 * @returns Object with course and schedule data
 */
export async function getCourseSchedule(courseId: string): Promise<{
  success: boolean;
  course?: Course & {
    semester: Semester | null;
    schedule: ScheduleData | null;
  };
  error?: string;
}> {
  try {
    // Validate authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch course with ownership check
    const course = await db.query.courses.findFirst({
      where: and(eq(courses.id, courseId), eq(courses.userId, user.id)),
      with: {
        semester: true,
      },
    });

    if (!course) {
      throw new Error("Course not found or unauthorized");
    }

    return {
      success: true,
      course: {
        ...course,
        schedule: course.schedule as ScheduleData | null,
      },
    };
  } catch (error) {
    console.error("Error fetching course schedule:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
