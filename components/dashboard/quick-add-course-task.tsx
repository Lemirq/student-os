"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createTask } from "@/actions/tasks";
import { toast } from "sonner";

interface QuickAddCourseTaskProps {
  courseId: string;
  courseCode: string;
}

export function QuickAddCourseTask({
  courseId,
  courseCode,
}: QuickAddCourseTaskProps) {
  const [title, setTitle] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && title.trim()) {
      e.preventDefault();

      startTransition(async () => {
        try {
          await createTask({
            title: title.trim(),
            courseId: courseId,
            status: "Todo",
            priority: "Medium",
          });
          setTitle("");
          toast.success("Task created");
        } catch {
          toast.error("Failed to create task");
        }
      });
    }
  };

  return (
    <div className="flex items-center gap-2 text-muted-foreground border-b pb-4 mb-4">
      <Plus className="h-4 w-4" />
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Add task to ${courseCode}...`}
        disabled={isPending}
        className="flex-1"
      />
    </div>
  );
}
