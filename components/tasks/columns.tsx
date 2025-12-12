"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Task } from "@/types";
import { Badge } from "@/components/ui/badge"; // Need to create or import Badge
import { Checkbox } from "@/components/ui/checkbox"; // Need to create or import Checkbox
import { format } from "date-fns";

// Placeholder for Badge if not exists, but usually Shadcn has it. I'll check/create it.
// Placeholder for Checkbox.

export const columns: ColumnDef<Task>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(!!e.target.checked)}
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
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <div
          className={`px-2 py-1 rounded-full text-xs font-semibold w-fit
          ${
            status === "Done"
              ? "bg-green-100 text-green-800"
              : status === "In Progress"
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-800"
          }`}
        >
          {status}
        </div>
      );
    },
  },
  {
    accessorKey: "priority",
    header: "Priority",
    cell: ({ row }) => {
      const priority = row.getValue("priority") as string;
      return (
        <div
          className={`text-xs ${priority === "High" ? "text-red-600 font-bold" : ""}`}
        >
          {priority}
        </div>
      );
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
