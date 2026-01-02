"use client";

import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import type { DocumentSummary } from "@/actions/documents/get-documents";
import React from "react";

interface DocumentChipProps {
  documents: DocumentSummary[];
  onClick?: () => void;
}

export const DocumentChip = React.memo(function DocumentChip({
  documents,
  onClick,
}: DocumentChipProps) {
  const count = documents.length;
  const chunkCount = documents.reduce((sum, doc) => sum + doc.chunkCount, 0);

  if (count === 0) {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 cursor-pointer hover:bg-muted"
      onClick={onClick}
    >
      <FileText className="h-3 w-3" />
      <span>
        {count} doc{count !== 1 ? "s" : ""} ({chunkCount} chunk
        {chunkCount !== 1 ? "s" : ""})
      </span>
    </Badge>
  );
});
