"use server";

import { db } from "@/drizzle";
import { documents, users, courses } from "@/schema";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { eq, and } from "drizzle-orm";
import { generateEmbeddings } from "@/lib/embedder";
import { z } from "zod";

// Simple text chunking for non-PDF documents
function chunkText(text: string, maxTokens = 500, overlapTokens = 50) {
  const estimateTokens = (text: string) =>
    Math.ceil(text.split(/\s+/).length * 1.3);

  const paragraphs = text.split(/\n\n+/);
  const chunks: Array<{
    text: string;
    index: number;
    tokenCount: number;
    metadata: { startChar: number; endChar: number };
  }> = [];

  let currentChunk = "";
  let currentTokens = 0;
  let charPosition = 0;
  let chunkIndex = 0;
  let previousChunk = "";

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);

    if (currentTokens + paraTokens > maxTokens && currentChunk) {
      // Save current chunk
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex++,
        tokenCount: currentTokens,
        metadata: {
          startChar: charPosition - currentChunk.length,
          endChar: charPosition,
        },
      });

      // Store for overlap
      previousChunk = currentChunk;

      // Start new chunk with overlap from previous chunk
      const overlapText = getOverlapText(
        previousChunk,
        overlapTokens,
        estimateTokens,
      );
      currentChunk = overlapText + (overlapText ? "\n\n" : "") + para;
      currentTokens = estimateTokens(currentChunk);
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + para;
      currentTokens += paraTokens;
    }

    charPosition += para.length + 2;
  }

  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunkIndex,
      tokenCount: currentTokens,
      metadata: {
        startChar: charPosition - currentChunk.length,
        endChar: charPosition,
      },
    });
  }

  return chunks;
}

// Extract the last N tokens from text for overlap
function getOverlapText(
  text: string,
  targetTokens: number,
  estimateTokens: (text: string) => number,
): string {
  if (!text || targetTokens <= 0) return "";

  // Split into sentences and take from the end
  const sentences = text.split(/[.!?]+\s+/).filter(Boolean);
  let overlap = "";
  let tokens = 0;

  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentence = sentences[i] + ".";
    const sentenceTokens = estimateTokens(sentence);

    if (tokens + sentenceTokens > targetTokens) break;

    overlap = sentence + " " + overlap;
    tokens += sentenceTokens;
  }

  return overlap.trim();
}

const saveTextDocumentSchema = z.object({
  text: z
    .string()
    .min(50, "Text must be at least 50 characters")
    .max(100000, "Text is too long (maximum 100,000 characters)"),
  documentName: z
    .string()
    .min(1, "Document name is required")
    .max(200, "Document name is too long"),
  courseId: z.string().uuid("Invalid course ID").optional(),
  documentType: z.enum(["syllabus", "notes", "other"]).default("other"),
  description: z.string().optional(),
});

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

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\/\\:*?"<>|]/g, "") // Remove invalid filesystem characters
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .substring(0, 100); // Limit length
}

function generateFileName(documentName: string): string {
  const sanitized = sanitizeFileName(documentName);
  const timestamp = Date.now();
  return `${sanitized}_${timestamp}.txt`;
}

export async function saveTextDocument(data: {
  text: string;
  documentName: string;
  courseId?: string;
  documentType?: "syllabus" | "notes" | "other";
  description?: string;
}) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Unauthorized");

    await ensureUserExists(user.user.id, user.user.email || "");

    const validated = saveTextDocumentSchema.parse(data);

    // Verify course ownership if courseId is provided
    if (validated.courseId) {
      const course = await db.query.courses.findFirst({
        where: and(
          eq(courses.id, validated.courseId),
          eq(courses.userId, user.user.id),
        ),
      });

      if (!course) {
        throw new Error("Course not found or unauthorized");
      }
    }

    // Generate unique filename
    const fileName = generateFileName(validated.documentName);

    // Trim and validate text content
    const text = validated.text.trim();
    if (text.length === 0) {
      throw new Error("Text content is empty");
    }

    // Chunk the text
    const chunks = chunkText(text, 500, 50);

    if (chunks.length === 0) {
      throw new Error("Failed to create chunks from text");
    }

    // Generate embeddings for all chunks
    const chunkTexts = chunks.map((chunk) => chunk.text);
    const embeddings = await generateEmbeddings(chunkTexts);

    if (embeddings.length !== chunks.length) {
      throw new Error("Embedding count mismatch with chunks");
    }

    // Prepare document records for insertion
    const documentRecords = chunks.map((chunk, index) => ({
      userId: user.user.id,
      courseId: validated.courseId || null,
      documentType: validated.documentType,
      fileName: fileName,
      chunkIndex: chunk.index,
      content: chunk.text,
      embedding: embeddings[index],
      metadata: {
        originalName: validated.documentName,
        description: validated.description,
        originalLength: text.length,
        chunkCount: chunks.length,
        tokenCount: chunk.tokenCount,
        startChar: chunk.metadata.startChar,
        endChar: chunk.metadata.endChar,
        savedAt: new Date().toISOString(),
      } as Record<string, unknown>,
    }));

    // Insert all chunks in a single transaction
    await db.insert(documents).values(documentRecords);

    // Invalidate cache
    await db.$cache.invalidate({ tables: [documents] });

    // Revalidate course page if course is associated
    if (validated.courseId) {
      revalidatePath(`/courses/${validated.courseId}`);
    }

    // Get the first chunk's ID for reference
    const insertedDocs = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.userId, user.user.id),
          eq(documents.fileName, fileName),
        ),
      )
      .limit(1);

    return {
      success: true,
      message: `Successfully saved "${validated.documentName}" with ${chunks.length} chunks`,
      fileName: fileName,
      documentId: insertedDocs[0]?.id,
      chunkCount: chunks.length,
    };
  } catch (error) {
    console.error("Failed to save text document:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: `Validation error: ${error.issues.map((e: { message: string }) => e.message).join(", ")}`,
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: false,
      message: "An unexpected error occurred while saving the document",
    };
  }
}
