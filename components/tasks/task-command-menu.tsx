"use client";

import * as React from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  CalendarIcon,
  CheckCircle,
  Circle,
  ArrowUpCircle,
  Clock,
  BookOpen,
  Trash2,
} from "lucide-react";
import { Task } from "@/types";
import { updateTask, deleteTask } from "@/actions/tasks";
import { toast } from "sonner";
import { getAllCourses } from "@/actions/get-course-data";
import { Course } from "@/types";
import { useCommandStore } from "@/hooks/use-command-store";

export function TaskCommandMenu() {
  const { isOpen, tasks, close } = useCommandStore();
  const [courses, setCourses] = React.useState<Course[]>([]);

  React.useEffect(() => {
    getAllCourses().then(setCourses);
  }, []);

  const handleUpdate = React.useCallback(
    async (update: Partial<Task> & { dueDate?: Date }) => {
      if (!tasks || tasks.length === 0) {
        console.error("No tasks selected for update");
        return;
      }

      try {
        // Mapping Task fields to updateTask schema (snake_case)
        const payload: Parameters<typeof updateTask>[1] = {};

        if (update.status)
          payload.status = update.status as "Todo" | "In Progress" | "Done";
        if (update.priority)
          payload.priority = update.priority as "Low" | "Medium" | "High";
        if (update.courseId) payload.course_id = update.courseId;
        if (update.dueDate) payload.due_date = update.dueDate.toISOString();

        // Update all selected tasks
        await Promise.all(
          tasks.map((task) => {
            if (!task.id) return Promise.resolve();
            return updateTask(task.id, payload);
          }),
        );

        toast.success(
          tasks.length === 1 ? "Task updated" : `${tasks.length} tasks updated`,
        );
        close();
      } catch (error) {
        console.error("Error updating task:", error);
        toast.error("Failed to update task(s)");
      }
    },
    [tasks, close],
  );

  const handleDelete = React.useCallback(async () => {
    if (!tasks || tasks.length === 0) return;

    try {
      await Promise.all(
        tasks.map((task) => {
          if (!task.id) return Promise.resolve();
          return deleteTask(task.id);
        }),
      );
      toast.success(
        tasks.length === 1 ? "Task deleted" : `${tasks.length} tasks deleted`,
      );
      close();

      // If we are on a task detail page and that task was deleted, redirect
      // Assuming tasks[0] is the main one if length is 1
      if (tasks.length === 1 && tasks[0].courseId) {
        // This logic is a bit implicit, usually we'd check current pathname
        // but for now let's leave router push logic minimal or remove it if not needed globally.
        // The original code redirected. Let's keep it safe.
        // router.push(tasks[0].courseId ? `/courses/${tasks[0].courseId}` : "/dashboard");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task(s)");
    }
  }, [tasks, close]);

  return (
    <CommandDialog open={isOpen} onOpenChange={(val) => !val && close()}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Status">
          <CommandItem onSelect={() => handleUpdate({ status: "Todo" })}>
            <Circle className="mr-2 h-4 w-4" />
            Set to Todo
          </CommandItem>
          <CommandItem onSelect={() => handleUpdate({ status: "In Progress" })}>
            <Clock className="mr-2 h-4 w-4" />
            Set to In Progress
          </CommandItem>
          <CommandItem onSelect={() => handleUpdate({ status: "Done" })}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Set to Done
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Priority">
          <CommandItem onSelect={() => handleUpdate({ priority: "High" })}>
            <ArrowUpCircle className="mr-2 h-4 w-4 text-red-500" />
            Set Priority High
          </CommandItem>
          <CommandItem onSelect={() => handleUpdate({ priority: "Medium" })}>
            <ArrowUpCircle className="mr-2 h-4 w-4 text-yellow-500" />
            Set Priority Medium
          </CommandItem>
          <CommandItem onSelect={() => handleUpdate({ priority: "Low" })}>
            <ArrowUpCircle className="mr-2 h-4 w-4 text-blue-500" />
            Set Priority Low
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Course">
          {courses.map((course) => (
            <CommandItem
              key={course.id}
              onSelect={() => handleUpdate({ courseId: course.id })}
            >
              <BookOpen
                className="mr-2 h-4 w-4"
                style={{ color: course.color || undefined }}
              />
              Move to {course.code}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Due Date">
          <CommandItem
            onSelect={() => {
              const today = new Date();
              handleUpdate({ dueDate: today });
            }}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            Due Today
          </CommandItem>
          <CommandItem
            onSelect={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              handleUpdate({ dueDate: tomorrow });
            }}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            Due Tomorrow
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Danger Zone">
          <CommandItem
            onSelect={handleDelete}
            className="text-red-500 aria-selected:text-red-500"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Task
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
