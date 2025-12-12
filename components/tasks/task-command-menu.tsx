"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Trash,
  Signal,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import * as chrono from "chrono-node";
import { format } from "date-fns";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useCommandStore } from "@/hooks/use-command-store";
import { updateTask, deleteTask } from "@/actions/tasks";
import { TaskStatus, TaskPriority } from "@/types";

export function TaskCommandMenu() {
  const router = useRouter();
  const { isOpen, tasks, view, close, setView } = useCommandStore();
  const [dueDateInput, setDueDateInput] = React.useState("");

  // Restore focus to the row when closed
  const lastTaskIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (isOpen && tasks.length > 0) {
      // Focus the first selected task
      lastTaskIdRef.current = tasks[0].id;
    } else if (!isOpen && lastTaskIdRef.current) {
      // Small timeout to allow Dialog to unmount and focus to return to body naturally first
      setTimeout(() => {
        const row = document.getElementById(lastTaskIdRef.current!);
        row?.focus();
      }, 10);
    }
  }, [isOpen, tasks]);

  // Reset view when closed
  React.useEffect(() => {
    if (!isOpen) {
      // delayed reset to avoid flickering
      const t = setTimeout(() => setView("MAIN"), 200);
      return () => clearTimeout(t);
    }
  }, [isOpen, setView]);

  const handleUpdateStatus = async (status: TaskStatus) => {
    if (tasks.length === 0) return;
    close();
    try {
      await Promise.all(tasks.map((t) => updateTask(t.id, { status })));
      toast.success(`Status updated to ${status} for ${tasks.length} task(s)`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleUpdatePriority = async (priority: TaskPriority) => {
    if (tasks.length === 0) return;
    close();
    try {
      await Promise.all(tasks.map((t) => updateTask(t.id, { priority })));
      toast.success(
        `Priority updated to ${priority} for ${tasks.length} task(s)`,
      );
    } catch (error) {
      toast.error("Failed to update priority");
    }
  };

  const handleDelete = async () => {
    if (tasks.length === 0) return;
    close();
    try {
      await Promise.all(tasks.map((t) => deleteTask(t.id)));
      toast.success(`${tasks.length} task(s) deleted`);
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  const handleDueDateSubmit = async (dateStr?: string) => {
    if (tasks.length === 0) return;

    const inputToParse = dateStr || dueDateInput;
    const parsedDate = chrono.parseDate(inputToParse);

    if (!parsedDate) {
      toast.error("Could not parse date");
      return;
    }

    close();
    setDueDateInput("");

    try {
      // Pass as ISO string
      await Promise.all(
        tasks.map((t) =>
          updateTask(t.id, { due_date: parsedDate.toISOString() }),
        ),
      );
      toast.success(
        `Due date set to ${format(parsedDate, "MMM d")} for ${tasks.length} task(s)`,
      );
    } catch (error) {
      toast.error("Failed to update due date");
    }
  };

  return (
    <CommandDialog open={isOpen} onOpenChange={(open) => !open && close()}>
      {view === "MAIN" && (
        <>
          <CommandInput
            key="main"
            autoFocus
            placeholder={
              tasks.length > 1
                ? `Type a command for ${tasks.length} tasks...`
                : "Type a command or search..."
            }
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => setView("STATUS")}>
                <Circle className="mr-2 h-4 w-4" />
                <span>Change Status...</span>
              </CommandItem>
              <CommandItem onSelect={() => setView("PRIORITY")}>
                <Signal className="mr-2 h-4 w-4" />
                <span>Change Priority...</span>
              </CommandItem>
              <CommandItem onSelect={() => setView("DUE_DATE")}>
                <Calendar className="mr-2 h-4 w-4" />
                <span>Change Due Date...</span>
              </CommandItem>
              <CommandItem onSelect={handleDelete} className="text-red-600">
                <Trash className="mr-2 h-4 w-4" />
                <span>Delete Task</span>
                <CommandShortcut>⌘⌫</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </>
      )}

      {view === "STATUS" && (
        <>
          <CommandInput key="status" autoFocus placeholder="Select status..." />
          <CommandList>
            <CommandGroup heading="Status">
              <CommandItem onSelect={() => handleUpdateStatus("Todo")}>
                <Circle className="mr-2 h-4 w-4" />
                <span>Todo</span>
              </CommandItem>
              <CommandItem onSelect={() => handleUpdateStatus("In Progress")}>
                <Clock className="mr-2 h-4 w-4 text-blue-500" />
                <span>In Progress</span>
              </CommandItem>
              <CommandItem onSelect={() => handleUpdateStatus("Done")}>
                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                <span>Done</span>
              </CommandItem>
            </CommandGroup>
            <CommandGroup>
              <CommandItem onSelect={() => setView("MAIN")}>
                <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                Back
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </>
      )}

      {view === "PRIORITY" && (
        <>
          <CommandInput
            key="priority"
            autoFocus
            placeholder="Select priority..."
          />
          <CommandList>
            <CommandGroup heading="Priority">
              <CommandItem onSelect={() => handleUpdatePriority("High")}>
                <Signal className="mr-2 h-4 w-4 text-red-500" />
                <span>High</span>
              </CommandItem>
              <CommandItem onSelect={() => handleUpdatePriority("Medium")}>
                <Signal className="mr-2 h-4 w-4 text-yellow-500" />
                <span>Medium</span>
              </CommandItem>
              <CommandItem onSelect={() => handleUpdatePriority("Low")}>
                <Signal className="mr-2 h-4 w-4 text-blue-500" />
                <span>Low</span>
              </CommandItem>
            </CommandGroup>
            <CommandGroup>
              <CommandItem onSelect={() => setView("MAIN")}>
                <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                Back
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </>
      )}

      {view === "DUE_DATE" && (
        <>
          <CommandInput
            key="duedate"
            autoFocus
            placeholder="Type a date (e.g. 'tomorrow', 'next friday')..."
            value={dueDateInput}
            onValueChange={setDueDateInput}
            onKeyDown={(e) => {
              if (e.key === "Enter" && dueDateInput) {
                handleDueDateSubmit();
              }
            }}
          />
          <CommandList>
            <CommandGroup heading="Suggestions">
              <CommandItem onSelect={() => handleDueDateSubmit("Today")}>
                <CalendarDays className="mr-2 h-4 w-4" />
                <span>Today</span>
              </CommandItem>
              <CommandItem onSelect={() => handleDueDateSubmit("Tomorrow")}>
                <CalendarDays className="mr-2 h-4 w-4" />
                <span>Tomorrow</span>
              </CommandItem>
              <CommandItem onSelect={() => handleDueDateSubmit("Next Week")}>
                <CalendarDays className="mr-2 h-4 w-4" />
                <span>Next Week</span>
              </CommandItem>
            </CommandGroup>
            <CommandGroup>
              <CommandItem onSelect={() => setView("MAIN")}>
                <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
                Back
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </>
      )}
    </CommandDialog>
  );
}
