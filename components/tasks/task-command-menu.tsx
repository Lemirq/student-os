"use client";

import * as React from "react";
import * as chrono from "chrono-node";
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
import { format } from "date-fns";

export function TaskCommandMenu() {
  const { isOpen, tasks, close, view, setView } = useCommandStore();
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [gradeWeights, setGradeWeights] = React.useState<GradeWeight[]>([]);
  const [search, setSearch] = React.useState("");
  const [parsedDate, setParsedDate] = React.useState<Date | null>(null);
  const [parsedScore, setParsedScore] = React.useState<string | null>(null);

  // Parse date from search input in real-time
  React.useEffect(() => {
    if (view === "MAIN" && search.trim()) {
      const date = chrono.parseDate(search);
      if (date) {
        date.setHours(12, 0, 0, 0);
        setParsedDate(date);
      } else {
        setParsedDate(null);
      }
    } else {
      setParsedDate(null);
    }
  }, [search, view]);

  // Parse score from search input in real-time
  React.useEffect(() => {
    if (view === "MAIN" && search.trim()) {
      // Check if input is purely numeric or a fraction (e.g., "95" or "95/100" or "4/5")
      const scorePattern = /^(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?$/;
      const match = search.trim().match(scorePattern);

      if (match) {
        setParsedScore(search.trim());
      } else {
        setParsedScore(null);
      }
    } else {
      setParsedScore(null);
    }
  }, [search, view]);

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
        if (update.courseId) payload.courseId = update.courseId;
        if (update.gradeWeightId !== undefined)
          payload.gradeWeightId = update.gradeWeightId;
        if (update.dueDate) payload.dueDate = update.dueDate;

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
          scoreReceived: String(received),
          status: "Done",
        };
        if (max !== undefined && !isNaN(max)) {
          payload.scoreMax = String(max);
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
        scoreReceived: null,
        scoreMax: null,
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

  const handleDueDateUpdate = React.useCallback(
    async (value: string) => {
      if (!tasks || tasks.length === 0) return;

      const parsedDate = chrono.parseDate(value);

      if (!parsedDate) {
        toast.error("Invalid date format");
        return;
      }

      // Set to noon to avoid timezone issues
      parsedDate.setHours(12, 0, 0, 0);

      try {
        const payload: Parameters<typeof updateTask>[1] = {
          dueDate: parsedDate,
        };

        await Promise.all(
          tasks.map((task) => {
            if (!task.id) return Promise.resolve();
            return updateTask(task.id, payload);
          }),
        );

        toast.success(`Due date set to ${format(parsedDate, "MMM d, yyyy")}`);
        close();
      } catch (error) {
        console.error("Error updating due date:", error);
        toast.error("Failed to update due date");
      }
    },
    [tasks, close],
  );

  const handleDueDateRemove = React.useCallback(async () => {
    if (!tasks || tasks.length === 0) return;

    try {
      const payload: Parameters<typeof updateTask>[1] = {
        dueDate: undefined,
      };

      await Promise.all(
        tasks.map((task) => {
          if (!task.id) return Promise.resolve();
          return updateTask(task.id, payload);
        }),
      );

      toast.success("Due date removed");
      close();
    } catch (error) {
      console.error("Error removing due date:", error);
      toast.error("Failed to remove due date");
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

    if (view === "EDIT_DUE_DATE") {
      return "Enter due date (e.g. tomorrow, next Friday, Dec 25)...";
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
          shouldFilter={
            view !== "EDIT_SCORE" &&
            view !== "EDIT_DUE_DATE" &&
            !parsedDate &&
            !parsedScore
          }
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

                {(parsedDate || parsedScore) && (
                  <>
                    <CommandGroup heading="Quick Action">
                      {parsedScore && (
                        <CommandItem
                          onSelect={() => handleScoreUpdate(parsedScore)}
                        >
                          <Calculator className="mr-2 h-4 w-4" />
                          Set score to {parsedScore}
                        </CommandItem>
                      )}
                      {parsedDate && (
                        <CommandItem
                          onSelect={() => handleUpdate({ dueDate: parsedDate })}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          Set due date to {format(parsedDate, "MMM d, yyyy")}
                        </CommandItem>
                      )}
                    </CommandGroup>
                    <CommandSeparator />
                  </>
                )}

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
                  <CommandItem onSelect={() => setView("EDIT_DUE_DATE")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Edit Due Date
                  </CommandItem>
                  <CommandItem
                    onSelect={() => {
                      const today = new Date();
                      today.setHours(12, 0, 0, 0);
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
                      tomorrow.setHours(12, 0, 0, 0);
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

            {view === "EDIT_DUE_DATE" && (
              <CommandGroup heading="Due Date">
                {search.trim() !== "" &&
                  (() => {
                    const parsedDate = chrono.parseDate(search);
                    return parsedDate ? (
                      <CommandItem onSelect={() => handleDueDateUpdate(search)}>
                        <Check className="mr-2 h-4 w-4" />
                        Set due date to {format(parsedDate, "MMM d, yyyy")}
                      </CommandItem>
                    ) : null;
                  })()}
                <CommandItem
                  onSelect={handleDueDateRemove}
                  className="text-red-500 aria-selected:text-red-500"
                >
                  <X className="mr-2 h-4 w-4" />
                  Remove Due Date
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
