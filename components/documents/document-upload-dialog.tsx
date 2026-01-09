"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Upload,
  File,
  Loader2,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { FileUploadItem, UploadStatus } from "@/types/upload";
import { FileDropZone } from "./file-drop-zone";
import { useFileUpload } from "@/hooks/useFileUpload";

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  onSuccess?: () => void;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  courseId,
  onSuccess,
}: DocumentUploadDialogProps) {
  const [fileItems, setFileItems] = useState<FileUploadItem[]>([]);
  const [isUploading, startUploading] = useTransition();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [documentType, setDocumentType] = useState<
    "syllabus" | "notes" | "other"
  >("notes");

  const { uploadFiles, cancelUpload, retryUpload, resetUpload } =
    useFileUpload();

  const ALLOWED_EMAILS = ["sharmavihaan190@gmail.com", "amoghmerudi@gmail.com"];
  const aiEnabled = userEmail ? ALLOWED_EMAILS.includes(userEmail) : false;

  useEffect(() => {
    const getUserEmail = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
      setIsLoadingUser(false);
    };

    getUserEmail();
  }, []);

  const handleFilesSelected = useCallback((files: File[]) => {
    const newItems: FileUploadItem[] = files.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      status: "pending" as UploadStatus,
      progress: 0,
    }));
    setFileItems((prev) => [...prev, ...newItems]);
  }, []);

  const removeFile = (id: string) => {
    const item = fileItems.find((i) => i.id === id);
    if (item && item.status === "uploading") {
      cancelUpload(id);
    }
    setFileItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpload = async () => {
    const pendingFiles = fileItems.filter((i) => i.status === "pending");
    if (pendingFiles.length === 0) {
      toast.error("No files to upload");
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be logged in to upload documents");
      return;
    }

    startUploading(async () => {
      await uploadFiles(fileItems, {
        userId: user.id,
        documentType,
        courseId,
      });
    });
  };

  const handleRetry = async (id: string) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be logged in to upload documents");
      return;
    }

    startUploading(async () => {
      await retryUpload(
        id,
        {
          userId: user.id,
          documentType,
          courseId,
        },
        fileItems,
      );
    });
  };

  const handleReset = (id: string) => {
    resetUpload(id);
  };

  const handleClose = () => {
    if (!isUploading) {
      setFileItems([]);
      onOpenChange(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const totalFiles = fileItems.length;
  const uploadedCount = fileItems.filter((i) => i.status === "success").length;
  const failedCount = fileItems.filter((i) => i.status === "error").length;
  const pendingCount = fileItems.filter(
    (i) => i.status === "pending" || i.status === "uploading",
  ).length;

  const getStatusIcon = (status: UploadStatus) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "uploading":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Upload PDF, Markdown, HTML, or text documents to use with RAG system
            for AI-powered search
          </DialogDescription>
        </DialogHeader>

        {isLoadingUser ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !aiEnabled ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <File className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-sm text-foreground">
              AI features are not available for you.
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              Contact {ALLOWED_EMAILS[0]} to get access.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <div className="flex gap-2">
                {(["notes", "syllabus", "other"] as const).map((type) => (
                  <Button
                    key={type}
                    variant={documentType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDocumentType(type)}
                    disabled={isUploading}
                    className="capitalize"
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            <FileDropZone
              onFilesSelected={handleFilesSelected}
              accept=".pdf,.md,.markdown,.txt,.text,.html"
              className={cn(
                "border-2 border-dashed rounded-lg transition-colors",
                "hover:border-muted-foreground/50",
              )}
            />

            {totalFiles > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <Label>Selected Files ({totalFiles})</Label>
                  <span className="text-muted-foreground">
                    {uploadedCount} successful, {failedCount} failed
                  </span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {fileItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border",
                        item.status === "error"
                          ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900"
                          : item.status === "success"
                            ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                            : "bg-muted/50",
                      )}
                    >
                      <File className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(item.file.size)}
                        </p>
                        {item.status === "uploading" && (
                          <Progress
                            value={item.progress}
                            className="h-1 mt-1"
                          />
                        )}
                        {item.status === "error" && item.error && (
                          <p className="text-xs text-red-500 mt-1 truncate">
                            {item.error}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {getStatusIcon(item.status)}
                        {item.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeFile(item.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {item.status === "error" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleReset(item.id)}
                              title="Reset"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRetry(item.id)}
                              title="Retry"
                            >
                              <Loader2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={pendingCount === 0 || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {pendingCount} file{pendingCount !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
