"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getCourseDocuments } from "@/actions/documents/get-documents";
import { deleteDocument } from "@/actions/documents/delete-document";
import { cn } from "@/lib/utils";
import type { DocumentSummary } from "@/actions/documents/get-documents";
import { DocumentViewerDialog } from "@/components/documents/document-viewer-dialog";
import React from "react";

interface DocumentListProps {
  courseId: string;
  refetchTrigger?: number;
  onDocumentsChange?: (documents: DocumentSummary[]) => void;
}

export const DocumentList = React.memo(function DocumentList({
  courseId,
  refetchTrigger,
  onDocumentsChange,
}: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<{
    fileName: string;
    courseId: string;
  } | null>(null);
  const onDocumentsChangeRef = useRef(onDocumentsChange);

  const getBadgeVariant = useMemo(() => {
    return (type: string) => {
      return type === "syllabus" ? "default" : "secondary";
    };
  }, []);

  useEffect(() => {
    onDocumentsChangeRef.current = onDocumentsChange;
  });

  useEffect(() => {
    const fetchDocuments = async () => {
      setIsLoading(true);
      const result = await getCourseDocuments({ courseId });
      if (result.success) {
        setDocuments(result.documents);
        onDocumentsChangeRef.current?.(result.documents);
      } else {
        toast.error(result.message || "Failed to fetch documents");
      }
      setIsLoading(false);
    };

    fetchDocuments();
  }, [courseId, refetchTrigger]);

  const handleDelete = useCallback(
    async (fileName: string, firstChunkId: string) => {
      setDeletingId(firstChunkId);
      const result = await deleteDocument({ documentId: firstChunkId });
      if (result.success) {
        toast.success(result.message);
        setDocuments((prev) => prev.filter((doc) => doc.fileName !== fileName));
      } else {
        toast.error(result.message || "Failed to delete document");
      }
      setDeletingId(null);
    },
    [],
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3">
          <p className="text-sm text-muted-foreground">
            No documents uploaded yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <Card key={doc.firstChunkId} className="p-0">
          <CardContent className="flex items-start justify-between py-4 px-6">
            <button
              type="button"
              className="flex items-start gap-3 flex-1 min-w-0 text-left hover:bg-muted/50 rounded-md px-2 py-1 transition-colors"
              onClick={() =>
                setSelectedDocument({ fileName: doc.fileName, courseId })
              }
            >
              <div className="mt-0.5">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      "text-sm font-medium truncate",
                      doc.documentType === "syllabus" && "text-primary",
                    )}
                  >
                    {doc.fileName}
                  </p>
                  <Badge variant={getBadgeVariant(doc.documentType)}>
                    {doc.documentType}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {doc.chunkCount} chunk{doc.chunkCount !== 1 ? "s" : ""}
                  </span>
                  {doc.createdAt && (
                    <span>
                      • {new Date(doc.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(doc.fileName, doc.firstChunkId);
              }}
              disabled={deletingId === doc.firstChunkId}
              className="shrink-0"
            >
              {deletingId === doc.firstChunkId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className="sr-only">Delete document</span>
            </Button>
          </CardContent>
        </Card>
      ))}
      {selectedDocument && courseId && (
        <DocumentViewerDialog
          open={!!selectedDocument}
          onOpenChange={(open) => !open && setSelectedDocument(null)}
          fileName={selectedDocument.fileName}
          courseId={courseId}
        />
      )}
    </div>
  );
});
