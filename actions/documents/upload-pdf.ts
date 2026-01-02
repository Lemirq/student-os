"use server";

import { db } from "@/drizzle";
import { documents, users, courses } from "@/schema";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { eq, and } from "drizzle-orm";
import { parseFile } from "@/lib/file-parser";
import { chunkText } from "@/lib/chunker";
import { generateEmbeddings } from "@/lib/embedder";
import { z } from "zod";

const uploadPdfSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  file: z.instanceof(File),
  fileName: z.string().min(1, "File name is required"),
  documentType: z.enum(["syllabus", "notes", "other"]).default("notes"),
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

export async function uploadPdf(data: {
  courseId: string;
  file: File;
  fileName: string;
  documentType?: "syllabus" | "notes" | "other";
}) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Unauthorized");

    await ensureUserExists(user.user.id, user.user.email || "");

    const validated = uploadPdfSchema.parse(data);

    const course = await db.query.courses.findFirst({
      where: and(
        eq(courses.id, validated.courseId),
        eq(courses.userId, user.user.id),
      ),
    });

    if (!course) {
      throw new Error("Course not found or unauthorized");
    }

    const arrayBuffer = await validated.file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const parseResult = await parseFile(buffer, validated.fileName);
    const text = parseResult.text;

    if (text.trim().length === 0) {
      throw new Error("Document contains no text content");
    }

    const chunks = await chunkText(text, 500, 50);

    if (chunks.length === 0) {
      throw new Error("Failed to create chunks from document");
    }

    const chunkTexts = chunks.map((chunk) => chunk.text);
    const embeddings = await generateEmbeddings(chunkTexts);

    if (embeddings.length !== chunks.length) {
      throw new Error("Embedding count mismatch with chunks");
    }

    const documentRecords = chunks.map((chunk, index) => ({
      userId: user.user.id,
      courseId: validated.courseId,
      documentType: validated.documentType,
      fileName: validated.fileName,
      chunkIndex: chunk.index,
      content: chunk.text,
      embedding: embeddings[index],
      metadata: {
        fileType: parseResult.fileType,
        pageCount: parseResult.metadata.pageCount,
        tokenCount: chunk.tokenCount,
        startChar: chunk.metadata.startChar,
        endChar: chunk.metadata.endChar,
        fileSize: parseResult.metadata.fileSize,
        title: parseResult.metadata.title,
        author: parseResult.metadata.author,
      } as Record<string, unknown>,
    }));

    await db.insert(documents).values(documentRecords);

    await db.$cache.invalidate({ tables: [documents] });

    revalidatePath(`/courses/${validated.courseId}`);

    const insertedDocs = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.courseId, validated.courseId),
          eq(documents.fileName, validated.fileName),
        ),
      )
      .limit(1);

    return {
      success: true,
      message: `Successfully uploaded ${validated.fileName} with ${chunks.length} chunks`,
      documentId: insertedDocs[0]?.id,
      chunkCount: chunks.length,
    };
  } catch (error) {
    console.error("Failed to upload document:", error);

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
      message: "An unexpected error occurred while uploading the document",
    };
  }
}
