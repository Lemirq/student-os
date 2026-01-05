"use server";

import { db } from "@/drizzle";
import { documents } from "@/schema";
import { createClient } from "@/utils/supabase/server";
import { eq, and, asc } from "drizzle-orm";

export async function getDocumentChunks({
  fileName,
  courseId,
}: {
  fileName: string;
  courseId: string;
}) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Unauthorized");

    if (!courseId) {
      throw new Error("Course ID is required");
    }

    const chunks = await db.query.documents.findMany({
      where: and(
        eq(documents.courseId, courseId),
        eq(documents.userId, user.user.id),
        eq(documents.fileName, fileName),
      ),
      orderBy: [asc(documents.chunkIndex)],
    });

    return {
      success: true,
      chunks: chunks.map((chunk) => ({
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        metadata: chunk.metadata,
      })),
      fileName,
    };
  } catch (error) {
    console.error("Failed to fetch document chunks:", error);

    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
        chunks: [],
        fileName,
      };
    }

    return {
      success: false,
      message: "An unexpected error occurred while fetching document chunks",
      chunks: [],
      fileName,
    };
  }
}
