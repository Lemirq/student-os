"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, File, Loader2 } from "lucide-react";
import { uploadPdf } from "@/actions/documents/upload-pdf";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

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
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, startUploading] = useTransition();
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

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

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null);
      setError(null);
      return;
    }

    const validExtensions = [".pdf", ".md", ".markdown", ".txt", ".text"];
    const fileExtension = selectedFile.name
      .toLowerCase()
      .slice(selectedFile.name.lastIndexOf("."));

    if (!validExtensions.includes(fileExtension)) {
      toast.error("Please upload a PDF, Markdown, or text file");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file first");
      return;
    }

    setError(null);

    startUploading(async () => {
      setProgress(10);

      const result = await uploadPdf({
        courseId: courseId,
        file: file,
        fileName: file.name,
        documentType: "notes",
      });

      setProgress(100);

      if (!result.success) {
        setError(result.message || "Failed to upload document");
        toast.error(result.message || "Failed to upload document");
        return;
      }

      toast.success(result.message);
      setFile(null);
      setProgress(0);

      onSuccess?.();
      onOpenChange(false);
    });
  };

  const handleClose = () => {
    if (!isUploading) {
      setFile(null);
      setProgress(0);
      setError(null);
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload a PDF, Markdown, or text document to use with RAG system for
            AI-powered search
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
              <Label>Document File</Label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={cn(
                  "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50",
                )}
              >
                <input
                  type="file"
                  accept=".pdf,.md,.markdown,.txt,.text"
                  onChange={(e) =>
                    handleFileChange(e.target.files?.[0] || null)
                  }
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                <div className="flex flex-col items-center gap-2">
                  {file ? (
                    <>
                      <File className="h-10 w-10 text-primary" />
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click or drag to replace
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        Drop your document here, or click to browse
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, Markdown, and text files are supported
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            {isUploading && progress > 0 && (
              <div className="space-y-2">
                <Label>Processing Document</Label>
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground text-center">
                  Generating embeddings... {progress}%
                </p>
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
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload Document"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
