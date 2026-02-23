"use server";

import { db } from "@/drizzle";
import { quizzes } from "@/schema";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { eq, and } from "drizzle-orm";

export async function deleteQuiz(data: { quizId: string }) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Unauthorized");

    if (!data.quizId) {
      throw new Error("Quiz ID is required");
    }

    const quiz = await db.query.quizzes.findFirst({
      where: and(eq(quizzes.id, data.quizId), eq(quizzes.userId, user.user.id)),
    });

    if (!quiz) {
      throw new Error("Quiz not found");
    }

    await db
      .delete(quizzes)
      .where(
        and(eq(quizzes.id, data.quizId), eq(quizzes.userId, user.user.id)),
      );

    await db.$cache.invalidate({ tables: [quizzes] });

    if (quiz.courseId) {
      revalidatePath(`/courses/${quiz.courseId}`);
    }

    return {
      success: true,
      message: `Deleted quiz "${quiz.title}"`,
    };
  } catch (error) {
    console.error("Failed to delete quiz:", error);

    if (error instanceof Error) {
      return { success: false, message: error.message };
    }

    return {
      success: false,
      message: "An unexpected error occurred while deleting the quiz",
    };
  }
}
