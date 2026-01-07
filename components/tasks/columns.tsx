"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Task, Course, GradeWeight, TaskStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  format,
  isToday,
  startOfDay,
  endOfDay,
  isWithinInterval,
  isPast,
} from "date-fns";
import { hasTime } from "@/lib/date-parser";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { useTaskMutations } from "@/hooks/use-task-mutations";
import { DataTableColumnHeader } from "./data-table-column-header";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { CalendarIcon, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import * as chrono from "chrono-node";

export type TaskWithDetails = Task & {
  course: Course | null;
  grade_weight: GradeWeight | null;
};

const StatusCell = ({ task }: { task: Task }) => {
  const { setStatus } = useTaskMutations();
  const status = task.status as TaskStatus;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-status-trigger
          className="outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full"
        >
          <Badge
            variant={
              status === "Done"
                ? "default"
                : status === "In Progress"
                  ? "secondary"
                  : "outline"
            }
            className={
              status === "Done"
                ? "bg-green-100 text-green-800 hover:bg-green-100/80 border-transparent shadow-none"
                : status === "In Progress"
                  ? "bg-blue-100 text-blue-800 hover:bg-blue-100/80 border-transparent shadow-none"
                  : "text-muted-foreground"
            }
          >
            {status}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => setStatus(task, "Todo")}>
          Todo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatus(task, "In Progress")}>
          In Progress
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setStatus(task, "Done")}>
          Done
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const DueDateCell = ({ task }: { task: Task }) => {
  const { setDueDate } = useTaskMutations();
  const [open, setOpen] = React.useState(false);

  const date = React.useMemo(
    () => (task.dueDate ? new Date(task.dueDate) : null),
    [task.dueDate],
  );
  const dateHasTime = date ? hasTime(date) : false;

  // Natural language input state
  const [inputValue, setInputValue] = React.useState("");

  // Sync input value when popover opens or date changes
  React.useEffect(() => {
    if (open && date) {
      const includeTime = hasTime(date);
      if (includeTime) {
        setInputValue(format(date, "MMM d, yyyy 'at' h:mm a"));
      } else {
        setInputValue(format(date, "MMM d, yyyy"));
      }
    } else if (open && !date) {
      setInputValue("");
    }
  }, [open, date]);

  // Overdue: compare full datetime, not just date
  // If no specific time is set (midnight), treat deadline as end of day (23:59:59)
  // A task is overdue if its due datetime is in the past AND task is not done
  const getEffectiveDeadline = (d: Date): Date => {
    if (!hasTime(d)) {
      // No specific time set, treat as end of day
      const endOfDayDate = new Date(d);
      endOfDayDate.setHours(23, 59, 59, 999);
      return endOfDayDate;
    }
    return d;
  };

  const effectiveDeadline = date ? getEffectiveDeadline(date) : null;
  const isOverdue =
    effectiveDeadline && isPast(effectiveDeadline) && task.status !== "Done";
  const isDueToday = date && isToday(date) && !isOverdue;

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      setDueDate(task, null);
      setOpen(false);
      return;
    }

    // Preserve existing time if the task already has one
    if (date && dateHasTime) {
      selectedDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
    }

    setDueDate(task, selectedDate);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Stop propagation for all keys to prevent table shortcuts from firing
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      applyNaturalDateInput();
    }
  };

  const handleInputBlur = () => {
    // Only apply if there's input - don't auto-clear on blur
    if (inputValue.trim()) {
      applyNaturalDateInput();
    }
  };

  const applyNaturalDateInput = () => {
    if (!inputValue.trim()) {
      return;
    }

    const parsed = chrono.parseDate(inputValue);
    if (parsed) {
      setDueDate(task, parsed);
      // Update input to show formatted result
      const includeTime = hasTime(parsed);
      if (includeTime) {
        setInputValue(format(parsed, "MMM d, yyyy 'at' h:mm a"));
      } else {
        setInputValue(format(parsed, "MMM d, yyyy"));
      }
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDueDate(task, null);
    setInputValue("");
    setOpen(false);
  };

  // Format display: show time if task has a specific time set
  const formatDisplay = () => {
    if (!date) return "No date";
    if (dateHasTime) {
      return format(date, "MMM d, h:mm a");
    }
    return format(date, "MMM d");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full"
        >
          <Badge
            variant="outline"
            className={
              isOverdue
                ? "bg-red-100 text-red-800 hover:bg-red-100/80 border-transparent shadow-none"
                : isDueToday
                  ? " text-orange-500 border-orange-500 shadow-none"
                  : "text-muted-foreground"
            }
          >
            <CalendarIcon className="h-3 w-3 mr-1" />
            {formatDisplay()}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-2 border-b flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Due Date</span>
          {date && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={handleClear}
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
        <div className="p-2 border-b">
          <Input
            type="text"
            placeholder="e.g. tomorrow at 5pm"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            className="w-full text-sm"
          />
        </div>
        <Calendar
          mode="single"
          selected={date || undefined}
          defaultMonth={date || undefined}
          onSelect={handleDateSelect}
        />
      </PopoverContent>
    </Popover>
  );
};

export const columns: ColumnDef<TaskWithDetails>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 50,
    minSize: 50,
    maxSize: 50,
    enableResizing: false,
  },
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Title" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("title")}</div>
    ),
    meta: { label: "Title" },
    size: 300,
    minSize: 150,
    maxSize: 600,
  },
  {
    id: "course",
    accessorFn: (row) => row.course?.code,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Course" />
    ),
    cell: ({ row }) => {
      const course = row.original.course;
      return course ? (
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: course.color || "#000" }}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{course.code}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{course.name}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      ) : null;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
    meta: { label: "Course" },
    size: 120,
    minSize: 80,
    maxSize: 200,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => <StatusCell task={row.original} />,
    filterFn: (row, id, value) => {
      const rowValue = row.getValue(id);
      const result = value.includes(rowValue);
      console.log(
        `[Filter:status] Row value: "${rowValue}", Filter: [${value}], Result: ${result}`,
      );
      return result;
    },
    meta: { label: "Status" },
    size: 130,
    minSize: 100,
    maxSize: 200,
  },
  {
    accessorKey: "priority",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Priority" />
    ),
    cell: ({ row }) => {
      const priority = row.getValue("priority") as string;
      return (
        <div
          className={`text-xs font-medium ${
            priority === "High"
              ? "text-red-600"
              : priority === "Medium"
                ? "text-yellow-600"
                : "text-muted-foreground"
          }`}
        >
          {priority}
        </div>
      );
    },
    filterFn: (row, id, value) => {
      const rowValue = row.getValue(id);
      const result = value.includes(rowValue);
      console.log(
        `[Filter:priority] Row value: "${rowValue}", Filter: [${value}], Result: ${result}`,
      );
      return result;
    },
    meta: { label: "Priority" },
    size: 100,
    minSize: 80,
    maxSize: 150,
  },
  {
    accessorKey: "grade_weight",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Category" />
    ),
    cell: ({ row }) => {
      const gw = row.original.grade_weight;
      return gw ? (
        <span className="text-muted-foreground text-sm">{gw.name}</span>
      ) : null;
    },
    meta: { label: "Category" },
    size: 150,
    minSize: 100,
    maxSize: 250,
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Due Date" />
    ),
    cell: ({ row }) => <DueDateCell task={row.original} />,
    filterFn: (row, id, filterValue) => {
      // Support date range filtering
      if (
        filterValue &&
        typeof filterValue === "object" &&
        ("from" in filterValue || "to" in filterValue)
      ) {
        const rowValue = row.getValue(id) as string | null;
        if (!rowValue) {
          console.log(`[Filter:dueDate] No date value, excluding row`);
          return false;
        }

        const date = startOfDay(new Date(rowValue));
        const { from, to } = filterValue as { from?: Date; to?: Date };

        console.log(
          `[Filter:dueDate] Processing row:`,
          `rowValue="${rowValue}"`,
          `parsedDate=${date.toISOString()}`,
          `localDate=${date.toDateString()}`,
          `filter.from=${from?.toISOString() || "undefined"}`,
          `filter.to=${to?.toISOString() || "undefined"}`,
        );

        let result = true;
        if (from && to) {
          result = isWithinInterval(date, {
            start: startOfDay(from),
            end: endOfDay(to),
          });
        } else if (from) {
          result = date >= startOfDay(from);
        } else if (to) {
          result = date <= endOfDay(to);
        }

        console.log(
          `[Filter:dueDate] Row date: ${rowValue}, Range: ${from?.toDateString()} - ${to?.toDateString()}, Result: ${result}`,
        );
        return result;
      }
      return true;
    },
    meta: { label: "Due Date" },
    size: 110,
    minSize: 90,
    maxSize: 150,
  },
  {
    accessorKey: "doDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Do Date" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("doDate") as string | null;
      if (!date) return <span className="text-muted-foreground">-</span>;
      return (
        <span className="text-muted-foreground">
          {format(new Date(date), "MMM d")}
        </span>
      );
    },
    meta: { label: "Do Date" },
    size: 110,
    minSize: 90,
    maxSize: 150,
  },
  {
    accessorKey: "scoreReceived",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Score" />
    ),
    cell: ({ row }) => {
      const score = row.getValue("scoreReceived") as string | null;
      const max = row.original.scoreMax;

      if (score === null || score === undefined)
        return <span className="text-muted-foreground">-</span>;

      const scoreFloat = parseFloat(score);
      const maxFloat = parseFloat(max?.toString() || "100");

      if (maxFloat === 0)
        return <span className="text-muted-foreground">-</span>;

      const percentage = (scoreFloat / maxFloat) * 100;

      return (
        <span className="text-muted-foreground">{percentage.toFixed(2)}%</span>
      );
    },
    meta: { label: "Score" },
    size: 100,
    minSize: 80,
    maxSize: 150,
  },
];
