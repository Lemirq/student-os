export type UploadStatus = "pending" | "uploading" | "success" | "error";

export interface FileUploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  documentId?: string;
}

export interface UploadConfiguration {
  userId: string;
  documentType: "syllabus" | "notes" | "other";
  courseId?: string;
}
