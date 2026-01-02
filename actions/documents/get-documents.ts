"use server";

import { db } from "@/drizzle";
import { documents } from "@/schema";
import { createClient } from "@/utils/supabase/server";
import { eq, and, desc } from "drizzle-orm";

export interface DocumentSummary {
  fileName: string;
  documentType: string;
  chunkCount: number;
  createdAt: Date | null;
  firstChunkId: string;
  courseId: string | null;
}

export async function getCourseDocuments(data: { courseId: string }) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Unauthorized");

    if (!data.courseId) {
      throw new Error("Course ID is required");
    }

    const docs = await db.query.documents.findMany({
      where: and(
        eq(documents.courseId, data.courseId),
        eq(documents.userId, user.user.id),
      ),
      orderBy: [desc(documents.createdAt)],
    });

    const groupedDocs = new Map<string, DocumentSummary>();

    for (const doc of docs) {
      const key = doc.fileName;
      if (!groupedDocs.has(key)) {
        groupedDocs.set(key, {
          fileName: doc.fileName,
          documentType: doc.documentType,
          chunkCount: 1,
          createdAt: doc.createdAt,
          firstChunkId: doc.id,
          courseId: doc.courseId,
        });
      } else {
        const summary = groupedDocs.get(key);
        if (summary) {
          summary.chunkCount += 1;
        }
      }
    }

    return {
      success: true,
      documents: Array.from(groupedDocs.values()),
    };
  } catch (error) {
    console.error("Failed to fetch documents:", error);

    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
        documents: [],
      };
    }

    return {
      success: false,
      message: "An unexpected error occurred while fetching documents",
      documents: [],
    };
  }
}
