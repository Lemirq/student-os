"use server";

import { db } from "@/drizzle";
import { documents, users, courses } from "@/schema";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const uploadConfigurationSchema = z.object({
  courseId: z.uuid("Invalid course ID"),
  documentType: z.enum(["syllabus", "notes", "other"]).default("notes"),
});

export type UploadConfiguration = z.infer<typeof uploadConfigurationSchema>;

export type UploadResult = {
  successful: Array<{ id: string; documentId: string }>;
  failed: Array<{ id: string; error: string }>;
};

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

async function uploadSingleFile(
  file: File,
  config: UploadConfiguration,
): Promise<{ id: string; documentId?: string; error?: string }> {
  const id = crypto.randomUUID();

  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error("Unauthorized");
    }

    await ensureUserExists(user.user.id, user.user.email || "");

    const course = await db.query.courses.findFirst({
      where: and(
        eq(courses.id, config.courseId),
        eq(courses.userId, user.user.id),
      ),
    });

    if (!course) {
      throw new Error("Course not found or unauthorized");
    }

    const ragApiUrl = process.env.RAG_API_URL || "http://localhost:8000";
    const ragApiKey = process.env.RAG_API_KEY;

    if (!ragApiKey) {
      throw new Error("RAG_API_KEY is not configured");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", user.user.id);
    formData.append("file_name", file.name);
    formData.append("document_type", config.documentType);
    formData.append("course_id", config.courseId);

    const ragResponse = await fetch(`${ragApiUrl}/process-document`, {
      method: "POST",
      headers: {
        "X-API-Key": ragApiKey,
      },
      body: formData,
    });

    if (!ragResponse.ok) {
      const errorData = await ragResponse.json().catch(() => ({}));
      throw new Error(
        errorData.detail || "Failed to process document with RAG service",
      );
    }

    const ragResult = await ragResponse.json();

    if (!ragResult.chunks || ragResult.chunks.length === 0) {
      throw new Error("RAG service returned no chunks");
    }

    const documentRecords = ragResult.chunks.map(
      (chunk: {
        chunk_index: number;
        content: string;
        embedding: number[];
        metadata: Record<string, unknown>;
      }) => ({
        userId: user.user.id,
        courseId: config.courseId,
        documentType: config.documentType,
        fileName: file.name,
        chunkIndex: chunk.chunk_index,
        content: chunk.content,
        embedding: chunk.embedding,
        metadata: chunk.metadata,
      }),
    );

    await db.insert(documents).values(documentRecords);

    await db.$cache.invalidate({ tables: [documents] });

    revalidatePath(`/courses/${config.courseId}`);

    const insertedDocs = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(
          eq(documents.courseId, config.courseId),
          eq(documents.fileName, file.name),
        ),
      )
      .limit(1);

    return {
      id,
      documentId: insertedDocs[0]?.id,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        id,
        error: `Validation error: ${error.issues.map((e) => e.message).join(", ")}`,
      };
    }

    if (error instanceof Error) {
      return {
        id,
        error: error.message,
      };
    }

    return {
      id,
      error: "An unexpected error occurred while uploading the document",
    };
  }
}

export async function uploadFiles(
  files: File[],
  config: UploadConfiguration,
): Promise<UploadResult> {
  const validatedConfig = uploadConfigurationSchema.parse(config);

  const results = await Promise.all(
    files.map((file) => uploadSingleFile(file, validatedConfig)),
  );

  const successful: Array<{ id: string; documentId: string }> = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const result of results) {
    if (result.documentId) {
      successful.push({
        id: result.id,
        documentId: result.documentId,
      });
    } else if (result.error) {
      failed.push({
        id: result.id,
        error: result.error,
      });
    }
  }

  return { successful, failed };
}
