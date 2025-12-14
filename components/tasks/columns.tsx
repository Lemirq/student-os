"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Task, Course, GradeWeight, TaskStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format, isToday } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTaskActions } from "./hooks/use-task-actions";
import { DataTableColumnHeader } from "./data-table-column-header";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export type TaskWithDetails = Task & {
  course: Course | null;
  grade_weight: GradeWeight | null;
};

const StatusCell = ({ task }: { task: Task }) => {
  const { setStatus } = useTaskActions();
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
      return value.includes(row.getValue(id));
    },
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
      return value.includes(row.getValue(id));
    },
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
    size: 150,
    minSize: 100,
    maxSize: 250,
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Due Date" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("dueDate") as string | null;
      if (!date) return <span className="text-muted-foreground">-</span>;

      const due = new Date(date);
      const isOverdue = due < new Date() && !isToday(due);
      const isDueToday = isToday(due);

      return (
        <div
          className={
            isOverdue
              ? "text-red-500 font-bold"
              : isDueToday
                ? "text-orange-500 font-bold"
                : "text-muted-foreground"
          }
        >
          {format(due, "MMM d")}
        </div>
      );
    },
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
    size: 100,
    minSize: 80,
    maxSize: 150,
  },
];
