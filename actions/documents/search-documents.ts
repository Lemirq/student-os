"use server";

import { db } from "@/drizzle";
import { courses } from "@/schema";
import { createClient } from "@/utils/supabase/server";
import { eq } from "drizzle-orm";
import { searchByText } from "@/lib/vector-search";

export interface SearchDocumentsResult {
  results: Array<{
    id: string;
    courseId: string | null;
    documentType: string;
    fileName: string;
    chunkIndex: number;
    content: string;
    similarity: number;
    metadata: Record<string, unknown>;
  }>;
}

export async function searchDocuments(data: {
  query: string;
  courseId?: string;
  topK?: number;
}): Promise<SearchDocumentsResult> {
  try {
    console.log("[searchDocuments] Starting search with:", data);

    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    console.log("[searchDocuments] User:", user.user?.id);

    if (!user.user) throw new Error("Unauthorized");

    if (!data.query || data.query.trim().length === 0) {
      throw new Error("Query cannot be empty");
    }

    let courseId = data.courseId;

    console.log("[searchDocuments] Initial courseId:", courseId);

    if (!courseId) {
      console.log(
        "[searchDocuments] No courseId provided, fetching current course",
      );

      const currentCourses = await db
        .select({ id: courses.id })
        .from(courses)
        .where(eq(courses.userId, user.user.id))
        .limit(1);

      console.log(
        "[searchDocuments] Current courses found:",
        currentCourses.length,
      );

      if (currentCourses.length > 0) {
        courseId = currentCourses[0].id;
        console.log("[searchDocuments] Using courseId:", courseId);
      } else {
        console.log(
          "[searchDocuments] No courses found for user, will search all documents",
        );
      }
    }

    console.log("[searchDocuments] Calling searchByText with:", {
      query: data.query,
      userId: user.user.id,
      courseId,
      topK: data.topK || 5,
      minSimilarity: 0.7,
    });

    const results = await searchByText(
      data.query,
      user.user.id,
      courseId,
      data.topK || 5,
      0.3,
    );

    console.log(
      "[searchDocuments] searchByText returned:",
      results.length,
      "results",
    );

    return {
      results,
    };
  } catch (error) {
    console.error("[searchDocuments] Failed to search documents:", error);
    console.error(
      "[searchDocuments] Error details:",
      error instanceof Error ? error.message : String(error),
    );
    console.error(
      "[searchDocuments] Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("An unexpected error occurred while searching documents");
  }
}
