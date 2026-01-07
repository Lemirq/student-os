"use server";

import { db } from "@/drizzle";
import { quizzes, quizAttempts } from "@/schema";
import { createClient } from "@/utils/supabase/server";
import { eq, desc, and } from "drizzle-orm";

export async function getQuizAttempts(quizId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const quiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), eq(quizzes.userId, user.id)),
  });

  if (!quiz) {
    throw new Error("Quiz not found or unauthorized");
  }

  const attempts = await db.query.quizAttempts.findMany({
    where: and(
      eq(quizAttempts.quizId, quizId),
      eq(quizAttempts.userId, user.id),
    ),
    orderBy: [desc(quizAttempts.completedAt)],
  });

  const attemptsWithImprovement = attempts.map((attempt, index) => {
    let improvement: number | null = null;

    if (index < attempts.length - 1) {
      const previousAttempt = attempts[index + 1];
      const currentScore = parseFloat(attempt.score);
      const previousScore = parseFloat(previousAttempt.score);
      improvement = currentScore - previousScore;
    }

    return {
      ...attempt,
      improvement,
    };
  });

  return attemptsWithImprovement;
}
