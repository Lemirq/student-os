"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { updateTask, getTask } from "@/actions/tasks";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { TipTapEditor } from "@/components/editor/tiptap-editor";
import { useDebounce } from "@/hooks/use-debounce";

type TaskWithRelations = NonNullable<Awaited<ReturnType<typeof getTask>>>;

interface TaskMainContentProps {
  task: TaskWithRelations;
}

export function TaskMainContent({ task }: TaskMainContentProps) {
  const [title, setTitle] = React.useState(task.title);
  const [description, setDescription] = React.useState(task.description || "");
  const [notes, setNotes] = React.useState<unknown>(task.notes || null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showSaved, setShowSaved] = React.useState(false);

  const debouncedNotes = useDebounce(notes, 2000);

  // Track the last saved value to prevent duplicate saves
  const lastSavedNotes = React.useRef<unknown>(task.notes);

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

  // Auto-save notes when debounced value changes
  React.useEffect(() => {
    const saveNotes = async () => {
      // Skip if notes haven't actually changed from last save
      if (
        JSON.stringify(debouncedNotes) ===
        JSON.stringify(lastSavedNotes.current)
      ) {
        return;
      }

      setIsSaving(true);
      try {
        await updateTask(task.id, { notes: debouncedNotes });
        lastSavedNotes.current = debouncedNotes;
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
      } catch {
        toast.error("Failed to save notes");
      } finally {
        setIsSaving(false);
      }
    };

    saveNotes();
  }, [debouncedNotes, task.id]);

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

      {/* Notes / Scratchpad */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Notes
          </h3>
          {(isSaving || showSaved) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {isSaving ? (
                <>
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">Saved</span>
                </>
              )}
            </div>
          )}
        </div>
        <TipTapEditor initialContent={notes} onChange={setNotes} />
      </div>
    </div>
  );
}
