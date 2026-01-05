"use server";

import { db } from "@/drizzle";
import { documents, users, courses } from "@/schema";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const uploadPdfSchema = z.object({
  courseId: z.uuid("Invalid course ID"),
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

    // Call RAG microservice to process PDF
    const ragApiUrl = process.env.RAG_API_URL || "http://localhost:8000";
    const ragApiKey = process.env.RAG_API_KEY;

    if (!ragApiKey) {
      throw new Error("RAG_API_KEY is not configured");
    }

    const formData = new FormData();
    formData.append("file", validated.file);
    formData.append("user_id", user.user.id);
    formData.append("file_name", validated.fileName);
    formData.append("document_type", validated.documentType);
    formData.append("course_id", validated.courseId);

    const ragResponse = await fetch(`${ragApiUrl}/process-pdf`, {
      method: "POST",
      headers: {
        "X-API-Key": ragApiKey,
      },
      body: formData,
    });

    if (!ragResponse.ok) {
      const errorData = await ragResponse.json().catch(() => ({}));
      throw new Error(
        errorData.detail || "Failed to process PDF with RAG service",
      );
    }

    const ragResult = await ragResponse.json();

    if (!ragResult.chunks || ragResult.chunks.length === 0) {
      throw new Error("RAG service returned no chunks");
    }

    // Transform RAG response to database records
    const documentRecords = ragResult.chunks.map(
      (chunk: {
        chunk_index: number;
        content: string;
        embedding: number[];
        metadata: Record<string, unknown>;
      }) => ({
        userId: user.user.id,
        courseId: validated.courseId,
        documentType: validated.documentType,
        fileName: validated.fileName,
        chunkIndex: chunk.chunk_index,
        content: chunk.content,
        embedding: chunk.embedding,
        metadata: chunk.metadata,
      }),
    );

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
      message: `Successfully uploaded ${validated.fileName} with ${ragResult.total_chunks} chunks`,
      documentId: insertedDocs[0]?.id,
      chunkCount: ragResult.total_chunks,
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
