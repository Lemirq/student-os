"use client";

import * as React from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CalendarIcon,
  CheckCircle,
  Circle,
  ArrowUpCircle,
  Clock,
  BookOpen,
  Trash2,
  Calculator,
  ArrowLeft,
  Check,
  Tag,
  X,
} from "lucide-react";
import { Task, GradeWeight } from "@/types";
import { updateTask, deleteTask } from "@/actions/tasks";
import { toast } from "sonner";
import { getAllCourses } from "@/actions/get-course-data";
import { getGradeWeightsForCourses } from "@/actions/courses";
import { Course } from "@/types";
import { useCommandStore } from "@/hooks/use-command-store";

export function TaskCommandMenu() {
  const { isOpen, tasks, close, view, setView } = useCommandStore();
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [gradeWeights, setGradeWeights] = React.useState<GradeWeight[]>([]);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    getAllCourses().then(setCourses);
  }, []);

  // Fetch grade weights based on selected tasks' courses
  React.useEffect(() => {
    if (!tasks || tasks.length === 0) {
      setGradeWeights([]);
      return;
    }

    // Get unique course IDs from selected tasks
    const uniqueCourseIds = Array.from(
      new Set(tasks.map((task) => task.courseId).filter(Boolean)),
    ) as string[];

    if (uniqueCourseIds.length === 0) {
      setGradeWeights([]);
      return;
    }

    // Fetch grade weights for these courses
    getGradeWeightsForCourses(uniqueCourseIds).then(setGradeWeights);
  }, [tasks]);

  // Reset search when view changes or dialog opens
  React.useEffect(() => {
    setSearch("");
  }, [view, isOpen]);

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
        if (update.gradeWeightId !== undefined)
          payload.grade_weight_id = update.gradeWeightId;
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

  const handleScoreUpdate = React.useCallback(
    async (value: string) => {
      if (!tasks || tasks.length === 0) return;

      const parts = value.split("/");
      const received = parseFloat(parts[0]);
      const max = parts.length > 1 ? parseFloat(parts[1]) : undefined;

      if (isNaN(received)) {
        toast.error("Invalid score value");
        return;
      }

      try {
        const payload: Parameters<typeof updateTask>[1] = {
          score_received: received,
          status: "Done",
        };
        if (max !== undefined && !isNaN(max)) {
          payload.score_max = max;
        }

        await Promise.all(
          tasks.map((task) => {
            if (!task.id) return Promise.resolve();
            return updateTask(task.id, payload);
          }),
        );

        toast.success("Score updated");
        close();
      } catch (error) {
        console.error("Error updating score:", error);
        toast.error("Failed to update score");
      }
    },
    [tasks, close],
  );

  const handleScoreRemove = React.useCallback(async () => {
    if (!tasks || tasks.length === 0) return;

    try {
      const payload: Parameters<typeof updateTask>[1] = {
        score_received: null,
        score_max: null,
      };

      await Promise.all(
        tasks.map((task) => {
          if (!task.id) return Promise.resolve();
          return updateTask(task.id, payload);
        }),
      );

      toast.success("Score removed");
      close();
    } catch (error) {
      console.error("Error removing score:", error);
      toast.error("Failed to remove score");
    }
  }, [tasks, close]);

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
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task(s)");
    }
  }, [tasks, close]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !search && view !== "MAIN") {
      e.preventDefault();
      setView("MAIN");
    }
  };

  const getPlaceholder = () => {
    if (view === "EDIT_SCORE") {
      return "Enter score (e.g. 95 or 95/100)...";
    }

    if (tasks.length === 1) {
      return `Action on "${tasks[0].title}"...`;
    } else if (tasks.length > 1) {
      return `Action on ${tasks.length} tasks...`;
    }

    return "Type a command or search...";
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(val) => {
        if (!val) close();
      }}
    >
      <DialogContent className="overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Task Command Menu</DialogTitle>
          <DialogDescription>
            Perform actions on selected tasks
          </DialogDescription>
        </DialogHeader>
        <Command
          shouldFilter={view !== "EDIT_SCORE"}
          className="**:[[cmdk-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-12 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 **:[[cmdk-input]]:h-12 **:[[cmdk-item]]:px-2 **:[[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
          onKeyDown={handleKeyDown}
        >
          <CommandInput
            placeholder={getPlaceholder()}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {view === "MAIN" && (
              <>
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Actions">
                  <CommandItem onSelect={() => setView("EDIT_SCORE")}>
                    <Calculator className="mr-2 h-4 w-4" />
                    Edit Score
                  </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Status">
                  <CommandItem
                    onSelect={() => handleUpdate({ status: "Todo" })}
                  >
                    <Circle className="mr-2 h-4 w-4" />
                    Set to Todo
                  </CommandItem>
                  <CommandItem
                    onSelect={() => handleUpdate({ status: "In Progress" })}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Set to In Progress
                  </CommandItem>
                  <CommandItem
                    onSelect={() => handleUpdate({ status: "Done" })}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Set to Done
                  </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Priority">
                  <CommandItem
                    onSelect={() => handleUpdate({ priority: "High" })}
                  >
                    <ArrowUpCircle className="mr-2 h-4 w-4 text-red-500" />
                    Set Priority High
                  </CommandItem>
                  <CommandItem
                    onSelect={() => handleUpdate({ priority: "Medium" })}
                  >
                    <ArrowUpCircle className="mr-2 h-4 w-4 text-yellow-500" />
                    Set Priority Medium
                  </CommandItem>
                  <CommandItem
                    onSelect={() => handleUpdate({ priority: "Low" })}
                  >
                    <ArrowUpCircle className="mr-2 h-4 w-4 text-blue-500" />
                    Set Priority Low
                  </CommandItem>
                </CommandGroup>

                <CommandSeparator />

                {gradeWeights.length > 0 && (
                  <>
                    <CommandGroup heading="Category">
                      {gradeWeights.map((weight) => {
                        const course = courses.find(
                          (c) => c.id === weight.courseId,
                        );
                        return (
                          <CommandItem
                            key={weight.id}
                            onSelect={() =>
                              handleUpdate({ gradeWeightId: weight.id })
                            }
                          >
                            <Tag className="mr-2 h-4 w-4" />
                            {weight.name}
                            {course && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({course.code})
                              </span>
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>

                    <CommandSeparator />
                  </>
                )}

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
              </>
            )}

            {view === "EDIT_SCORE" && (
              <CommandGroup heading="Score">
                {search.trim() !== "" && (
                  <CommandItem onSelect={() => handleScoreUpdate(search)}>
                    <Check className="mr-2 h-4 w-4" />
                    Set score to {search}
                  </CommandItem>
                )}
                <CommandItem
                  onSelect={handleScoreRemove}
                  className="text-red-500 aria-selected:text-red-500"
                >
                  <X className="mr-2 h-4 w-4" />
                  Remove Score
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setView("MAIN");
                    setSearch("");
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
