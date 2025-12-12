"use server";

import { db } from "@/drizzle";
import { semesters, courses, gradeWeights, users } from "@/schema";
import { semesterSchema, courseSchema, gradeWeightSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

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
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Unauthorized");

  // Ensure user exists in users table
  await ensureUserExists(user.user.id, user.user.email || "");

  const validated = semesterSchema.parse(data);

  await db.insert(semesters).values({
    name: validated.name,
    yearLevel: validated.year_level,
    startDate: validated.start_date,
    endDate: validated.end_date,
    isCurrent: validated.is_current,
    userId: user.user.id,
  });

  revalidatePath("/");
  redirect("/dashboard");
}

export async function createCourse(data: z.infer<typeof courseSchema>) {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Unauthorized");

  // Ensure user exists in users table
  await ensureUserExists(user.user.id, user.user.email || "");

  const validated = courseSchema.parse(data);

  await db.insert(courses).values({
    semesterId: validated.semester_id,
    userId: user.user.id,
    code: validated.code,
    name: validated.name,
    color: validated.color,
    goalGrade: validated.goal_grade ? String(validated.goal_grade) : null,
  });

  revalidatePath("/");
  redirect("/dashboard");
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
