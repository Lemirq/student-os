"use client";

import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, LayoutGrid, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewType = "list" | "board" | "calendar";

interface TaskViewToggleProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function TaskViewToggle({ view, onViewChange }: TaskViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-md border bg-background p-1 h-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("list")}
        className={cn(
          "h-6 px-2 hover:bg-muted",
          view === "list" && "bg-muted text-foreground font-medium",
        )}
        title="List View"
      >
        <Table2 className="h-4 w-4" />
        <span className="sr-only">List View</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("board")}
        className={cn(
          "h-6 px-2 hover:bg-muted",
          view === "board" && "bg-muted text-foreground font-medium",
        )}
        title="Board View"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="sr-only">Board View</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("calendar")}
        className={cn(
          "h-6 px-2 hover:bg-muted",
          view === "calendar" && "bg-muted text-foreground font-medium",
        )}
        title="Calendar View"
      >
        <CalendarIcon className="h-4 w-4" />
        <span className="sr-only">Calendar View</span>
      </Button>
    </div>
  );
}
