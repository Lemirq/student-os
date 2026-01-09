"use server";

import { getCourseDocuments, getSemesterDocuments } from "./get-documents";

export interface DocumentSuggestion {
  fileName: string;
  courseId: string | null;
  documentType: string;
  chunkCount: number;
}

export async function getDocumentSuggestions(data: {
  courseId?: string;
  semesterId?: string;
  query?: string;
}) {
  try {
    let result;

    if (data.courseId) {
      result = await getCourseDocuments({ courseId: data.courseId });
    } else if (data.semesterId) {
      result = await getSemesterDocuments({ semesterId: data.semesterId });
    } else {
      return {
        success: false,
        message: "Either courseId or semesterId is required",
        suggestions: [],
      };
    }

    if (!result.success) {
      return {
        success: false,
        message: result.message,
        suggestions: [],
      };
    }

    let suggestions = result.documents.map((doc) => ({
      fileName: doc.fileName,
      courseId: doc.courseId,
      documentType: doc.documentType,
      chunkCount: doc.chunkCount,
    }));

    if (data.query && data.query.trim()) {
      const query = data.query.toLowerCase();
      suggestions = suggestions.filter((doc) =>
        doc.fileName.toLowerCase().includes(query),
      );
    }

    suggestions.sort((a, b) => {
      const aCreatedAt = result.documents.find(
        (d) => d.fileName === a.fileName,
      )?.createdAt;
      const bCreatedAt = result.documents.find(
        (d) => d.fileName === b.fileName,
      )?.createdAt;

      if (!aCreatedAt) return 1;
      if (!bCreatedAt) return -1;

      return bCreatedAt.getTime() - aCreatedAt.getTime();
    });

    return {
      success: true,
      suggestions,
    };
  } catch (error) {
    console.error("Failed to fetch document suggestions:", error);

    if (error instanceof Error) {
      return {
        success: false,
        message: error.message,
        suggestions: [],
      };
    }

    return {
      success: false,
      message:
        "An unexpected error occurred while fetching document suggestions",
      suggestions: [],
    };
  }
}
