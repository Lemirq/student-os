"use server";

import { db } from "@/drizzle";
import { semesters, courses, gradeWeights, users } from "@/schema";
import { semesterSchema, courseSchema, gradeWeightSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { eq, and } from "drizzle-orm";
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

  const [insertedSemester]: Semester[] = await db
    .insert(semesters)
    .values({
      name: validated.name,
      yearLevel: validated.yearLevel,
      startDate: validated.startDate,
      endDate: validated.endDate,
      isCurrent: validated.isCurrent,
      userId: user.user.id,
    })
    .returning();

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
  if (!validated.semesterId) {
    throw new Error("Semester ID is required");
  }

  const semester = await db.query.semesters.findFirst({
    where: and(
      eq(semesters.id, validated.semesterId),
      eq(semesters.userId, user.user.id),
    ),
  });

  if (!semester) {
    throw new Error("Semester not found or unauthorized");
  }

  const [insertedCourse]: Course[] = await db
    .insert(courses)
    .values({
      semesterId: validated.semesterId,
      userId: user.user.id,
      code: validated.code,
      name: validated.name,
      color: validated.color,
      goalGrade: validated.goalGrade ? String(validated.goalGrade) : null,
    })
    .returning();

  revalidatePath("/");
  redirect(`/courses/${insertedCourse.id}`);
}

export async function createGradeWeight(
  data: z.infer<typeof gradeWeightSchema>,
) {
  const validated = gradeWeightSchema.parse(data);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (!validated.courseId) {
    throw new Error("Course ID is required");
  }

  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, validated.courseId), eq(courses.userId, user.id)),
  });

  if (!course) {
    throw new Error("Course not found or unauthorized");
  }

  await db.insert(gradeWeights).values({
    courseId: validated.courseId,
    name: validated.name,
    weightPercent: String(validated.weightPercent),
  });

  revalidatePath(`/courses/${validated.courseId}`);
}

export async function getCourseGradeWeights(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Verify course ownership
  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.userId, user.id)),
  });

  if (!course) {
    return [];
  }

  return await db
    .select()
    .from(gradeWeights)
    .where(eq(gradeWeights.courseId, courseId));
}

export async function updateGradeWeight(
  gradeWeightId: string,
  data: { name?: string; weightPercent?: number },
) {
  const updates: { name?: string; weightPercent?: string } = {};

  if (data.name !== undefined) {
    updates.name = data.name;
  }

  if (data.weightPercent !== undefined) {
    updates.weightPercent = String(data.weightPercent);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Verify ownership via course
  const existingWeight = await db.query.gradeWeights.findFirst({
    where: eq(gradeWeights.id, gradeWeightId),
    with: {
      course: true,
    },
  });

  if (
    !existingWeight ||
    !existingWeight.course ||
    existingWeight.course.userId !== user.id
  ) {
    throw new Error("Grade weight not found or unauthorized");
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const gradeWeight = await db.query.gradeWeights.findFirst({
    where: eq(gradeWeights.id, gradeWeightId),
    with: {
      course: true,
    },
  });

  if (!gradeWeight) {
    throw new Error("Grade weight not found");
  }

  if (!gradeWeight.course || gradeWeight.course.userId !== user.id) {
    throw new Error("Unauthorized");
  }

  await db.delete(gradeWeights).where(eq(gradeWeights.id, gradeWeightId));

  revalidatePath(`/courses/${gradeWeight.courseId}`);
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
    .where(and(eq(courses.id, courseId), eq(courses.userId, user.user.id)))
    .returning();

  revalidatePath(`/courses/${courseId}`);
  return result[0];
}

export async function deleteCourse(courseId: string) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Unauthorized");

  const course = await db.query.courses.findFirst({
    where: and(eq(courses.id, courseId), eq(courses.userId, user.user.id)),
    with: {
      semester: true,
    },
  });

  if (!course) {
    throw new Error("Course not found or unauthorized");
  }

  await db.delete(courses).where(eq(courses.id, courseId));

  revalidatePath("/");
  if (course.semester) {
    redirect(`/semesters/${course.semester.id}`);
  } else {
    redirect("/dashboard");
  }
}
