"use client";

import * as React from "react";
import { Brain, ChevronDown } from "lucide-react";
import { cn, stripSystemReminders } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface ReasoningAccordionProps {
  content: string;
}

export function ReasoningAccordion({ content }: ReasoningAccordionProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const initializedRef = React.useRef(false);

  const sanitizedContent = stripSystemReminders(content);
  const wordCount = sanitizedContent.trim().split(/\s+/).length;
  const shouldAutoCollapse = wordCount > 100;

  React.useEffect(() => {
    if (!initializedRef.current) {
      setIsOpen(!shouldAutoCollapse);
      initializedRef.current = true;
    }
  }, [shouldAutoCollapse]);

  if (!sanitizedContent) return null;

  return (
    <div className="w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5 px-2 rounded-md hover:bg-muted/50 w-full text-left"
      >
        <Brain className="size-3.5 text-purple-500 shrink-0" />
        <span className="font-medium">Reasoning</span>
        <ChevronDown
          className={cn(
            "size-3.5 ml-auto shrink-0 transition-transform duration-200",
            isOpen ? "rotate-180" : "rotate-0",
          )}
        />
      </button>

      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-1 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 text-xs text-muted-foreground">
            <div className="prose prose-xs dark:prose-invert max-w-none prose-p:text-muted-foreground prose-p:text-xs prose-p:leading-relaxed wrap-anywhere">
              <ReactMarkdown>{sanitizedContent}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
