"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { updateTask, getTask } from "@/actions/tasks";
import { toast } from "sonner";
import { Plus, GripVertical } from "lucide-react";

type TaskWithRelations = NonNullable<Awaited<ReturnType<typeof getTask>>>;

interface TaskMainContentProps {
  task: TaskWithRelations;
}

export function TaskMainContent({ task }: TaskMainContentProps) {
  const [title, setTitle] = React.useState(task.title);
  const [description, setDescription] = React.useState(task.description || "");

  // Mock subtasks state
  const [subtasks, setSubtasks] = React.useState([
    { id: 1, text: "Draft outline", completed: true },
    { id: 2, text: "Gather references", completed: false },
    { id: 3, text: "Write introduction", completed: false },
  ]);

  const handleTitleBlur = async () => {
    if (title === task.title) return;
    try {
      await updateTask(task.id, { title });
      toast.success("Title updated");
    } catch {
      toast.error("Failed to update title");
    }
  };

  const handleDescriptionBlur = async () => {
    if (description === (task.description || "")) return;
    try {
      await updateTask(task.id, { description });
      toast.success("Description saved");
    } catch {
      toast.error("Failed to save description");
    }
  };

  const toggleSubtask = (id: number) => {
    setSubtasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  };

  return (
    <div className="flex flex-col h-full space-y-8 max-w-3xl">
      {/* Title */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
      />

      {/* Description */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Description
        </h3>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          placeholder="Add a description..."
        />
      </div>

      {/* Subtasks (Mock) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Subtasks
          </h3>
        </div>
        <div className="space-y-2">
          {subtasks.map((st) => (
            <div key={st.id} className="flex items-center gap-3 group">
              <div className="opacity-0 group-hover:opacity-100 cursor-grab text-muted-foreground">
                <GripVertical className="h-4 w-4" />
              </div>
              <Checkbox
                checked={st.completed}
                onCheckedChange={() => toggleSubtask(st.id)}
              />
              <span
                className={`flex-1 text-sm ${
                  st.completed ? "line-through text-muted-foreground" : ""
                }`}
              >
                {st.text}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-3 pl-7 text-muted-foreground hover:text-foreground cursor-pointer">
            <Plus className="h-4 w-4" />
            <span className="text-sm">Add subtask</span>
          </div>
        </div>
      </div>
    </div>
  );
}
