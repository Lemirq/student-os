"use server";

import { db } from "@/drizzle";
import { semesters, courses } from "@/schema";
import { eq } from "drizzle-orm";
import { Semester, Course } from "@/types";

export type SemesterData = Semester & {
  courses: Course[];
};

export async function getSemesterData(
  semesterId: string,
): Promise<SemesterData | null> {
  const semesterResult = await db
    .select()
    .from(semesters)
    .where(eq(semesters.id, semesterId));

  if (semesterResult.length === 0) {
    return null;
  }

  const semester = semesterResult[0];

  const coursesResult = await db
    .select()
    .from(courses)
    .where(eq(courses.semesterId, semesterId));

  // Sort courses by code
  coursesResult.sort((a, b) => a.code.localeCompare(b.code));

  return {
    ...semester,
    courses: coursesResult,
  };
}
