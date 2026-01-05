import { generateObject, ObjectStreamPart } from "ai";
import { z } from "zod";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { openRouterApiKey } from "./env";

const openRouterClient = createOpenRouter({
  apiKey: openRouterApiKey,
});
const glm = openRouterClient.chat("z-ai/glm-4.7") as any;

export interface QueryVariationsOutput {
  variations: string[];
}

export async function generateQueryVariations(
  query: string,
): Promise<string[]> {
  try {
    console.log("[generateQueryVariations] Generating variations for:", query);

    const { object } = await generateObject({
      model: glm,
      output: "object",
      schema: z.object({
        variations: z.array(z.string()),
      }),
      prompt: `Generate 2 alternative phrasings of the user's search query to improve retrieval in a document search system. The variations should capture:
1. A rephrased version using different vocabulary
2. A more specific or more general version

User query: "${query}"

Generate 2 variations. Focus on academic/document search context.`,
      temperature: 0.7,
    });

    const allVariations = [query, ...object.variations];

    console.log(
      "[generateQueryVariations] Generated",
      allVariations.length,
      "variations:",
      allVariations,
    );

    return allVariations.slice(0, 3); // Return exactly 3 (including original)
  } catch (error) {
    console.error("[generateQueryVariations] Error:", error);

    // Fallback to original query if LLM fails
    console.log(
      "[generateQueryVariations] Falling back to original query only",
    );
    return [query];
  }
}
