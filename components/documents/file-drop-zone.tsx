"use client";

import { useState, useRef } from "react";
import { Upload, File, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxSize?: number;
  className?: string;
}

export function FileDropZone({
  onFilesSelected,
  accept = ".pdf,.md,.markdown,.txt,.text,.html",
  maxSize,
  className,
}: FileDropZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const fileExtension = file.name
      .toLowerCase()
      .slice(file.name.lastIndexOf("."));
    const acceptedExtensions = accept
      .split(",")
      .map((ext) => ext.trim().toLowerCase());
    const acceptedMimeTypes = [
      "application/pdf",
      "text/markdown",
      "text/plain",
      "text/html",
    ];

    const isValidExtension = acceptedExtensions.some(
      (ext) => fileExtension === ext || fileExtension.endsWith(ext),
    );
    const isValidMimeType = acceptedMimeTypes.includes(file.type);

    if (!isValidExtension && !isValidMimeType) {
      return `Invalid file type: ${file.name}. Please upload a PDF, Markdown, HTML, or text file.`;
    }

    if (maxSize && file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      return `File too large: ${file.name} (max ${maxSizeMB}MB)`;
    }

    return null;
  };

  const processFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      errors.forEach((error) => toast.error(error));
    }

    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      onFilesSelected(validFiles);
    }
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
    processFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          selectedFiles.length > 0 && "pb-4",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          multiple
        />

        <div className="flex flex-col items-center gap-2">
          {selectedFiles.length > 0 ? (
            <div className="w-full space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <File className="h-5 w-5 flex-shrink-0 text-primary" />
                    <span className="text-sm font-medium truncate">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      ({formatFileSize(file.size)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                    className="p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Click or drag to add more files
              </p>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">
                Drop files here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                {accept.includes(".pdf") && "PDF"}
                {accept.includes(".md") && ", Markdown"}
                {accept.includes(".html") && ", HTML"}
                {accept.includes(".txt") && ", Text"}
                {maxSize && ` (max ${formatFileSize(maxSize)})`}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
