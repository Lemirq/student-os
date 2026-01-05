import { SearchResult } from "./vector-search";

export interface RankedResult extends SearchResult {
  rrfScore: number;
}

export function reciprocalRankFusion(
  resultLists: SearchResult[][],
  k: number = 60,
): RankedResult[] {
  try {
    console.log(
      "[reciprocalRankFusion] Fusing",
      resultLists.length,
      "result lists with k=",
      k,
    );

    const scores = new Map<string, number>();

    // Calculate RRF score for each result
    for (const results of resultLists) {
      for (const [rank, result] of results.entries()) {
        const key = `${result.id}-${result.chunkIndex}`;

        if (!scores.has(key)) {
          scores.set(key, 0);
        }

        // RRF formula: 1 / (k + rank + 1)
        scores.set(key, scores.get(key)! + 1 / (k + rank + 1));
      }
    }

    console.log(
      "[reciprocalRankFusion] Calculated RRF scores for",
      scores.size,
      "unique results",
    );

    // Convert map back to array and deduplicate
    const rankedResults: RankedResult[] = [];

    // Find all unique results and add their RRF scores
    const processedKeys = new Set<string>();
    for (const results of resultLists) {
      for (const result of results) {
        const key = `${result.id}-${result.chunkIndex}`;

        // Avoid duplicates
        if (processedKeys.has(key)) {
          continue;
        }

        processedKeys.add(key);

        const rrfScore = scores.get(key) || 0;

        rankedResults.push({
          ...result,
          rrfScore,
        });
      }
    }

    // Sort by RRF score descending
    rankedResults.sort((a, b) => b.rrfScore - a.rrfScore);

    console.log(
      "[reciprocalRankFusion] Final ranking:",
      rankedResults.length,
      "results",
    );

    return rankedResults;
  } catch (error) {
    console.error("[reciprocalRankFusion] Error:", error);
    throw error;
  }
}
