"use server";

import { db } from "@/drizzle";
import { semesters, courses, gradeWeights, users } from "@/schema";
import { semesterSchema, courseSchema, gradeWeightSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { eq } from "drizzle-orm";
import { Course, Semester } from "@/types";

async function ensureUserExists(userId: string, email: string) {
  // Check if user exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existingUser.length === 0) {
    // Insert user if doesn't exist
    await db.insert(users).values({
      id: userId,
      email,
    });
  }
}

export async function createSemester(data: z.infer<typeof semesterSchema>) {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Unauthorized");

  // Ensure user exists in users table
  await ensureUserExists(user.user.id, user.user.email || "");

  const validated = semesterSchema.parse(data);

  const [insertedSemester]: Semester[] = await db.insert(semesters).values({
    name: validated.name,
    yearLevel: validated.year_level,
    startDate: validated.start_date,
    endDate: validated.end_date,
    isCurrent: validated.is_current,
    userId: user.user.id,
  });

  revalidatePath("/");
  redirect(`/semesters/${insertedSemester.id}`);
}

export async function createCourse(data: z.infer<typeof courseSchema>) {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Unauthorized");

  // Ensure user exists in users table
  await ensureUserExists(user.user.id, user.user.email || "");

  const validated = courseSchema.parse(data);

  const [insertedCourse]: Course[] = await db.insert(courses).values({
    semesterId: validated.semester_id,
    userId: user.user.id,
    code: validated.code,
    name: validated.name,
    color: validated.color,
    goalGrade: validated.goal_grade ? String(validated.goal_grade) : null,
  });

  revalidatePath("/");
  redirect(`/courses/${insertedCourse.id}`);
}

export async function createGradeWeight(
  data: z.infer<typeof gradeWeightSchema>,
) {
  const validated = gradeWeightSchema.parse(data);

  await db.insert(gradeWeights).values({
    courseId: validated.course_id,
    name: validated.name,
    weightPercent: String(validated.weight_percent),
  });

  revalidatePath(`/courses/${validated.course_id}`);
}

export async function getCourseGradeWeights(courseId: string) {
  return await db
    .select()
    .from(gradeWeights)
    .where(eq(gradeWeights.courseId, courseId));
}

export async function updateGradeWeight(
  gradeWeightId: string,
  data: { name?: string; weight_percent?: number },
) {
  const updates: { name?: string; weightPercent?: string } = {};

  if (data.name !== undefined) {
    updates.name = data.name;
  }

  if (data.weight_percent !== undefined) {
    updates.weightPercent = String(data.weight_percent);
  }

  const result = await db
    .update(gradeWeights)
    .set(updates)
    .where(eq(gradeWeights.id, gradeWeightId))
    .returning();

  if (result.length > 0) {
    revalidatePath(`/courses/${result[0].courseId}`);
  }

  return result[0];
}

export async function deleteGradeWeight(gradeWeightId: string) {
  const gradeWeight = await db
    .select()
    .from(gradeWeights)
    .where(eq(gradeWeights.id, gradeWeightId))
    .limit(1);

  if (gradeWeight.length === 0) {
    throw new Error("Grade weight not found");
  }

  await db.delete(gradeWeights).where(eq(gradeWeights.id, gradeWeightId));

  revalidatePath(`/courses/${gradeWeight[0].courseId}`);
}

export async function getUserCourses() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  return await db
    .select()
    .from(courses)
    .where(eq(courses.userId, user.user.id));
}

export async function getGradeWeightsForCourses(courseIds: string[]) {
  if (courseIds.length === 0) return [];

  const { inArray } = await import("drizzle-orm");

  return await db
    .select()
    .from(gradeWeights)
    .where(inArray(gradeWeights.courseId, courseIds));
}

export async function updateCourse(
  courseId: string,
  data: {
    code?: string;
    name?: string;
    color?: string;
    goal_grade?: number;
    syllabus?: string;
  },
) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Unauthorized");

  const updates: {
    code?: string;
    name?: string;
    color?: string;
    goalGrade?: string;
    syllabus?: string;
  } = {};

  if (data.code !== undefined) updates.code = data.code;
  if (data.name !== undefined) updates.name = data.name;
  if (data.color !== undefined) updates.color = data.color;
  if (data.goal_grade !== undefined)
    updates.goalGrade = String(data.goal_grade);
  if (data.syllabus !== undefined) updates.syllabus = data.syllabus;

  const result = await db
    .update(courses)
    .set(updates)
    .where(eq(courses.id, courseId))
    .returning();

  revalidatePath(`/courses/${courseId}`);
  return result[0];
}
