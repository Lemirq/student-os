"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getDocumentChunks } from "@/actions/documents/get-document-chunks";
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
}

export function DocumentViewerDialog({
  open,
  onOpenChange,
  fileName,
  courseId,
}: DocumentViewerDialogProps) {
  const [chunks, setChunks] = React.useState<
    Array<{ chunkIndex: number; content: string }>
  >([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">{fileName}</DialogTitle>
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
