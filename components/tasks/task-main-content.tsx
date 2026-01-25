"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { getTask } from "@/actions/tasks";
import { toast } from "sonner";
import { useTaskMutations } from "@/hooks/use-task-mutations";
import { Check } from "lucide-react";
import { TipTapEditor } from "@/components/editor/tiptap-editor";
import { useDebounce } from "@/hooks/use-debounce";
import { TaskProperties } from "@/components/tasks/task-properties";

type TaskWithRelations = NonNullable<Awaited<ReturnType<typeof getTask>>>;

interface TaskMainContentProps {
  task: TaskWithRelations;
  onSaveRef?: (saveFn: () => Promise<void>) => void;
  onTaskUpdate?: (task: TaskWithRelations) => void;
}

export function TaskMainContent({
  task: initialTask,
  onSaveRef,
  onTaskUpdate,
}: TaskMainContentProps) {
  const { updateTaskGeneric } = useTaskMutations();
  const [task, setTask] = React.useState(initialTask);
  const [title, setTitle] = React.useState(initialTask.title);
  const [description, setDescription] = React.useState(
    initialTask.description || "",
  );
  const [notes, setNotes] = React.useState<unknown>(initialTask.notes || null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showSaved, setShowSaved] = React.useState(false);

  // Update local state when task prop changes
  React.useEffect(() => {
    // Only update if values have actually changed to prevent infinite loops
    if (initialTask.id !== task.id) {
      setTask(initialTask);
      setTitle(initialTask.title);
      setDescription(initialTask.description || "");
      setNotes(initialTask.notes || null);
      lastSavedNotes.current = initialTask.notes;
    } else {
      // For the same task, only update if the values are different
      if (initialTask.title !== title) {
        setTitle(initialTask.title);
      }
      if ((initialTask.description || "") !== description) {
        setDescription(initialTask.description || "");
      }
      // Only update notes if they're different from what we last saved
      // This prevents the refetch from overwriting local changes
      if (
        JSON.stringify(initialTask.notes) !==
          JSON.stringify(lastSavedNotes.current) &&
        JSON.stringify(initialTask.notes) !== JSON.stringify(notes)
      ) {
        setNotes(initialTask.notes || null);
        lastSavedNotes.current = initialTask.notes;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialTask.id,
    initialTask.title,
    initialTask.description,
    initialTask.notes,
  ]);

  const debouncedNotes = useDebounce(notes, 2000);

  // Track the last saved value to prevent duplicate saves
  const lastSavedNotes = React.useRef<unknown>(initialTask.notes);

  const handleTitleBlur = async () => {
    if (title === task.title) return;
    try {
      await updateTaskGeneric(task.id, { title });
      // Update local task state
      const updatedTask = { ...task, title };
      setTask(updatedTask);
      onTaskUpdate?.(updatedTask);
    } catch (error) {
      console.error("Failed to update title:", error);
    }
  };

  const handleDescriptionBlur = async () => {
    if (description === (task.description || "")) return;
    try {
      await updateTaskGeneric(task.id, { description });
      // Update local task state
      const updatedTask = { ...task, description };
      setTask(updatedTask);
      onTaskUpdate?.(updatedTask);
    } catch (error) {
      console.error("Failed to update description:", error);
    }
  };

  // Save all pending changes
  const saveAllPending = React.useCallback(async () => {
    const updates: Array<Promise<void>> = [];

    // Save title if changed
    if (title !== task.title) {
      updates.push(
        updateTaskGeneric(task.id, { title }).then(() => {
          const updatedTask = { ...task, title };
          setTask(updatedTask);
          onTaskUpdate?.(updatedTask);
        }),
      );
    }

    // Save description if changed
    if (description !== (task.description || "")) {
      updates.push(
        updateTaskGeneric(task.id, { description }).then(() => {
          const updatedTask = { ...task, description };
          setTask(updatedTask);
          onTaskUpdate?.(updatedTask);
        }),
      );
    }

    // Save notes if changed (and not already saved)
    if (
      JSON.stringify(notes) !== JSON.stringify(lastSavedNotes.current) &&
      JSON.stringify(notes) !== JSON.stringify(debouncedNotes)
    ) {
      updates.push(
        updateTaskGeneric(task.id, { notes }).then(() => {
          lastSavedNotes.current = notes;
        }),
      );
    }

    await Promise.all(updates);
  }, [
    title,
    description,
    notes,
    task,
    updateTaskGeneric,
    onTaskUpdate,
    debouncedNotes,
  ]);

  // Expose save function to parent
  React.useEffect(() => {
    if (onSaveRef) {
      onSaveRef(saveAllPending);
    }
  }, [onSaveRef, saveAllPending]);

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
        await updateTaskGeneric(task.id, { notes: debouncedNotes });
        lastSavedNotes.current = debouncedNotes;
        // Update local task state
        const updatedTask = { ...task, notes: debouncedNotes };
        setTask(updatedTask);
        onTaskUpdate?.(updatedTask);
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
      } catch {
        toast.error("Failed to save notes");
      } finally {
        setIsSaving(false);
      }
    };

    saveNotes();
  }, [debouncedNotes, task.id, updateTaskGeneric, task, onTaskUpdate]);

  return (
    <div className="flex flex-col space-y-6">
      {/* Title */}
      <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
        <label className="text-sm font-medium text-foreground">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
        />
      </div>

      {/* Description */}
      <div className="grid grid-cols-[120px_1fr] gap-4 items-start">
        <label className="text-sm font-medium text-foreground pt-2">
          Description
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          placeholder="Add a description..."
          className="min-h-[100px]"
        />
      </div>

      {/* Properties Section */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-foreground">Properties</h3>
        </div>
        <TaskProperties task={task} />
      </div>

      {/* Notes / Scratchpad */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Notes</label>
            <p className="text-xs text-muted-foreground">Rich text notes</p>
          </div>
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
        <div className="border rounded-md">
          <TipTapEditor initialContent={notes} onChange={setNotes} />
        </div>
      </div>
    </div>
  );
}
