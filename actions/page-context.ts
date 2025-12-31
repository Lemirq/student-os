"use server";

import { db } from "@/drizzle";
import { courses, semesters, tasks } from "@/schema";
import { eq } from "drizzle-orm";

export type PageContext =
  | { type: "dashboard" }
  | { type: "course"; id: string; code: string; name: string }
  | { type: "semester"; id: string; name: string }
  | {
      type: "task";
      id: string;
      title: string;
      courseCode?: string;
      courseName?: string;
    }
  | { type: "unknown" };

/**
 * Fetches minimal context data for a given route.
 * Used to provide the AI with awareness of what page the user is viewing.
 */
export async function getPageContext(
  pathname: string,
  params: Record<string, string>,
): Promise<PageContext> {
  // Dashboard page
  if (pathname === "/dashboard") {
    return { type: "dashboard" };
  }

  // Course page: /courses/[id]
  if (pathname.startsWith("/courses/") && params.id) {
    const courseResult = await db
      .select({ id: courses.id, code: courses.code, name: courses.name })
      .from(courses)
      .where(eq(courses.id, params.id))
      .limit(1);

    if (courseResult.length > 0) {
      const course = courseResult[0];
      return {
        type: "course",
        id: course.id,
        code: course.code,
        name: course.name ?? "",
      };
    }
  }

  // Semester page: /semesters/[id]
  if (pathname.startsWith("/semesters/") && params.id) {
    const semesterResult = await db
      .select({ id: semesters.id, name: semesters.name })
      .from(semesters)
      .where(eq(semesters.id, params.id))
      .limit(1);

    if (semesterResult.length > 0) {
      const semester = semesterResult[0];
      return {
        type: "semester",
        id: semester.id,
        name: semester.name,
      };
    }
  }

  // Task page: /tasks/[id]
  if (pathname.startsWith("/tasks/") && params.id) {
    const taskResult = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        courseId: tasks.courseId,
      })
      .from(tasks)
      .where(eq(tasks.id, params.id))
      .limit(1);

    if (taskResult.length > 0) {
      const task = taskResult[0];

      // Optionally fetch course info if task has a course
      let courseCode: string | undefined;
      let courseName: string | undefined;

      if (task.courseId) {
        const courseResult = await db
          .select({ code: courses.code, name: courses.name })
          .from(courses)
          .where(eq(courses.id, task.courseId))
          .limit(1);

        if (courseResult.length > 0) {
          courseCode = courseResult[0].code;
          courseName = courseResult[0].name ?? undefined;
        }
      }

      return {
        type: "task",
        id: task.id,
        title: task.title,
        courseCode,
        courseName,
      };
    }
  }

  return { type: "unknown" };
}
