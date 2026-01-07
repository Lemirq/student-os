"use server";

import { db } from "@/drizzle";
import { quizzes, courses, documents } from "@/schema";
import { createClient } from "@/utils/supabase/server";
import { generateText, Output, LanguageModel } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { searchDocumentsWithRRF } from "../documents/search-documents-rrf";
import { openRouterApiKey } from "@/lib/env";
import { revalidatePath } from "next/cache";

const openRouterClient = createOpenRouter({
  apiKey: openRouterApiKey,
});

const glm = openRouterClient.chat("openai/gpt-4o") as LanguageModel;

const QuestionSchema = z.object({
  id: z.string(),
  type: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  correctAnswer: z.string(),
  explanation: z.string(),
});

const QuizGenerationSchema = z.object({
  title: z.string().describe("A short, descriptive title for the quiz"),
  questions: z
    .array(QuestionSchema)
    .describe("Array of quiz questions with answers and explanations"),
});

export interface GenerateQuizParams {
  courseId: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  questionCount: number;
  topic?: string;
}

export async function generateQuiz(params: GenerateQuizParams) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  if (!user.user) {
    throw new Error("Unauthorized");
  }

  const { courseId, difficulty, questionCount, topic } = params;

  try {
    console.log("[generateQuiz] Starting quiz generation:", {
      courseId,
      difficulty,
      questionCount,
      topic,
    });

    const course = await db.query.courses.findFirst({
      where: and(eq(courses.id, courseId), eq(courses.userId, user.user.id)),
    });

    if (!course) {
      throw new Error("Course not found or unauthorized");
    }

    console.log("[generateQuiz] Course found:", course.name);

    let topicToUse = topic;

    if (!topicToUse) {
      console.log("[generateQuiz] No topic provided, generating one...");

      const searchResults = await searchDocumentsWithRRF({
        query: "main topics key concepts important subjects",
        courseId,
        topK: 10,
      });

      console.log(
        "[generateQuiz] Found",
        searchResults.results.length,
        "document chunks",
      );

      if (searchResults.results.length > 0) {
        const contextContent = searchResults.results
          .map((r) => r.content)
          .join("\n\n");

        const { text: generatedTopic } = await generateText({
          model: glm,
          system:
            "You are a helpful assistant that identifies the main topic or theme from course materials. Provide a short, focused topic (max 5 words) that would be good for a quiz.",
          prompt: `Based on these course materials, identify the main topic or theme:\n\n${contextContent.slice(0, 3000)}`,
          temperature: 0.5,
        });

        topicToUse = generatedTopic.trim().slice(0, 50);
        console.log("[generateQuiz] Generated topic:", topicToUse);
      } else {
        topicToUse = `${course.name} - General`;
        console.log(
          "[generateQuiz] No documents found, using course name as topic",
        );
      }
    }

    console.log("[generateQuiz] Fetching documents for quiz content...");

    const contentResults = await searchDocumentsWithRRF({
      query: topicToUse || "course content concepts definitions examples",
      courseId,
      topK: 15,
    });

    console.log(
      "[generateQuiz] Found",
      contentResults.results.length,
      "content chunks",
    );

    const contextContent = contentResults.results
      .map((r) => r.content)
      .join("\n\n");

    if (contextContent.length === 0) {
      throw new Error("No course content found to generate quiz from");
    }

    console.log("[generateQuiz] Generating quiz questions...");

    const questionTypes = [
      "multiple_choice",
      "true_false",
      "short_answer",
      "fill_in_the_blank",
    ];

    const { output: quizData } = await generateText({
      model: glm,
      temperature: 0.7,
      output: Output.object({
        schema: QuizGenerationSchema,
      }),
      system: `You are an expert educator creating quizzes for students. Create a quiz with exactly ${questionCount} questions.

The quiz should be at ${difficulty} difficulty level.

Include a mix of these question types:
- multiple_choice: 4 options, indicate correct answer by position (A, B, C, D)
- true_false: "True" or "False" as correct answer
- short_answer: concise answer (1-2 words)
- fill_in_the_blank: word/phrase that fills the blank

For each question, provide:
1. A clear, well-formatted question
2. Options (only for multiple choice questions, use empty array [] for other types)
3. The correct answer:
   - For multiple_choice: the position letter (A, B, C, or D)
   - For true_false: "True" or "False"
   - For short_answer and fill_in_the_blank:
     - If there is exactly one fully correct answer, return a single string
     - If there are multiple distinct answers that would all be considered fully correct (e.g. "list", "dict", "set" for a mutable Python data structure), encode them in a single string separated by the "|" character, with the best/primary answer first. Example: "list|dict|set"
4. A brief explanation (2-3 sentences) explaining why the answer is correct

IMPORTANT: The "options" field is required in the schema. Use empty array [] for non-multiple-choice questions.

Make questions challenging but fair. Test understanding, not just memorization.`,
      prompt: `Create a quiz about "${topicToUse}" for the course "${course.name}" (${
        course.code
      }).

Course context:
${contextContent.slice(0, 4000)}

Generate exactly ${questionCount} questions with a mix of types. Ensure variety in question difficulty and topics covered.

Difficulty level: ${difficulty}`,
    });

    console.log(
      "[generateQuiz] Generated",
      quizData.questions.length,
      "questions",
    );

    const [insertedQuiz] = await db
      .insert(quizzes)
      .values({
        userId: user.user.id,
        courseId,
        title: quizData.title,
        description: `A ${difficulty} level quiz on ${topicToUse}`,
        topic: topicToUse,
        difficulty,
        questionCount: quizData.questions.length,
        questions: quizData.questions,
      })
      .returning();

    if (!insertedQuiz) {
      throw new Error("Failed to create quiz");
    }

    await db.$cache.invalidate({ tables: [quizzes] });

    revalidatePath("/");
    revalidatePath(`/courses/${courseId}`);

    console.log("[generateQuiz] Quiz saved with ID:", insertedQuiz.id);

    return {
      id: insertedQuiz.id,
      title: insertedQuiz.title,
      description: insertedQuiz.description,
      topic: insertedQuiz.topic,
      difficulty: insertedQuiz.difficulty as
        | "beginner"
        | "intermediate"
        | "advanced",
      questionCount: insertedQuiz.questionCount,
      questions: insertedQuiz.questions as Array<{
        id: string;
        type: string;
        question: string;
        options?: string[];
        correctAnswer: string;
        explanation: string;
      }>,
      createdAt: insertedQuiz.createdAt,
    };
  } catch (error) {
    console.error("[generateQuiz] Error:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to generate quiz");
  }
}
