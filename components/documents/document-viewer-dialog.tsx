"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { getDocumentChunks } from "@/actions/documents/get-document-chunks";
import { renameDocument } from "@/actions/documents/rename-document";
import ReactMarkdown from "react-markdown";
import { preprocessMarkdown } from "@/lib/markdown-preprocessor";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface DocumentViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  courseId: string;
  onRename?: (newFileName: string) => void;
}

export function DocumentViewerDialog({
  open,
  onOpenChange,
  fileName,
  courseId,
  onRename,
}: DocumentViewerDialogProps) {
  const [chunks, setChunks] = React.useState<
    Array<{ chunkIndex: number; content: string }>
  >([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(fileName);
  const [isSaving, setIsSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setEditValue(fileName);
  }, [fileName]);

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  React.useEffect(() => {
    async function loadDocument() {
      if (!open || !fileName || !courseId) return;

      setIsLoading(true);
      setError(null);
      setChunks([]);

      try {
        const result = await getDocumentChunks({ fileName, courseId });

        if (result.success) {
          setChunks(result.chunks.sort((a, b) => a.chunkIndex - b.chunkIndex));
        } else {
          const errorMsg = result.message || "Failed to load document";
          setError(errorMsg);
          toast.error(errorMsg);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load document";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }

    loadDocument();
  }, [open, fileName, courseId]);

  const handleRenameStart = () => {
    setEditValue(fileName);
    setIsEditing(true);
  };

  const handleRenameCancel = () => {
    setEditValue(fileName);
    setIsEditing(false);
  };

  const handleRenameConfirm = async () => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      toast.error("File name cannot be empty");
      inputRef.current?.focus();
      return;
    }

    if (trimmed === fileName) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const result = await renameDocument({
        oldFileName: fileName,
        newFileName: trimmed,
        courseId,
      });

      if (result.success) {
        toast.success(result.message);
        setIsEditing(false);
        onRename?.(result.newFileName ?? trimmed);
      } else {
        toast.error(result.message || "Failed to rename document");
        inputRef.current?.focus();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameConfirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleRenameCancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle asChild>
            <div className="flex items-center gap-2 min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSaving}
                    className="flex-1 min-w-0 bg-transparent border-b border-primary text-base font-semibold outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={handleRenameConfirm}
                    disabled={isSaving}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    aria-label="Confirm rename"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleRenameCancel}
                    disabled={isSaving}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    aria-label="Cancel rename"
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRenameStart}
                  className="group flex items-center gap-1.5 min-w-0 text-left"
                  aria-label="Click to rename file"
                >
                  <span className="truncate text-base font-semibold">
                    {fileName}
                  </span>
                  <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full min-h-[300px] text-destructive">
              {error}
            </div>
          ) : chunks.length > 0 ? (
            chunks.map((chunk) => (
              <div
                key={chunk.chunkIndex}
                className="border-b border-border last:border-b-0"
              >
                <div className="bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
                  Chunk {chunk.chunkIndex + 1}
                </div>
                <div className="prose prose-sm dark:prose-invert max-w-none p-4">
                  <ReactMarkdown
                    rehypePlugins={[rehypeKatex]}
                    remarkPlugins={[remarkGfm, remarkMath]}
                  >
                    {preprocessMarkdown(chunk.content)}
                  </ReactMarkdown>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-full min-h-[300px] text-muted-foreground">
              No content available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
