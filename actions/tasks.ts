"use server";

import { db } from "@/drizzle";
import { tasks, users } from "@/schema";
import { taskSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";

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
  const supabase = await createClient();

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
    scoreReceived:
      validated.score_received !== null &&
      validated.score_received !== undefined
        ? String(validated.score_received)
        : null,
    scoreMax:
      validated.score_max !== null && validated.score_max !== undefined
        ? String(validated.score_max)
        : null,
  });

  revalidatePath(`/courses/${validated.course_id}`);
}

export async function updateTask(
  id: string,
  data: Partial<z.infer<typeof taskSchema>>,
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch task to get courseId for revalidation and verify ownership
    const existingTask = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, id), eq(tasks.userId, user.id)),
    });

    if (!existingTask) throw new Error("Task not found or unauthorized");

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.do_date !== undefined)
      updateData.doDate = data.do_date ? new Date(data.do_date) : null;
    if (data.due_date !== undefined)
      updateData.dueDate = data.due_date ? new Date(data.due_date) : null;
    if (data.score_received !== undefined)
      updateData.scoreReceived =
        data.score_received !== null ? String(data.score_received) : null;
    if (data.score_max !== undefined)
      updateData.scoreMax =
        data.score_max !== null ? String(data.score_max) : null;
    if (data.grade_weight_id !== undefined)
      updateData.gradeWeightId = data.grade_weight_id;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.course_id !== undefined) {
      updateData.courseId = data.course_id;
      // Reset grade weight if course changes and new weight not provided
      if (data.grade_weight_id === undefined) {
        updateData.gradeWeightId = null;
      }
    }

    await db.update(tasks).set(updateData).where(eq(tasks.id, id));

    revalidatePath("/dashboard");
    if (existingTask.courseId) {
      revalidatePath(`/courses/${existingTask.courseId}`);
    }
    // If course changed, revalidate new course too
    if (data.course_id && data.course_id !== existingTask.courseId) {
      revalidatePath(`/courses/${data.course_id}`);
    }
    // Revalidate the task detail page itself
    revalidatePath(`/tasks/${id}`);
  } catch (error) {
    console.error("Failed to update task:", error);
    throw error;
  }
}

export async function deleteTask(id: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch task to check ownership and get courseId
    const existingTask = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, id), eq(tasks.userId, user.id)),
    });

    if (!existingTask) throw new Error("Task not found or unauthorized");

    await db.delete(tasks).where(eq(tasks.id, id));

    revalidatePath("/dashboard");
    if (existingTask.courseId) {
      revalidatePath(`/courses/${existingTask.courseId}`);
    }
  } catch (error) {
    console.error("Failed to delete task:", error);
    throw error;
  }
}

export async function getTask(id: string) {
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, id),
    with: {
      course: {
        with: {
          gradeWeights: true,
        },
      },
      gradeWeight: true,
    },
  });

  return task;
}
