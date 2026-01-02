import { db } from "@/drizzle";
import { documents } from "@/schema";
import { generateEmbedding } from "@/lib/embedder";
import { sql, desc, eq, and } from "drizzle-orm";

export interface SearchResult {
  id: string;
  courseId: string | null;
  documentType: string;
  fileName: string;
  chunkIndex: number;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export async function searchSimilarDocuments(
  queryEmbedding: number[],
  userId: string,
  courseId?: string,
  topK: number = 5,
  minSimilarity: number = 0.7,
): Promise<SearchResult[]> {
  try {
    console.log("[searchSimilarDocuments] Starting with:", {
      embeddingLength: queryEmbedding.length,
      embeddingSample: queryEmbedding.slice(0, 5),
      userId,
      courseId,
      topK,
      minSimilarity,
    });

    const conditions = [eq(documents.userId, userId)];

    if (courseId) {
      console.log("[searchSimilarDocuments] Adding courseId filter:", courseId);
      conditions.push(eq(documents.courseId, courseId));
    } else {
      console.log(
        "[searchSimilarDocuments] No courseId filter, searching all documents for user",
      );
    }

    console.log("[searchSimilarDocuments] Executing pgvector query...");

    // Format embedding as PostgreSQL vector array literal: ARRAY[...]
    const embeddingLiteral = sql.raw(
      `ARRAY[${queryEmbedding.map((v) => v.toFixed(6)).join(",")}]::vector(1536)`,
    );

    const results = await db
      .select({
        id: documents.id,
        courseId: documents.courseId,
        documentType: documents.documentType,
        fileName: documents.fileName,
        chunkIndex: documents.chunkIndex,
        content: documents.content,
        similarity: sql<number>`1 - (${documents.embedding} <=> ${embeddingLiteral})`,
        metadata: documents.metadata,
      })
      .from(documents)
      .where(and(...conditions))
      .orderBy(
        desc(sql<number>`1 - (${documents.embedding} <=> ${embeddingLiteral})`),
      )
      .limit(topK);

    console.log(
      "[searchSimilarDocuments] Query returned:",
      results.length,
      "raw results",
    );

    if (results.length > 0) {
      console.log("[searchSimilarDocuments] Sample result:", {
        id: results[0].id,
        fileName: results[0].fileName,
        similarity: results[0].similarity,
      });
    }

    const filteredResults = results.filter(
      (result) => result.similarity >= minSimilarity,
    );

    console.log(
      "[searchSimilarDocuments] After filtering by minSimilarity:",
      filteredResults.length,
      "results",
    );

    return filteredResults as SearchResult[];
  } catch (error) {
    console.error("[searchSimilarDocuments] Error:", error);
    console.error(
      "[searchSimilarDocuments] Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    throw error;
  }
}

export async function searchByText(
  query: string,
  userId: string,
  courseId?: string,
  topK: number = 5,
  minSimilarity: number = 0.7,
): Promise<SearchResult[]> {
  try {
    console.log(
      "[searchByText] Generating embedding for query:",
      query.substring(0, 100),
    );

    const queryEmbedding = await generateEmbedding(query);

    console.log(
      "[searchByText] Embedding generated, dimensions:",
      queryEmbedding.length,
    );

    return searchSimilarDocuments(
      queryEmbedding,
      userId,
      courseId,
      topK,
      minSimilarity,
    );
  } catch (error) {
    console.error("[searchByText] Error:", error);
    console.error(
      "[searchByText] Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    throw error;
  }
}
