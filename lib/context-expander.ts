import { db } from "@/drizzle";
import { documents } from "@/schema";
import { eq, and, or } from "drizzle-orm";
import { SearchResult } from "./vector-search";

export async function expandContext(
  userId: string,
  results: SearchResult[],
  window: number = 2, // ±2 neighbors
): Promise<SearchResult[]> {
  try {
    console.log(
      "[expandContext] Expanding context with window ±",
      window,
      "for",
      results.length,
      "results",
    );

    const expandedResults: SearchResult[] = [...results];
    const processedKeys = new Set<string>();

    // Mark existing results as processed
    for (const result of results) {
      processedKeys.add(`${result.id}-${result.chunkIndex}`);
    }

    // Fetch neighbors for each result
    for (const result of results) {
      if (result.courseId && result.chunkIndex !== undefined) {
        // Build range of chunk indices to fetch
        const range: number[] = [];
        for (let i = -window; i <= window; i++) {
          if (i !== 0) {
            // Skip the original chunk (already included)
            range.push(result.chunkIndex + i);
          }
        }

        if (range.length === 0) {
          continue;
        }

        // Query for neighboring chunks
        const neighbors = await db
          .select({
            id: documents.id,
            courseId: documents.courseId,
            documentType: documents.documentType,
            fileName: documents.fileName,
            chunkIndex: documents.chunkIndex,
            content: documents.content,
            metadata: documents.metadata,
          })
          .from(documents)
          .where(
            and(
              eq(documents.userId, userId),
              eq(documents.courseId, result.courseId),
              eq(documents.fileName, result.fileName),
              or(...range.map((idx) => eq(documents.chunkIndex, idx))),
            ),
          );

        // Add neighbors if not already processed
        for (const neighbor of neighbors) {
          const key = `${neighbor.id}-${neighbor.chunkIndex}`;

          if (!processedKeys.has(key)) {
            processedKeys.add(key);

            expandedResults.push({
              id: neighbor.id,
              courseId: neighbor.courseId,
              documentType: neighbor.documentType,
              fileName: neighbor.fileName,
              chunkIndex: neighbor.chunkIndex,
              content: neighbor.content,
              similarity: 0, // No similarity for neighbors
              metadata: neighbor.metadata as Record<string, unknown>,
            });
          }
        }
      }
    }

    console.log(
      "[expandContext] Expanded from",
      results.length,
      "to",
      expandedResults.length,
      "results",
    );

    return expandedResults;
  } catch (error) {
    console.error("[expandContext] Error:", error);
    throw error;
  }
}
