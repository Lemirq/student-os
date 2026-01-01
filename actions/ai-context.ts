"use server";

import { db } from "@/drizzle";
import { courses, gradeWeights } from "@/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";

export async function getAIContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const userCourses = await db
    .select({
      id: courses.id,
      userId: courses.userId,
      semesterId: courses.semesterId,
      code: courses.code,
      name: courses.name,
      color: courses.color,
      goalGrade: courses.goalGrade,
      createdAt: courses.createdAt,
      syllabus: sql<string | null>`NULL`.as("syllabus"), // Exclude syllabus data
    })
    .from(courses)
    .where(eq(courses.userId, user.id));

  const courseIds = userCourses.map((c) => c.id);
  const userGradeWeights =
    courseIds.length > 0
      ? await db
          .select()
          .from(gradeWeights)
          .where(inArray(gradeWeights.courseId, courseIds))
      : [];

  return {
    courses: userCourses,
    gradeWeights: userGradeWeights,
  };
}
