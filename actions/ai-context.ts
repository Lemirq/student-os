"use server";

import { db } from "@/drizzle";
import { courses, gradeWeights, semesters } from "@/schema";
import { eq, inArray, sql, and } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";

export async function getAIContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const [currentSemester] = await db
    .select({ id: semesters.id })
    .from(semesters)
    .where(and(eq(semesters.userId, user.id), eq(semesters.isCurrent, true)))
    .limit(1);

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
    .where(
      and(
        eq(courses.userId, user.id),
        currentSemester ? eq(courses.semesterId, currentSemester.id) : sql`1=0`,
      ),
    );

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
