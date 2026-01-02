import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const MAX_RETRIES_DEFAULT = 2;
const RETRY_DELAY_MS = 1000;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateEmbedding(text: string): Promise<number[]> {
  console.log("[generateEmbedding] Starting, text length:", text.length);
  const embeddings = await generateEmbeddings([text], MAX_RETRIES_DEFAULT);
  console.log(
    "[generateEmbedding] Completed, embedding dimensions:",
    embeddings[0]?.length,
  );
  return embeddings[0];
}

export async function generateEmbeddings(
  texts: string[],
  maxRetries: number = MAX_RETRIES_DEFAULT,
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  console.log("[generateEmbeddings] Starting, texts count:", texts.length);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[generateEmbeddings] Attempt ${attempt + 1}/${maxRetries + 1}`,
      );
      const { embeddings } = await embedMany({
        model: openai.embedding(EMBEDDING_MODEL),
        values: texts,
      });

      console.log(
        "[generateEmbeddings] Received embeddings from API:",
        embeddings.length,
      );

      const validatedEmbeddings = embeddings.map((embedding) => {
        if (embedding.length !== EMBEDDING_DIMENSIONS) {
          throw new Error(
            `Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}`,
          );
        }
        return embedding;
      });

      if (validatedEmbeddings.length !== texts.length) {
        throw new Error(
          `Expected ${texts.length} embeddings, got ${validatedEmbeddings.length}`,
        );
      }

      console.log("[generateEmbeddings] All embeddings validated successfully");
      return validatedEmbeddings;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `[generateEmbeddings] Attempt ${attempt + 1} failed:`,
        lastError.message,
      );

      if (attempt < maxRetries) {
        const isRateLimitError =
          lastError.message.includes("429") ||
          lastError.message.includes("rate limit") ||
          lastError.message.includes("quota");

        if (isRateLimitError) {
          console.log("[generateEmbeddings] Rate limit detected, waiting...");
          await delay(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
      }

      break;
    }
  }

  console.error(
    "[generateEmbeddings] All attempts failed:",
    lastError?.message,
  );
  throw new Error(
    `Failed to generate embeddings after ${maxRetries + 1} attempts: ${lastError?.message}`,
  );
}
