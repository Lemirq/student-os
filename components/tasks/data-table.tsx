"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  useReactTable,
  GroupingState,
  Row,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react";
import { useTaskActions } from "./hooks/use-task-actions";
import { useCommandStore } from "@/hooks/use-command-store";
import { Task } from "@/types";
import { useRouter } from "next/navigation";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  storageKey?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  storageKey,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [grouping, setGrouping] = React.useState<GroupingState>([]);

  // Track the last focused row index to help with range selection
  const lastFocusedIndexRef = React.useRef<number | null>(null);

  const { removeTask } = useTaskActions();
  const { open } = useCommandStore();
  const router = useRouter();

  const [hasMounted, setHasMounted] = React.useState(false);

  // Load state from local storage on mount
  React.useEffect(() => {
    if (storageKey) {
      try {
        const savedState = localStorage.getItem(storageKey);
        if (savedState) {
          const parsed = JSON.parse(savedState);
          // Only restore if valid
          if (Array.isArray(parsed.sorting)) setSorting(parsed.sorting);
          if (Array.isArray(parsed.columnFilters))
            setColumnFilters(parsed.columnFilters);
          if (
            typeof parsed.columnVisibility === "object" &&
            parsed.columnVisibility !== null
          )
            setColumnVisibility(parsed.columnVisibility);
          if (Array.isArray(parsed.grouping)) setGrouping(parsed.grouping);
        }
      } catch (e) {
        console.error("Failed to load table state from local storage", e);
      }
    }
    setHasMounted(true);
  }, [storageKey]);

  // Save state to local storage when changed
  React.useEffect(() => {
    if (!storageKey || !hasMounted) return;

    const stateToSave = {
      sorting,
      columnFilters,
      columnVisibility,
      grouping,
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    } catch (e) {
      console.error("Failed to save table state to local storage", e);
    }
  }, [
    sorting,
    columnFilters,
    columnVisibility,
    grouping,
    storageKey,
    hasMounted,
  ]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGroupingChange: setGrouping,
    enableRowSelection: true,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      grouping,
    },
  });

  if (!hasMounted) {
    return null; // or a loading skeleton
  }

  const handleRowKeyDown = (
    e: React.KeyboardEvent<HTMLTableRowElement>,
    row: Row<TData>,
  ) => {
    const task = row.original as Task;
    const currentRowIndex = row.index;

    // Track focused row
    lastFocusedIndexRef.current = currentRowIndex;

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const nextRow = e.currentTarget.nextElementSibling as HTMLElement;
        if (nextRow) {
          nextRow.focus();

          // Handle Shift selection
          if (e.shiftKey) {
            const rows = table.getRowModel().rows;
            const nextRowIndex = currentRowIndex + 1;

            if (nextRowIndex < rows.length) {
              const nextRowObj = rows[nextRowIndex];
              // Toggle selection for the next row
              nextRowObj.toggleSelected(true);
              // Ensure current row is also selected if starting selection
              if (!row.getIsSelected()) {
                row.toggleSelected(true);
              }
            }
          }
        }
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prevRow = e.currentTarget.previousElementSibling as HTMLElement;
        if (prevRow) {
          prevRow.focus();

          // Handle Shift selection
          if (e.shiftKey) {
            const rows = table.getRowModel().rows;
            const prevRowIndex = currentRowIndex - 1;

            if (prevRowIndex >= 0) {
              const prevRowObj = rows[prevRowIndex];
              // Toggle selection for the prev row
              prevRowObj.toggleSelected(true);
              // Ensure current row is also selected
              if (!row.getIsSelected()) {
                row.toggleSelected(true);
              }
            }
          }
        }
        break;
      }
      case "Backspace":
      case "Delete":
        e.preventDefault();
        removeTask(task);
        break;
      case "k":
      case "K":
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();

          // If multiple rows are selected, pass them all
          const selectedRows = table.getSelectedRowModel().rows;
          if (selectedRows.length > 0) {
            const selectedTasks = selectedRows.map((r) => r.original as Task);
            // Ensure the currently focused task is included if it wasn't selected
            if (!selectedTasks.some((t) => t.id === task.id)) {
              selectedTasks.push(task);
            }
            open(selectedTasks);
          } else {
            open(task);
          }
        }
        break;
      case "Enter":
        e.preventDefault();
        router.push(`/tasks/${task.id}`);
        break;
      case "Escape":
        e.preventDefault();
        table.resetRowSelection();
        break;
      default:
        break;
    }
  };

  // Grouping options
  const groupByOptions = [
    { label: "None", value: [] },
    { label: "Course", value: ["course"] },
    { label: "Status", value: ["status"] },
    { label: "Priority", value: ["priority"] },
    { label: "Due Date", value: ["due_date"] },
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex mx-2 mt-4 flex-1 justify-between space-x-2">
          <Input
            placeholder="Filter tasks..."
            value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("title")?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto h-8 lg:flex"
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Group By
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[150px]">
                {groupByOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.label}
                    checked={
                      JSON.stringify(grouping) === JSON.stringify(option.value)
                    }
                    onCheckedChange={(checked) => {
                      if (checked) setGrouping(option.value as string[]);
                      else setGrouping([]);
                    }}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DataTableViewOptions table={table} />
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  id={(row.original as Task).id}
                  data-state={row.getIsSelected() && "selected"}
                  className="group outline-none focus:outline-none focus:ring-1 focus:ring-primary focus:bg-muted/50 transition-colors data-[state=selected]:bg-muted select-none focus:relative focus:z-10"
                  tabIndex={0}
                  onKeyDown={(e) => handleRowKeyDown(e, row)}
                  onClick={(e) => {
                    if (e.shiftKey) {
                      // Simple range selection could be implemented here if needed for mouse
                    } else if (e.metaKey || e.ctrlKey) {
                      row.toggleSelected();
                    } else {
                      // Optional: Clear selection on single click if not holding modifiers?
                      // For now, let's keep it simple.
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    router.push(`/tasks/${(row.original as Task).id}`);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (!row.getIsSelected()) {
                      table.resetRowSelection();
                      row.toggleSelected(true);
                      open(row.original as Task);
                    } else {
                      const selectedRows = table.getSelectedRowModel().rows;
                      const selectedTasks = selectedRows.map(
                        (r) => r.original as Task,
                      );
                      open(selectedTasks);
                    }
                  }}
                >
                  {row.getIsGrouped() ? (
                    // Group header row
                    <TableCell colSpan={columns.length}>
                      <div
                        className="flex items-center gap-2 cursor-pointer select-none"
                        onClick={row.getToggleExpandedHandler()}
                      >
                        {row.getIsExpanded() ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium">
                          {flexRender(
                            row.getVisibleCells()[0].column.columnDef.cell,
                            row.getVisibleCells()[0].getContext(),
                          )}{" "}
                          ({row.subRows.length})
                        </span>
                      </div>
                    </TableCell>
                  ) : (
                    // Normal row
                    row.getVisibleCells().map((cell) => {
                      if (cell.getIsGrouped()) return null;
                      return (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      );
                    })
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
