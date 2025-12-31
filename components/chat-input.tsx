"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Mic, Plus, Square, X, FileText } from "lucide-react";

interface ChatInputProps {
  status: string;
  onSubmit: (text: string, files?: File[]) => void;
  onStop?: () => void;
  files?: File[];
  onFilesChange?: (files: File[]) => void;
  disabled?: boolean;
}

export default function ChatInput({
  status,
  onSubmit,
  onStop,
  files: controlledFiles,
  onFilesChange,
  disabled,
}: ChatInputProps) {
  const [input, setInput] = React.useState("");
  const [internalFiles, setInternalFiles] = React.useState<File[]>([]);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() && (!files || files.length === 0)) return;

    onSubmit(input, files);

    setInput("");
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

      <Textarea
        ref={textareaRef}
        placeholder="Ask AI..."
        className="min-h-[2.5rem] resize-none border-none focus-visible:ring-0 bg-transparent! shadow-none p-0"
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onInput={adjustTextareaHeight}
        onKeyDown={handleKeyDown}
        disabled={isLoading || disabled}
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
          {/*<Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 text-muted-foreground hover:text-foreground rounded-full"
            disabled={isLoading || disabled}
          >
            <Mic className="size-4" />
            <span className="sr-only">Voice input</span>
          </Button>*/}
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
              disabled={(!input.trim() && files.length === 0) || disabled}
            >
              <ArrowUp className="size-4" />
              <span className="sr-only">Send</span>
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
