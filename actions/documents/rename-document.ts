"use server";

import { db } from "@/drizzle";
import { documents } from "@/schema";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { eq, and } from "drizzle-orm";

export async function renameDocument(data: {
  oldFileName: string;
  newFileName: string;
  courseId: string;
}) {
  try {
    const supabase = await createClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Unauthorized");

    const { oldFileName, newFileName, courseId } = data;

    if (!oldFileName || !newFileName) {
      throw new Error("File names are required");
    }

    const trimmed = newFileName.trim();
    if (!trimmed) {
      throw new Error("File name cannot be empty");
    }

    if (trimmed === oldFileName) {
      return { success: true, message: "No change needed" };
    }

    await db
      .update(documents)
      .set({ fileName: trimmed, updatedAt: new Date() })
      .where(
        and(
          eq(documents.userId, user.user.id),
          eq(documents.fileName, oldFileName),
          eq(documents.courseId, courseId),
        ),
      );

    await db.$cache.invalidate({ tables: [documents] });

    revalidatePath(`/courses/${courseId}`);

    return {
      success: true,
      newFileName: trimmed,
      message: `Renamed to "${trimmed}"`,
    };
  } catch (error) {
    console.error("Failed to rename document:", error);

    if (error instanceof Error) {
      return { success: false, message: error.message };
    }

    return {
      success: false,
      message: "An unexpected error occurred while renaming the document",
    };
  }
}
