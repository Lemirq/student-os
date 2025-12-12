"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Task, Course, GradeWeight } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

export type TaskWithDetails = Task & {
  course: Course | null;
  grade_weight: GradeWeight | null;
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
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("title")}</div>
    ),
  },
  {
    id: "course",
    accessorFn: (row) => row.course?.code,
    header: "Course",
    cell: ({ row }) => {
      const course = row.original.course;
      return course ? (
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: course.color || "#000" }}
          />
          <span>{course.code}</span>
        </div>
      ) : null;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge
          variant={
            status === "Done"
              ? "default" // or a success variant if available
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
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "priority",
    header: "Priority",
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
  },
  {
    accessorKey: "grade_weight",
    header: "Category",
    cell: ({ row }) => {
      const gw = row.original.grade_weight;
      return gw ? (
        <span className="text-muted-foreground text-sm">{gw.name}</span>
      ) : null;
    },
  },
  {
    accessorKey: "due_date",
    header: "Due Date",
    cell: ({ row }) => {
      const date = row.getValue("due_date") as string;
      if (!date) return <span className="text-muted-foreground">-</span>;
      return <div>{format(new Date(date), "MMM d, yyyy")}</div>;
    },
  },
];
