"use server";

import { db } from "@/drizzle";
import { quizzes, quizAttempts, users } from "@/schema";
import { createClient } from "@/utils/supabase/server";
import { eq, and } from "drizzle-orm";
import { gradeShortAnswer } from "@/lib/answer-grader";
import { revalidatePath } from "next/cache";

type QuizQuestionShape = {
  id: string;
  type:
    | "multiple-choice"
    | "multiple_choice"
    | "true-false"
    | "true_false"
    | "short-answer"
    | "short_answer"
    | "fill-blank"
    | "fill_in_the_blank";
  options?: unknown;
  correctAnswer?: unknown;
  explanation?: string;
};

async function ensureUserExists(userId: string, email: string) {
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existingUser.length === 0) {
    await db.insert(users).values({
      id: userId,
      email,
    });
  }
}

export async function submitQuizAttempt(params: {
  quizId: string;
  answers: Array<{ questionId: string; userAnswer: string }>;
}) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  if (!user.user) {
    throw new Error("Unauthorized");
  }

  await ensureUserExists(user.user.id, user.user.email || "");

  const quiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, params.quizId), eq(quizzes.userId, user.user.id)),
  });

  if (!quiz) {
    throw new Error("Quiz not found or unauthorized");
  }

  const questions: QuizQuestionShape[] = (quiz.questions ||
    []) as QuizQuestionShape[];

  const gradedAnswers = params.answers.map((answer) => {
    const question = questions.find((q) => q.id === answer.questionId);

    if (!question) {
      throw new Error(`Question ${answer.questionId} not found`);
    }

    let isCorrect = false;
    let similarityScore: number | undefined;

    // Handle multiple choice questions
    if (
      question.type === "multiple-choice" ||
      question.type === "multiple_choice"
    ) {
      const rawOptions = question.options;
      const options = Array.isArray(rawOptions) ? (rawOptions as string[]) : [];

      // Try to resolve the selected option index
      let selectedIndex = options.findIndex((opt) => opt === answer.userAnswer);

      // Fallback: if userAnswer starts with a letter option like "C) Foo"
      if (selectedIndex === -1) {
        const trimmed = answer.userAnswer.trim();
        const firstChar = trimmed.charAt(0).toUpperCase();
        if (firstChar >= "A" && firstChar <= "D") {
          selectedIndex = firstChar.charCodeAt(0) - "A".charCodeAt(0);
        }
      }

      // Resolve correct option index
      const correctRaw = String(question.correctAnswer ?? "").trim();
      let correctIndex = -1;

      if (correctRaw.length === 1 && correctRaw >= "A" && correctRaw <= "D") {
        correctIndex = correctRaw.charCodeAt(0) - "A".charCodeAt(0);
      } else {
        correctIndex = options.findIndex((opt) => opt === correctRaw);
      }

      if (selectedIndex >= 0 && correctIndex >= 0) {
        isCorrect = selectedIndex === correctIndex;
      } else {
        // Final fallback: direct text comparison
        isCorrect =
          answer.userAnswer.trim() ===
          String(question.correctAnswer ?? "").trim();
      }
    }
    // Handle true/false questions
    else if (question.type === "true-false" || question.type === "true_false") {
      const normalizedUserAnswer = answer.userAnswer.trim().toLowerCase();
      const normalizedCorrectAnswer = String(question.correctAnswer ?? "")
        .trim()
        .toLowerCase();
      isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
    }
    // Handle short answer and fill in the blank questions
    else if (
      question.type === "short-answer" ||
      question.type === "short_answer" ||
      question.type === "fill-blank" ||
      question.type === "fill_in_the_blank"
    ) {
      const gradingResult = gradeShortAnswer(
        answer.userAnswer,
        String(question.correctAnswer ?? ""),
      );
      isCorrect = gradingResult.isCorrect;
      similarityScore = gradingResult.similarityScore;
    }

    return {
      questionId: answer.questionId,
      userAnswer: answer.userAnswer,
      isCorrect,
      similarityScore,
    };
  });

  const correctAnswers = gradedAnswers.filter((a) => a.isCorrect).length;
  const totalScore = (correctAnswers / (questions.length || 1)) * 100;

  const [attempt] = await db
    .insert(quizAttempts)
    .values({
      userId: user.user.id,
      quizId: params.quizId,
      answers: gradedAnswers,
      score: String(totalScore),
      completedAt: new Date(),
    })
    .returning();

  await db.$cache.invalidate({ tables: [quizAttempts] });

  revalidatePath("/");

  const answersWithDetails = gradedAnswers.map((answer) => {
    const question = questions?.find((q) => q.id === answer.questionId);

    let correctAnswerDisplay: string | undefined;
    if (question) {
      const rawOptions = question.options;
      const options = Array.isArray(rawOptions) ? (rawOptions as string[]) : [];
      const rawCorrect = String(question.correctAnswer ?? "").trim();

      // For multiple choice, prefer showing the full option text
      if (
        question.type === "multiple-choice" ||
        question.type === "multiple_choice"
      ) {
        if (rawCorrect.length === 1 && rawCorrect >= "A" && rawCorrect <= "D") {
          const idx = rawCorrect.charCodeAt(0) - "A".charCodeAt(0);
          correctAnswerDisplay = options[idx] ?? rawCorrect;
        } else {
          correctAnswerDisplay =
            options.find((opt) => opt === rawCorrect) ?? rawCorrect;
        }
      } else {
        // For non-MC, keep the raw correct answer text (may include multiple variants)
        correctAnswerDisplay = rawCorrect;
      }
    }

    return {
      questionId: answer.questionId,
      userAnswer: answer.userAnswer,
      isCorrect: answer.isCorrect,
      similarityScore: answer.similarityScore,
      correctAnswer: correctAnswerDisplay,
      explanation: question?.explanation,
    };
  });

  return {
    attempt,
    answers: answersWithDetails,
    score: totalScore,
  };
}
