"use server";

import { db } from "@/drizzle";
import { quizzes, quizAttempts } from "@/schema";
import { createClient } from "@/utils/supabase/server";
import { eq, and, desc } from "drizzle-orm";

export interface QuizWithAttempt {
  id: string;
  title: string;
  description: string | null;
  topic: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  questionCount: number;
  createdAt: Date | null;
  latestAttempt: {
    id: string;
    score: string;
    maxScore: string;
    completedAt: Date | null;
  } | null;
}

export async function getQuizzes(courseId: string): Promise<QuizWithAttempt[]> {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  if (!user.user) {
    throw new Error("Unauthorized");
  }

  try {
    const quizzesList = await db.query.quizzes.findMany({
      where: and(
        eq(quizzes.userId, user.user.id),
        eq(quizzes.courseId, courseId),
      ),
      orderBy: [desc(quizzes.createdAt)],
    });

    const quizIds = quizzesList.map((q) => q.id);

    let latestAttempts: Record<
      string,
      {
        id: string;
        score: string;
        maxScore: string;
        completedAt: Date | null;
      }
    > = {};

    if (quizIds.length > 0) {
      const { inArray } = await import("drizzle-orm");

      const attempts = await db
        .select()
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.userId, user.user.id),
            inArray(quizAttempts.quizId, quizIds),
          ),
        );

      attempts.forEach((attempt) => {
        const existingAttempt = latestAttempts[attempt.quizId];
        if (
          !existingAttempt ||
          (attempt.completedAt &&
            existingAttempt.completedAt &&
            attempt.completedAt > existingAttempt.completedAt)
        ) {
          latestAttempts[attempt.quizId] = {
            id: attempt.id,
            score: attempt.score,
            maxScore: attempt.maxScore || "100.00",
            completedAt: attempt.completedAt,
          };
        }
      });
    }

    return quizzesList.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      topic: quiz.topic,
      difficulty: quiz.difficulty as "beginner" | "intermediate" | "advanced",
      questionCount: quiz.questionCount,
      createdAt: quiz.createdAt,
      latestAttempt: latestAttempts[quiz.id]
        ? {
            id: latestAttempts[quiz.id].id,
            score: latestAttempts[quiz.id].score,
            maxScore: latestAttempts[quiz.id].maxScore,
            completedAt: latestAttempts[quiz.id].completedAt,
          }
        : null,
    }));
  } catch (error) {
    console.error("[getQuizzes] Error:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch quizzes");
  }
}

export interface QuizSummary {
  id: string;
  title: string;
  description: string | null;
  topic: string | null;
  difficulty: "beginner" | "intermediate" | "advanced";
  questionCount: number;
  createdAt: Date | null;
  lastAttemptScore: number | null;
  lastAttemptDate: Date | null;
  improvement: number | null;
  attemptCount: number;
}

export async function getCourseQuizzes(data: { courseId: string }) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Unauthorized");

    if (!data.courseId) {
      throw new Error("Course ID is required");
    }

    const quizzesList = await db.query.quizzes.findMany({
      where: and(
        eq(quizzes.courseId, data.courseId),
        eq(quizzes.userId, user.user.id),
      ),
      orderBy: [desc(quizzes.createdAt)],
    });

    const quizzesWithSummary: QuizSummary[] = await Promise.all(
      quizzesList.map(async (quiz) => {
        const attempts = await db.query.quizAttempts.findMany({
          where: and(
            eq(quizAttempts.quizId, quiz.id),
            eq(quizAttempts.userId, user.user.id),
          ),
          orderBy: [desc(quizAttempts.completedAt)],
          limit: 2,
        });

        const lastAttempt = attempts[0];
        const secondLastAttempt = attempts[1];

        let improvement: number | null = null;
        if (lastAttempt && secondLastAttempt) {
          const currentScore = parseFloat(lastAttempt.score);
          const previousScore = parseFloat(secondLastAttempt.score);
          improvement = currentScore - previousScore;
        }

        return {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          topic: quiz.topic,
          difficulty: quiz.difficulty as
            | "beginner"
            | "intermediate"
            | "advanced",
          questionCount: quiz.questionCount,
          createdAt: quiz.createdAt,
          lastAttemptScore: lastAttempt ? parseFloat(lastAttempt.score) : null,
          lastAttemptDate: lastAttempt?.completedAt || null,
          improvement,
          attemptCount: attempts.length,
        };
      }),
    );

    return {
      success: true,
      quizzes: quizzesWithSummary,
    };
  } catch (error) {
    console.error("Failed to fetch quizzes:", error);

    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
        quizzes: [],
      };
    }

    return {
      success: false,
      message: "An unexpected error occurred while fetching quizzes",
      quizzes: [],
    };
  }
}
