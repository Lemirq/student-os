"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUp,
  Plus,
  Square,
  X,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getDocumentSuggestions,
  type DocumentSuggestion,
} from "@/actions/documents/get-document-suggestions";
import { toast } from "sonner";

interface TaggedDocument {
  fileName: string;
  courseId: string;
}

interface ChatInputProps {
  status: string;
  onSubmit: (
    text: string,
    files?: File[],
    taggedDocuments?: Array<{ courseId: string; fileName: string }>,
  ) => void;
  onStop?: () => void;
  files?: File[];
  onFilesChange?: (files: File[]) => void;
  disabled?: boolean;
  courseId?: string;
  semesterId?: string;
}

export default function ChatInput({
  status,
  onSubmit,
  onStop,
  files: controlledFiles,
  onFilesChange,
  disabled,
  courseId,
  semesterId,
}: ChatInputProps) {
  const [input, setInput] = React.useState("");
  const [internalFiles, setInternalFiles] = React.useState<File[]>([]);
  const [isMentionOpen, setIsMentionOpen] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const [selectedDocs, setSelectedDocs] = React.useState<TaggedDocument[]>([]);
  const [suggestions, setSuggestions] = React.useState<DocumentSuggestion[]>(
    [],
  );
  const [isLoadingSuggestions, setIsLoadingSuggestions] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const mentionRef = React.useRef<HTMLDivElement>(null);

  const isControlled =
    controlledFiles !== undefined && onFilesChange !== undefined;
  const files = isControlled ? controlledFiles : internalFiles;

  const handleFilesChange = (newFiles: File[]) => {
    if (isControlled) {
      onFilesChange(newFiles);
    } else {
      setInternalFiles(newFiles);
    }
  };

  const fetchSuggestions = React.useCallback(
    async (searchQuery: string) => {
      if (!courseId && !semesterId) return;

      setIsLoadingSuggestions(true);
      setSuggestions([]);

      try {
        const result = await getDocumentSuggestions({
          courseId,
          semesterId,
          query: searchQuery,
        });

        if (result.success) {
          setSuggestions(result.suggestions);
        } else {
          toast("Failed to load document suggestions", {
            description: "You can continue typing your message",
            icon: <AlertCircle className="size-4" />,
          });
        }
      } catch (error) {
        console.error("Failed to fetch document suggestions:", error);
        toast("Failed to load document suggestions", {
          description: "You can continue typing your message",
          icon: <AlertCircle className="size-4" />,
        });
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [courseId, semesterId],
  );

  const closeMention = () => {
    setIsMentionOpen(false);
    setHighlightedIndex(0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    const lastToken = value.split(/\s+/).slice(-1)[0];

    if (lastToken.startsWith("@")) {
      if (selectedDocs.length >= 3) {
        toast("Maximum 3 documents can be tagged", {
          icon: <AlertCircle className="size-4" />,
        });
        closeMention();
      } else if (courseId || semesterId) {
        const searchQuery = lastToken.slice(1);
        setIsMentionOpen(true);
        fetchSuggestions(searchQuery);
      }
    } else {
      closeMention();
    }

    setInput(value);
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isMentionOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex(
          (prev) => (prev - 1 + suggestions.length) % suggestions.length,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (suggestions[highlightedIndex]) {
          selectDocument(suggestions[highlightedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeMention();
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const selectDocument = (doc: DocumentSuggestion) => {
    if (selectedDocs.length >= 3) {
      toast("Maximum 3 documents can be tagged", {
        icon: <AlertCircle className="size-4" />,
      });
      return;
    }

    if (!doc.courseId) {
      toast("Unable to tag this document", {
        icon: <AlertCircle className="size-4" />,
      });
      return;
    }

    const lastToken = input.split(/\s+/).slice(-1)[0];
    const beforeLastToken = input.slice(0, input.lastIndexOf(lastToken)).trim();

    const newInput = beforeLastToken;
    setInput(newInput);

    if (!selectedDocs.find((d) => d.fileName === doc.fileName)) {
      setSelectedDocs([
        ...selectedDocs,
        { fileName: doc.fileName, courseId: doc.courseId },
      ]);
    }

    closeMention();

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const removeDocument = (docToRemove: TaggedDocument) => {
    setSelectedDocs(
      selectedDocs.filter((doc) => doc.fileName !== docToRemove.fileName),
    );
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (
      !input.trim() &&
      (!files || files.length === 0) &&
      selectedDocs.length === 0
    )
      return;

    const taggedDocuments = selectedDocs.map((doc) => ({
      courseId: doc.courseId || "",
      fileName: doc.fileName,
    }));

    onSubmit(input, files, taggedDocuments);

    setInput("");
    setSelectedDocs([]);
    handleFilesChange([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFilesChange([...files, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    handleFilesChange(newFiles);

    // Reset file input if all files are removed (optional but good for UX)
    if (newFiles.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <div className="relative">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border bg-sidebar-accent/5 shadow-sm p-3 flex flex-col gap-2"
      >
        {files.length > 0 && (
          <div className="flex flex-row gap-2 overflow-x-auto pb-2">
            {files.map((file, index) => (
              <div key={index} className="relative group">
                <div className="relative flex items-center justify-center w-20 h-20 bg-muted rounded-md border overflow-hidden">
                  {file.type.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="text-[10px] truncate max-w-[5rem] mt-1 text-muted-foreground">
                  {file.name}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedDocs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedDocs.map((doc, index) => (
              <Badge
                key={index}
                variant="outline"
                className="gap-1 cursor-pointer hover:bg-muted"
              >
                <FileText className="h-3 w-3" />
                <span className="max-w-[150px] truncate">{doc.fileName}</span>
                <button
                  type="button"
                  onClick={() => removeDocument(doc)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <Textarea
          ref={textareaRef}
          placeholder={
            selectedDocs.length >= 3
              ? "Max 3 documents tagged"
              : "Ask AI... (Type @ to mention documents)"
          }
          className="min-h-[2.5rem] resize-none border-none focus-visible:ring-0 bg-transparent! shadow-none p-0"
          rows={1}
          value={input}
          onChange={handleInputChange}
          onInput={adjustTextareaHeight}
          onKeyDown={handleKeyDown}
          disabled={isLoading || disabled || selectedDocs.length >= 3}
        />

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              multiple
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 text-muted-foreground hover:text-foreground rounded-full"
              disabled={isLoading || disabled}
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="size-4" />
              <span className="sr-only">Add attachment</span>
            </Button>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {isLoading ? (
              <Button
                type="button"
                size="icon"
                className="size-8 rounded-full"
                onClick={onStop}
              >
                <Square className="size-3 fill-current" />
                <span className="sr-only">Stop</span>
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                className="size-8 rounded-full"
                disabled={
                  (!input.trim() &&
                    files.length === 0 &&
                    selectedDocs.length === 0) ||
                  disabled
                }
              >
                <ArrowUp className="size-4" />
                <span className="sr-only">Send</span>
              </Button>
            )}
          </div>
        </div>
      </form>

      {isMentionOpen && (isLoadingSuggestions || suggestions.length > 0) && (
        <div
          ref={mentionRef}
          className="absolute bottom-full left-0 mb-2 w-full max-w-md bg-popover text-popover-foreground rounded-md border shadow-lg p-1 z-50"
        >
          {isLoadingSuggestions ? (
            <div className="px-3 py-8 text-center">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {suggestions.map((doc, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectDocument(doc)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 hover:bg-accent",
                    highlightedIndex === index && "bg-accent",
                  )}
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{doc.fileName}</span>
                  <span className="text-xs text-muted-foreground">
                    {doc.chunkCount} chunk{doc.chunkCount !== 1 ? "s" : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
