"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Mic, Plus, Square } from "lucide-react";

interface ChatInputProps {
  status: string;
  onSubmit: (text: string) => void;
  onStop?: () => void;
}

export default function ChatInput({
  status,
  onSubmit,
  onStop,
}: ChatInputProps) {
  const [input, setInput] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

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
    if (!input.trim()) return;
    onSubmit(input);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const isLoading = status === "submitted" || status === "streaming";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border bg-sidebar-accent/5 shadow-sm p-3 flex flex-col gap-2"
    >
      <Textarea
        ref={textareaRef}
        placeholder="Ask AI..."
        className="min-h-[2.5rem] resize-none border-none focus-visible:ring-0 bg-transparent! shadow-none p-0"
        rows={1}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onInput={adjustTextareaHeight}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
      />

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 text-muted-foreground hover:text-foreground rounded-full"
            disabled={isLoading}
          >
            <Plus className="size-4" />
            <span className="sr-only">Add attachment</span>
          </Button>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 text-muted-foreground hover:text-foreground rounded-full"
            disabled={isLoading}
          >
            <Mic className="size-4" />
            <span className="sr-only">Voice input</span>
          </Button>
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
              disabled={!input.trim()}
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
