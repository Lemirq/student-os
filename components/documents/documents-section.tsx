"use client";

import { useState, useCallback } from "react";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentUploadDialog } from "@/components/documents/document-upload-dialog";
import { DocumentList } from "@/components/documents/document-list";
import { DocumentChip } from "@/components/documents/document-chip";
import { FileText, Upload } from "lucide-react";
import type { DocumentSummary } from "@/actions/documents/get-documents";

interface DocumentsSectionProps {
  courseId: string;
  initialDocuments: DocumentSummary[];
}

export const DocumentsSection = React.memo(function DocumentsSection({
  courseId,
  initialDocuments,
}: DocumentsSectionProps) {
  const [documents, setDocuments] =
    useState<DocumentSummary[]>(initialDocuments);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const handleDocumentsChange = useCallback(
    (newDocuments: DocumentSummary[]) => {
      setDocuments(newDocuments);
    },
    [],
  );

  const handleUploadSuccess = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Documents
          </CardTitle>
        </div>
        <DocumentChip documents={documents} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground mb-2">
            Upload syllabus PDFs and course materials to make them searchable by
            AI.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => setIsUploadDialogOpen(true)}
          >
            <Upload className="h-3 w-3 mr-2" />
            Upload Document
          </Button>
        </div>
        <DocumentList
          courseId={courseId}
          refetchTrigger={refetchTrigger}
          onDocumentsChange={handleDocumentsChange}
        />
      </CardContent>
      <DocumentUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        courseId={courseId}
        onSuccess={handleUploadSuccess}
      />
    </Card>
  );
});
