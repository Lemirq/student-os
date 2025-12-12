"use server";

import { db } from "@/drizzle";
import { courses, tasks, gradeWeights } from "@/schema";
import { eq } from "drizzle-orm";
import { Course, Task, GradeWeight } from "@/types";

export type CourseData = Course & {
  tasks: (Task & {
    grade_weight: GradeWeight | null;
    course: Course | null;
  })[];
  grade_weights: GradeWeight[];
};

export async function getCourseData(
  courseId: string,
): Promise<CourseData | null> {
  const courseResult = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId));

  if (courseResult.length === 0) {
    return null;
  }

  const course = courseResult[0];

  // Fetch tasks
  const tasksResult = await db
    .select()
    .from(tasks)
    .where(eq(tasks.courseId, courseId));

  // Fetch grade weights
  const gradeWeightsResult = await db
    .select()
    .from(gradeWeights)
    .where(eq(gradeWeights.courseId, courseId));

  // Map tasks to include grade weights
  // Note: This matches the shape of Supabase response roughly, but manual join in JS
  const tasksWithWeights = tasksResult.map((task) => {
    const gw =
      gradeWeightsResult.find((w) => w.id === task.gradeWeightId) || null;
    return {
      ...task,
      grade_weight: gw,
      course: course,
    };
  });

  return {
    ...course,
    tasks: tasksWithWeights,
    grade_weights: gradeWeightsResult,
  };
}
