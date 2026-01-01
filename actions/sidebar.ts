"use server";

import { db } from "@/drizzle";
import { semesters, courses } from "@/schema";
import { desc, eq, sql } from "drizzle-orm";
import { Semester, Course } from "@/types";
import { createClient } from "@/utils/supabase/server";

export type SidebarData = {
  semesters: (Semester & { courses: Course[] })[];
};

export async function getSidebarData(): Promise<SidebarData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { semesters: [] };
  }

  const allSemesters = await db
    .select()
    .from(semesters)
    .where(eq(semesters.userId, user.id))
    .orderBy(desc(semesters.startDate));

  const allCourses = await db
    .select({
      id: courses.id,
      userId: courses.userId,
      semesterId: courses.semesterId,
      code: courses.code,
      name: courses.name,
      color: courses.color,
      goalGrade: courses.goalGrade,
      createdAt: courses.createdAt,
      notes: courses.notes,
      syllabus: sql<string | null>`NULL`.as("syllabus"), // Exclude syllabus data
      schedule: sql<null>`NULL`.as("schedule"), // Exclude schedule data
    })
    .from(courses)
    .where(eq(courses.userId, user.id));

  const semestersWithCourses = allSemesters.map((semester) => {
    const semesterCourses = allCourses
      .filter((course) => course.semesterId === semester.id)
      .sort((a, b) => a.code.localeCompare(b.code));

    return {
      ...semester,
      courses: semesterCourses,
    };
  });

  return { semesters: semestersWithCourses };
}
