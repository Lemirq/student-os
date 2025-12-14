"use server";

import { db } from "@/drizzle";
import { semesters, courses, tasks, gradeWeights } from "@/schema";
import { eq, inArray } from "drizzle-orm";
import { Semester, Course, Task, GradeWeight } from "@/types";
import { revalidatePath } from "next/cache";

export type SemesterData = Semester & {
  courses: Course[];
  tasks: (Task & {
    course: Course | null;
    grade_weight: GradeWeight | null;
  })[];
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

  let tasksWithDetails: (Task & {
    course: Course | null;
    grade_weight: GradeWeight | null;
  })[] = [];

  if (coursesResult.length > 0) {
    const courseIds = coursesResult.map((c) => c.id);
    const tasksResult = await db
      .select()
      .from(tasks)
      .where(inArray(tasks.courseId, courseIds));

    const gradeWeightsResult = await db
      .select()
      .from(gradeWeights)
      .where(inArray(gradeWeights.courseId, courseIds));

    tasksWithDetails = tasksResult.map((task) => {
      const course = coursesResult.find((c) => c.id === task.courseId) || null;
      const gw =
        gradeWeightsResult.find((g) => g.id === task.gradeWeightId) || null;
      return {
        ...task,
        course,
        grade_weight: gw,
      };
    });
  }

  return {
    ...semester,
    courses: coursesResult,
    tasks: tasksWithDetails,
  };
}

export async function updateSemester(
  semesterId: string,
  data: {
    name?: string;
    start_date?: string;
    end_date?: string;
  },
): Promise<void> {
  const updateData: Record<string, string> = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  if (data.start_date !== undefined) {
    updateData.startDate = data.start_date;
  }
  if (data.end_date !== undefined) {
    updateData.endDate = data.end_date;
  }

  await db
    .update(semesters)
    .set(updateData)
    .where(eq(semesters.id, semesterId));

  revalidatePath(`/semesters/${semesterId}`);
}
