"use server";

import { db } from "@/drizzle";
import { semesters } from "@/schema"; // Removed unused imports
import { desc } from "drizzle-orm";
import { Semester, Course } from "@/types";
import { courses } from "@/schema";

export type SidebarData = {
  semesters: (Semester & { courses: Course[] })[];
};

export async function getSidebarData(): Promise<SidebarData> {
  const allSemesters = await db
    .select()
    .from(semesters)
    .orderBy(desc(semesters.startDate));

  const allCourses = await db.select().from(courses);

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
