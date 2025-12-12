"use server";

import { db } from "@/drizzle";
import { tasks, users } from "@/schema";
import { taskSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

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

export async function createTask(data: z.infer<typeof taskSchema>) {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Unauthorized");

  // Ensure user exists in users table
  await ensureUserExists(user.user.id, user.user.email || "");

  const validated = taskSchema.parse(data);

  await db.insert(tasks).values({
    userId: user.user.id,
    courseId: validated.course_id,
    gradeWeightId: validated.grade_weight_id,
    title: validated.title,
    status: validated.status,
    priority: validated.priority,
    doDate: validated.do_date ? new Date(validated.do_date) : null,
    dueDate: validated.due_date ? new Date(validated.due_date) : null,
    scoreReceived: validated.score_received
      ? String(validated.score_received)
      : null,
    scoreMax: validated.score_max ? String(validated.score_max) : null,
  });

  revalidatePath(`/courses/${validated.course_id}`);
}

export async function updateTask(
  id: string,
  data: Partial<z.infer<typeof taskSchema>>,
) {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.do_date !== undefined)
    updateData.doDate = data.do_date ? new Date(data.do_date) : null;
  if (data.due_date !== undefined)
    updateData.dueDate = data.due_date ? new Date(data.due_date) : null;
  if (data.score_received !== undefined)
    updateData.scoreReceived = data.score_received
      ? String(data.score_received)
      : null;
  if (data.score_max !== undefined)
    updateData.scoreMax = data.score_max ? String(data.score_max) : null;
  if (data.grade_weight_id !== undefined)
    updateData.gradeWeightId = data.grade_weight_id;

  await db.update(tasks).set(updateData).where(eq(tasks.id, id));

  revalidatePath("/dashboard");
  revalidatePath(`/courses/[id]`, "page");
}

export async function deleteTask(id: string) {
  await db.delete(tasks).where(eq(tasks.id, id));
  revalidatePath("/dashboard");
}
