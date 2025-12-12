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
  getPaginationRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  useReactTable,
  GroupingState,
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
import { useHotkeys } from "react-hotkeys-hook";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [grouping, setGrouping] = React.useState<GroupingState>([]);
  const [focusedRowIndex, setFocusedRowIndex] = React.useState<number | null>(
    null,
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGroupingChange: setGrouping,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      grouping,
    },
  });

  // Keyboard navigation
  // Note: Wrapped callbacks in useEffect not strictly necessary for useHotkeys but ensures stability
  useHotkeys(
    "down",
    (e) => {
      e.preventDefault();
      setFocusedRowIndex((prev) => {
        const rowCount = table.getRowModel().rows.length;
        if (rowCount === 0) return null;
        const next = prev === null ? 0 : Math.min(prev + 1, rowCount - 1);
        return next;
      });
    },
    { enableOnFormTags: false, preventDefault: true },
  );

  useHotkeys(
    "up",
    (e) => {
      e.preventDefault();
      setFocusedRowIndex((prev) => {
        const rowCount = table.getRowModel().rows.length;
        if (rowCount === 0) return null;
        const next = prev === null ? 0 : Math.max(prev - 1, 0);
        return next;
      });
    },
    { enableOnFormTags: false, preventDefault: true },
  );

  useHotkeys(
    "space",
    (e) => {
      e.preventDefault();
      if (focusedRowIndex !== null) {
        const rows = table.getRowModel().rows;
        if (rows && rows[focusedRowIndex]) {
          const row = rows[focusedRowIndex];
          if (row.getIsGrouped()) {
            row.toggleExpanded();
          } else {
            row.toggleSelected();
          }
        }
      }
    },
    { preventDefault: true },
  );

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
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Filter tasks..."
            value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("title")?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />

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
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={
                    focusedRowIndex === index
                      ? "bg-muted/50! transition-colors"
                      : "transition-colors"
                  }
                  onClick={() => setFocusedRowIndex(index)}
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
