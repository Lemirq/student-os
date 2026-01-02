"use server";

import { db } from "@/drizzle";
import { documents } from "@/schema";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { eq, and } from "drizzle-orm";

export async function deleteDocument(data: { documentId: string }) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Unauthorized");

    if (!data.documentId) {
      throw new Error("Document ID is required");
    }

    const document = await db.query.documents.findFirst({
      where: eq(documents.id, data.documentId),
      with: {
        course: true,
      },
    });

    if (!document) {
      throw new Error("Document not found");
    }

    if (document.userId !== user.user.id) {
      throw new Error("Unauthorized");
    }

    const fileName = document.fileName;
    const courseId = document.courseId;

    const deleteConditions = [
      eq(documents.userId, user.user.id),
      eq(documents.fileName, fileName),
    ];

    if (courseId) {
      deleteConditions.push(eq(documents.courseId, courseId));
    }

    await db.delete(documents).where(and(...deleteConditions));

    await db.$cache.invalidate({ tables: [documents] });

    revalidatePath(`/courses/${courseId}`);

    return {
      success: true,
      message: `Successfully deleted document: ${fileName}`,
    };
  } catch (error) {
    console.error("Failed to delete document:", error);

    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: false,
      message: "An unexpected error occurred while deleting the document",
    };
  }
}
