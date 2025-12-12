"use server";

import { db } from "@/drizzle";
import { tasks, courses, semesters } from "@/schema";
import { eq, and, ilike } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import * as chrono from "chrono-node";

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
  const tasksToInsert = validatedData.tasks.map((task) => {
    // Use chrono-node to parse date strings more robustly
    const parsedDate = chrono.parseDate(task.due_date);

    // Fallback to native Date if chrono fails (or if date string is standard ISO)
    const dueDate = parsedDate || new Date(task.due_date);

    // Check if date is valid
    if (isNaN(dueDate.getTime())) {
      console.warn(
        `Invalid date found for task "${task.title}": ${task.due_date}. Defaulting to null.`,
      );
      // Depending on requirements, we could default to null or skip the task, or set to today
      // For now let's set to null or handle appropriately in DB schema if nullable
      // The schema says timestamp with timezone, let's try to be safe.
      // If it's invalid, let's just use null if allowed, otherwise maybe today?
      // Looking at schema, due_date is nullable timestamp.
      return {
        userId: userId,
        courseId: course.id,
        title: task.title,
        dueDate: null, // Set to null if invalid
        status: "Todo",
        priority: "Medium",
      };
    }

    return {
      userId: userId,
      courseId: course.id,
      title: task.title,
      dueDate: dueDate,
      status: "Todo",
      priority: "Medium",
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.insert(tasks).values(tasksToInsert as any);

  return {
    success: true,
    count: validatedData.tasks.length,
    courseCreated: !existingCourses[0], // true if course was newly created
    courseCode: validatedData.course,
  };
}
