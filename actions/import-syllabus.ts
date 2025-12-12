"use server";

import { db } from "@/drizzle";
import { tasks, courses, semesters } from "@/schema";
import { eq, and, ilike } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

const importSyllabusSchema = z.object({
  course: z.string(),
  tasks: z.array(
    z.object({
      title: z.string(),
      weight: z.number().optional(),
      due_date: z.string(),
      type: z.string(),
    }),
  ),
});

export async function importSyllabusTasks(
  data: z.infer<typeof importSyllabusSchema>,
) {
  // Validate the input data
  const validatedData = importSyllabusSchema.parse(data);

  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Unauthorized");

  const userId = user.user.id;

  // Find course by code for this user
  // We use ilike for case-insensitive match
  const existingCourses = await db
    .select()
    .from(courses)
    .where(
      and(
        eq(courses.userId, userId),
        ilike(courses.code, validatedData.course),
      ),
    )
    .limit(1);

  let course = existingCourses[0];

  // If course doesn't exist, create it in the current semester
  if (!course) {
    // Find the current semester for this user
    const currentSemester = await db
      .select()
      .from(semesters)
      .where(and(eq(semesters.userId, userId), eq(semesters.isCurrent, true)))
      .limit(1);

    if (currentSemester.length === 0) {
      throw new Error(
        `No current semester found. Please create a semester first before importing syllabi.`,
      );
    }

    // Create the course
    const newCourse = await db
      .insert(courses)
      .values({
        userId: userId,
        semesterId: currentSemester[0].id,
        code: validatedData.course,
        name: validatedData.course, // Use code as name initially
        color: "#3b82f6", // Default blue color
      })
      .returning();

    course = newCourse[0];
  }

  // Insert tasks
  await db.insert(tasks).values(
    validatedData.tasks.map((task) => ({
      userId: userId,
      courseId: course.id,
      title: task.title,
      dueDate: new Date(task.due_date),
      status: "Todo",
      priority: "Medium",
    })),
  );

  return {
    success: true,
    count: validatedData.tasks.length,
    courseCreated: !existingCourses[0], // true if course was newly created
    courseCode: validatedData.course,
  };
}
