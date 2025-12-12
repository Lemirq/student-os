"use server";

import { db } from "@/drizzle";
import { tasks, courses } from "@/schema";
import { eq, and, ilike } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { z } from "zod";

export const importSyllabusSchema = z.object({
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
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Unauthorized");

  const userId = user.user.id;

  // Find course by code for this user
  // We use ilike for case-insensitive match
  const existingCourses = await db
    .select()
    .from(courses)
    .where(and(eq(courses.userId, userId), ilike(courses.code, data.course)))
    .limit(1);

  if (existingCourses.length === 0) {
    throw new Error(`Course ${data.course} not found. Please create it first.`);
  }

  const course = existingCourses[0];

  // Insert tasks
  await db.insert(tasks).values(
    data.tasks.map((task) => ({
      userId: userId,
      courseId: course.id,
      title: task.title,
      dueDate: new Date(task.due_date),
      status: "Todo",
      priority: "Medium",
    })),
  );

  return { success: true, count: data.tasks.length };
}
