"use server";

import { db } from "@/drizzle";
import { courses, documents } from "@/schema";
import { createClient } from "@/utils/supabase/server";
import { eq, sql, and } from "drizzle-orm";
import { searchByText } from "@/lib/vector-search";
import { generateQueryVariations } from "@/lib/query-generator";
import { reciprocalRankFusion } from "@/lib/rrf-fusion";
import { expandContext } from "@/lib/context-expander";

export interface SearchDocumentsRRFResult {
  results: Array<{
    id: string;
    courseId: string | null;
    documentType: string;
    fileName: string;
    chunkIndex: number;
    content: string;
    similarity: number;
    rrfScore?: number;
    metadata: Record<string, unknown>;
  }>;
  queryVariations: string[];
  finalChunkCount: number;
  strategy: "simple" | "medium" | "full";
}

async function getChunkCount(
  courseId?: string,
  userId?: string,
): Promise<number> {
  try {
    const conditions = userId ? [eq(documents.userId, userId)] : [];

    if (courseId) {
      conditions.push(eq(documents.courseId, courseId));
    }

    const result = await db
      .select({ count: sql<number>`count(*)`.as("count") })
      .from(documents)
      .where(and(...conditions))
      .limit(1);

    return result[0]?.count || 0;
  } catch (error) {
    console.error("[getChunkCount] Error:", error);
    return 0;
  }
}

async function simpleSearch(
  query: string,
  userId: string,
  courseId: string | undefined,
  topK: number,
): Promise<{
  results: Array<{
    id: string;
    courseId: string | null;
    documentType: string;
    fileName: string;
    chunkIndex: number;
    content: string;
    similarity: number;
    rrfScore?: number;
    metadata: Record<string, unknown>;
  }>;
  queryVariations: string[];
}> {
  try {
    console.log("[simpleSearch] Fetching all chunks (no variations)");

    const results = await searchByText(query, userId, courseId, topK, 0.3);

    return {
      results,
      queryVariations: [query],
    };
  } catch (error) {
    console.error("[simpleSearch] Error:", error);
    throw error;
  }
}

async function mediumSearch(
  query: string,
  userId: string,
  topK: number,
  courseId: string | undefined,
): Promise<{
  results: Array<{
    id: string;
    courseId: string | null;
    documentType: string;
    fileName: string;
    chunkIndex: number;
    content: string;
    similarity: number;
    rrfScore?: number;
    metadata: Record<string, unknown>;
  }>;
  queryVariations: string[];
}> {
  try {
    console.log("[mediumSearch] Using 2 queries + RRF (no context expansion)");

    const variations = await generateQueryVariations(query);

    const searchPromises = variations
      .slice(0, 2)
      .map((qv) => searchByText(qv, userId, courseId, topK, 0.3));

    const allResults = await Promise.all(searchPromises);

    const rrfResults = reciprocalRankFusion(allResults, 60);

    const finalResults = rrfResults.slice(0, topK);

    return {
      results: finalResults,
      queryVariations: variations,
    };
  } catch (error) {
    console.error("[mediumSearch] Error:", error);
    throw error;
  }
}

export async function searchDocumentsWithRRF(data: {
  query: string;
  topK?: number;
  courseId?: string;
  expandContextWindow?: number;
}): Promise<SearchDocumentsRRFResult> {
  try {
    console.log("[searchDocumentsWithRRF] Starting with:", data);

    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();

    console.log("[searchDocumentsWithRRF] User:", user.user?.id);

    if (!user.user) {
      throw new Error("Unauthorized");
    }

    if (!data.query || data.query.trim().length === 0) {
      throw new Error("Query cannot be empty");
    }

    let courseId = data.courseId;

    console.log("[searchDocumentsWithRRF] Initial courseId:", courseId);

    // Resolve courseId if not provided
    if (!courseId) {
      console.log(
        "[searchDocumentsWithRRF] No courseId provided, fetching current course",
      );

      const currentCourses = await db
        .select({ id: courses.id })
        .from(courses)
        .where(eq(courses.userId, user.user.id))
        .limit(1);

      console.log(
        "[searchDocumentsWithRRF] Current courses found:",
        currentCourses.length,
      );

      if (currentCourses.length > 0) {
        courseId = currentCourses[0].id;
        console.log("[searchDocumentsWithRRF] Using courseId:", courseId);
      } else {
        console.log(
          "[searchDocumentsWithRRF] No courses found for user, will search all documents",
        );
      }
    }

    // Check chunk count for adaptive strategy selection
    console.log("[searchDocumentsWithRRF] Checking dataset size...");
    const chunkCount: number = await getChunkCount(courseId, user.user.id);
    console.log("[searchDocumentsWithRRF] Chunk count:", chunkCount);

    // Adaptive strategy selection
    let strategy: "simple" | "medium" | "full";
    if (chunkCount <= 15) {
      strategy = "simple";
      console.log(
        "[searchDocumentsWithRRF] Using SIMPLE strategy (small dataset)",
      );
    } else if (chunkCount <= 50) {
      strategy = "medium";
      console.log(
        "[searchDocumentsWithRRF] Using MEDIUM strategy (medium dataset)",
      );
    } else {
      strategy = "full";
      console.log(
        "[searchDocumentsWithRRF] Using FULL strategy (large dataset)",
      );
    }

    const finalTopK = Math.min(data.topK || 10, 15);
    const contextWindow = data.expandContextWindow || 2;

    console.log("[searchDocumentsWithRRF] Final topK:", finalTopK);
    console.log(
      "[searchDocumentsWithRRF] Context expansion window:",
      contextWindow,
    );

    let result: {
      results: Array<{
        id: string;
        courseId: string | null;
        documentType: string;
        fileName: string;
        chunkIndex: number;
        content: string;
        similarity: number;
        rrfScore?: number;
        metadata: Record<string, unknown>;
      }>;
      queryVariations: string[];
    } = {
      results: [],
      queryVariations: [],
    };

    switch (strategy) {
      case "simple":
        console.log(
          "[searchDocumentsWithRRF] SIMPLE mode: Single query, no variations",
        );
        const simpleResult = await simpleSearch(
          data.query,
          user.user.id,
          courseId,
          Math.min(chunkCount, finalTopK),
        );
        result = simpleResult;
        break;

      case "medium":
        console.log("[searchDocumentsWithRRF] MEDIUM mode: 2 queries + RRF");
        const mediumResult = await mediumSearch(
          data.query,
          user.user.id,
          finalTopK,
          courseId,
        );
        result = mediumResult;
        break;

      case "full":
        console.log(
          "[searchDocumentsWithRRF] FULL mode: 3 queries + RRF + context expansion",
        );
        const variations = await generateQueryVariations(data.query);
        console.log(
          "[searchDocumentsWithRRF] Generated variations:",
          variations,
        );

        console.log("[searchDocumentsWithRRF] Executing parallel searches...");
        const topK = finalTopK + 5; // Fetch more for RRF selection
        const searchPromises = variations.map((qv) =>
          searchByText(qv, user.user.id, courseId, topK, 0.3),
        );

        const allResults = await Promise.all(searchPromises);
        console.log(
          "[searchDocumentsWithRRF] All searches completed:",
          allResults.map((r) => r.length),
        );

        console.log(
          "[searchDocumentsWithRRF] Applying RRF fusion with k=60...",
        );
        const rrfResults = reciprocalRankFusion(allResults, 60);
        console.log(
          "[searchDocumentsWithRRF] After RRF fusion:",
          rrfResults.length,
          "results",
        );

        const topRRFResults = rrfResults.slice(0, finalTopK + 5);

        console.log(
          "[searchDocumentsWithRRF] Expanding context with window ±",
          contextWindow,
          "...",
        );

        const expandedResults = await expandContext(
          user.user.id,
          topRRFResults,
          contextWindow,
        );
        console.log(
          "[searchDocumentsWithRRF] After context expansion:",
          expandedResults.length,
          "results",
        );

        const finalResults = expandedResults.slice(0, finalTopK);

        console.log(
          "[searchDocumentsWithRRF] Step 5: Final results:",
          finalResults.length,
        );

        result = {
          results: finalResults,
          queryVariations: variations,
        };
        break;
    }

    console.log(
      "[searchDocumentsWithRRF] Complete, returning",
      result.results.length,
      "results with strategy:",
      strategy,
    );

    return {
      ...result,
      strategy,
      finalChunkCount: result.results.length,
    };
  } catch (error) {
    console.error("[searchDocumentsWithRRF] Failed:", error);
    console.error(
      "[searchDocumentsWithRRF] Error details:",
      error instanceof Error ? error.message : String(error),
    );
    console.error(
      "[searchDocumentsWithRRF] Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("An unexpected error occurred while searching documents");
  }
}
