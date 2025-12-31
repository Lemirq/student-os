"use server";

import { db } from "@/drizzle";
import { tasks, users } from "@/schema";
import { taskSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { Task } from "@/types";
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
    courseId: validated.courseId,
    gradeWeightId: validated.gradeWeightId,
    title: validated.title,
    status: validated.status,
    priority: validated.priority,
    doDate: validated.doDate ? new Date(validated.doDate) : null,
    dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
    scoreReceived:
      validated.scoreReceived !== null && validated.scoreReceived !== undefined
        ? String(validated.scoreReceived)
        : null,
    scoreMax:
      validated.scoreMax !== null && validated.scoreMax !== undefined
        ? String(validated.scoreMax)
        : null,
  });

  revalidatePath(`/courses/${validated.courseId}`);
}

export async function updateTask(id: string, data: Partial<Task>) {
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
    if (data.doDate !== undefined)
      updateData.doDate = data.doDate ? new Date(data.doDate) : null;
    if (data.dueDate !== undefined)
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.scoreReceived !== undefined)
      updateData.scoreReceived =
        data.scoreReceived !== null ? String(data.scoreReceived) : null;
    if (data.scoreMax !== undefined)
      updateData.scoreMax =
        data.scoreMax !== null ? String(data.scoreMax) : null;
    if (data.gradeWeightId !== undefined)
      updateData.gradeWeightId = data.gradeWeightId;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.courseId !== undefined) {
      updateData.courseId = data.courseId;
      // Reset grade weight if course changes and new weight not provided
      if (data.gradeWeightId === undefined) {
        updateData.gradeWeightId = null;
      }
    }

    // Handle completedAt timestamp based on status changes
    if (data.status !== undefined) {
      if (data.status === "Done" && existingTask.status !== "Done") {
        // Task is being marked as done - set completedAt
        updateData.completedAt = new Date();
      } else if (data.status !== "Done" && existingTask.status === "Done") {
        // Task is being unmarked as done - clear completedAt
        updateData.completedAt = null;
      }
    }

    await db.update(tasks).set(updateData).where(eq(tasks.id, id));

    revalidatePath("/dashboard");
    if (existingTask.courseId) {
      revalidatePath(`/courses/${existingTask.courseId}`);
    }
    // If course changed, revalidate new course too
    if (data.courseId && data.courseId !== existingTask.courseId) {
      revalidatePath(`/courses/${data.courseId}`);
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const task = await db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), eq(tasks.userId, user.id)),
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
