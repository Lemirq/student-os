"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  ColumnOrderState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  useReactTable,
  GroupingState,
  Row,
  Header,
  ColumnFilter,
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
import {
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  X,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { useTaskActions } from "./hooks/use-task-actions";
import { useCommandStore } from "@/hooks/use-command-store";
import { Task } from "@/types";
import { useRouter } from "next/navigation";
import { DataTableViewOptions } from "./data-table-view-options";
import { DataTableAdvancedFilters } from "./data-table-advanced-filters";
import { useDebtStore } from "@/hooks/use-debt-store";
import { isBefore, startOfToday } from "date-fns";
import { AlertTriangle, TrendingUp } from "lucide-react";

interface DraggableTableHeaderProps<TData, TValue> {
  header: Header<TData, TValue>;
  isLastHeader: boolean;
}

const DraggableTableHeader = <TData, TValue>({
  header,
  isLastHeader,
}: DraggableTableHeaderProps<TData, TValue>) => {
  const { attributes, isDragging, listeners, setNodeRef, transform } =
    useSortable({
      id: header.column.id,
    });

  const style = {
    opacity: isDragging ? 0.8 : 1,
    position: "relative" as const,
    transform: CSS.Translate.toString(transform),
    transition: "width transform 0.2s ease-in-out",
    whiteSpace: "nowrap" as const,
    width: isLastHeader ? "auto" : `${header.getSize()}px`,
    minWidth: `${header.getSize()}px`,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <TableHead ref={setNodeRef} style={style}>
      <div className="flex items-center gap-2 py-2 pr-4">
        <div
          className="cursor-move flex items-center"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
        </div>
        <div className="flex-1 min-w-0">
          {header.isPlaceholder
            ? null
            : flexRender(header.column.columnDef.header, header.getContext())}
        </div>
      </div>
      {header.column.getCanResize() && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={`absolute top-0 right-0 h-full w-px cursor-col-resize select-none touch-none bg-border opacity-100 hover:opacity-100 transition-opacity ${
            header.column.getIsResizing() ? "opacity-100 bg-primary" : ""
          }`}
          style={{ pointerEvents: "auto" }}
        >
          {/* <div className="absolute top-1/2 right-0 -translate-y-1/2 -translate-x-1/2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div> */}
        </div>
      )}
    </TableHead>
  );
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  storageKey?: string;
  viewToggle?: React.ReactNode;
  externalDateFilter?: { from: Date | undefined; to: Date | undefined };
  onDateFilterChange?: (range: {
    from: Date | undefined;
    to: Date | undefined;
  }) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  storageKey,
  viewToggle,
  externalDateFilter,
  onDateFilterChange,
}: DataTableProps<TData, TValue>) {
  const { isRepaymentMode, toggleRepaymentMode } = useDebtStore();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [grouping, setGrouping] = React.useState<GroupingState>([]);
  const [columnSizing, setColumnSizing] = React.useState({});
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([]);

  // Track the last clicked/focused row ID to help with range selection
  const lastClickedRowIdRef = React.useRef<string | null>(null);

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

          // Filter out invalid filters:
          // 1. dueDate filters with function values (they don't serialize properly)
          // 2. Filters with empty array values (they filter out everything)
          if (Array.isArray(parsed.columnFilters)) {
            const validFilters = parsed.columnFilters.filter(
              (filter: ColumnFilter) => {
                // Skip dueDate filters
                if (filter.id === "dueDate") return false;

                // Skip filters with empty arrays
                if (Array.isArray(filter.value) && filter.value.length === 0) {
                  return false;
                }

                return true;
              },
            );
            console.log(
              "[DataTable] Loading filters from localStorage:",
              validFilters,
            );
            setColumnFilters(validFilters);
          }

          if (
            typeof parsed.columnVisibility === "object" &&
            parsed.columnVisibility !== null
          )
            setColumnVisibility(parsed.columnVisibility);
          if (Array.isArray(parsed.grouping)) setGrouping(parsed.grouping);
          if (
            typeof parsed.columnSizing === "object" &&
            parsed.columnSizing !== null
          )
            setColumnSizing(parsed.columnSizing);
          if (Array.isArray(parsed.columnOrder))
            setColumnOrder(parsed.columnOrder);
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

    // Filter out invalid filters before saving:
    // 1. dueDate column filters (they use functions which don't serialize)
    // 2. Filters with empty arrays (they're useless and cause issues)
    const serializableFilters = columnFilters.filter((filter) => {
      // Skip dueDate filters
      if (filter.id === "dueDate") return false;

      // Skip empty array filters
      if (Array.isArray(filter.value) && filter.value.length === 0) {
        return false;
      }

      return true;
    });

    const stateToSave = {
      sorting,
      columnFilters: serializableFilters,
      columnVisibility,
      grouping,
      columnSizing,
      columnOrder,
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
    columnSizing,
    columnOrder,
    storageKey,
    hasMounted,
  ]);

  // Debug: Log filter state changes
  React.useEffect(() => {
    console.log("[DataTable] Column filters changed:", columnFilters);
  }, [columnFilters]);

  // Debug: Log data changes
  React.useEffect(() => {
    console.log("[DataTable] Data changed, count:", data.length);
  }, [data]);

  // Repayment Mode Filtering
  const filteredData = React.useMemo(() => {
    if (!isRepaymentMode) return data;

    const today = startOfToday();
    return data.filter((row: TData) => {
      const task = row as Task;
      if (task.status === "Done") return false;
      const dateToCheck = task.doDate || task.dueDate;
      if (!dateToCheck) return false;
      const date =
        dateToCheck instanceof Date ? dateToCheck : new Date(dateToCheck);
      return isBefore(date, today);
    });
  }, [data, isRepaymentMode]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGroupingChange: setGrouping,
    onColumnSizingChange: setColumnSizing,
    onColumnOrderChange: setColumnOrder,
    enableRowSelection: true,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      grouping,
      columnSizing,
      columnOrder,
    },
  });

  // Re-create table instance with filtered data if mode is active
  // This is a bit heavy but ensures consistency.
  // IMPORTANT: We need to use `filteredData` in `useReactTable`.
  // So I'll modify the `useReactTable` call below to use `filteredData`.
  // Wait, I can't easily modify code in the middle of a block with multi_replace if I don't target it.
  // I will just use `filteredData` in the implementation below.

  // NOTE: I am not modifying the useReactTable call in THIS chunk, I will do it in the next chunk or assume I can rewrite it.
  // Actually, I can just rewrite the `useReactTable` block.

  // Let's rewrite the `useReactTable` block.

  // Debug: Log row counts
  React.useEffect(() => {
    const filteredRows = table.getRowModel().rows.length;
    const coreRows = table.getCoreRowModel().rows.length;
    console.log(
      `[DataTable] Rows - Core: ${coreRows}, Filtered: ${filteredRows}`,
    );

    if (filteredRows === 0 && coreRows > 0) {
      console.warn(
        "[DataTable] ⚠️ All rows filtered out! Active filters:",
        columnFilters,
      );
    }
  }, [table, columnFilters]);

  // Set up drag and drop sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  // Handle column reorder on drag end
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setColumnOrder((columnOrder) => {
        const oldIndex = columnOrder.indexOf(active.id as string);
        const newIndex = columnOrder.indexOf(over.id as string);

        // If columns aren't in the order array yet, use the current order
        if (oldIndex === -1 || newIndex === -1) {
          const currentOrder = table.getAllLeafColumns().map((c) => c.id);
          const oldIdx = currentOrder.indexOf(active.id as string);
          const newIdx = currentOrder.indexOf(over.id as string);

          const reordered = [...currentOrder];
          reordered.splice(newIdx, 0, reordered.splice(oldIdx, 1)[0]);
          return reordered;
        }

        // Reorder using splice
        const reordered = [...columnOrder];
        reordered.splice(newIndex, 0, reordered.splice(oldIndex, 1)[0]);
        return reordered;
      });
    }
  }

  if (!hasMounted) {
    return null; // or a loading skeleton
  }

  const handleRowKeyDown = (
    e: React.KeyboardEvent<HTMLTableRowElement>,
    row: Row<TData>,
  ) => {
    const task = row.original as Task;

    // Track focused row for keyboard navigation (store row ID, not index)
    lastClickedRowIdRef.current = row.id;

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        const nextRow = e.currentTarget.nextElementSibling as HTMLElement;
        if (nextRow) {
          // Handle Shift selection BEFORE moving focus
          if (e.shiftKey) {
            // Use the sorted/filtered row model, not the original indices
            const rows = table.getRowModel().rows;
            // Find current row's position in the sorted/filtered list
            const visualIndex = rows.findIndex((r) => r.id === row.id);
            const nextVisualIndex = visualIndex + 1;

            if (nextVisualIndex < rows.length) {
              // Ensure current row is selected first
              if (!row.getIsSelected()) {
                row.toggleSelected(true);
              }

              // Then select the next row (using the visual/sorted index)
              const nextRowObj = rows[nextVisualIndex];
              nextRowObj.toggleSelected(true);
            }
          }

          // Move focus after selection logic
          nextRow.focus();
        }
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        const prevRow = e.currentTarget.previousElementSibling as HTMLElement;
        if (prevRow) {
          // Handle Shift selection BEFORE moving focus
          if (e.shiftKey) {
            // Deselect the current row when moving up (contracting selection)
            if (row.getIsSelected()) {
              row.toggleSelected(false);
            }
          }

          // Move focus after selection logic
          prevRow.focus();
        }
        break;
      }
      case "Backspace":
      case "Delete":
        e.preventDefault();
        // If multiple rows are selected, delete them all
        const selectedRows = table.getSelectedRowModel().rows;
        if (selectedRows.length > 0) {
          const selectedTasks = selectedRows.map((r) => r.original as Task);
          // Ensure the currently focused task is included if it wasn't selected
          if (!selectedTasks.some((t) => t.id === task.id)) {
            selectedTasks.push(task);
          }
          // Delete all selected tasks
          selectedTasks.forEach((t) => removeTask(t));
        } else {
          // Just delete the focused task
          removeTask(task);
        }
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
      case "d":
      case "D":
        if (e.shiftKey && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();

          // Get selected tasks or current task
          const selectedRows = table.getSelectedRowModel().rows;
          if (selectedRows.length > 0) {
            const selectedTasks = selectedRows.map((r) => r.original as Task);
            // Ensure the currently focused task is included if it wasn't selected
            if (!selectedTasks.some((t) => t.id === task.id)) {
              selectedTasks.push(task);
            }
            open(selectedTasks, "EDIT_DUE_DATE");
          } else {
            open(task, "EDIT_DUE_DATE");
          }
        }
        break;
      case "s":
      case "S":
        if (e.shiftKey && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();

          // Get selected tasks or current task
          const selectedRows = table.getSelectedRowModel().rows;
          if (selectedRows.length > 0) {
            const selectedTasks = selectedRows.map((r) => r.original as Task);
            // Ensure the currently focused task is included if it wasn't selected
            if (!selectedTasks.some((t) => t.id === task.id)) {
              selectedTasks.push(task);
            }
            open(selectedTasks, "EDIT_SCORE");
          } else {
            open(task, "EDIT_SCORE");
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
      {/* Repayment Mode Banner */}
      {isRepaymentMode && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center justify-between mb-4 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-full">
              <TrendingUp className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-red-500">
                Repayment Mode Active
              </h3>
              <p className="text-sm text-red-500/80">
                Focus on clearing your {filteredData.length} overdue tasks to
                restore your streak.
              </p>
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white border-none shadow-sm"
            onClick={toggleRepaymentMode}
          >
            Exit Mode
          </Button>
        </div>
      )}

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
            {sorting.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => setSorting([])}
              >
                <X className="mr-2 h-4 w-4" />
                Clear Sort
              </Button>
            )}
            {viewToggle}
            <DataTableAdvancedFilters
              table={table}
              externalDateFilter={externalDateFilter}
              onDateFilterChange={onDateFilterChange}
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
            <DataTableViewOptions table={table} />
          </div>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToHorizontalAxis]}
          onDragEnd={handleDragEnd}
          sensors={sensors}
        >
          <Table style={{ width: "100%", minWidth: table.getTotalSize() }}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  <SortableContext
                    items={headerGroup.headers.map((h) => h.column.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    {headerGroup.headers.map((header, index) => {
                      const isLastHeader =
                        index === headerGroup.headers.length - 1;
                      return (
                        <DraggableTableHeader
                          key={header.id}
                          header={header}
                          isLastHeader={isLastHeader}
                        />
                      );
                    })}
                  </SortableContext>
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
                        // Shift-click: Select range from last clicked row to current row
                        if (lastClickedRowIdRef.current !== null) {
                          // Use the sorted/filtered row model, not the original indices
                          const rows = table.getRowModel().rows;

                          // Find both rows' positions in the current sorted/filtered list
                          const currentIndex = rows.findIndex(
                            (r) => r.id === row.id,
                          );
                          const lastIndex = rows.findIndex(
                            (r) => r.id === lastClickedRowIdRef.current,
                          );

                          if (currentIndex !== -1 && lastIndex !== -1) {
                            // Calculate the range to select
                            const start = Math.min(currentIndex, lastIndex);
                            const end = Math.max(currentIndex, lastIndex);

                            // Select all rows in the range
                            for (let i = start; i <= end; i++) {
                              rows[i].toggleSelected(true);
                            }
                          }
                        } else {
                          // If no previous selection, just select this row
                          row.toggleSelected(true);
                        }
                        // Update last clicked row ID
                        lastClickedRowIdRef.current = row.id;
                      } else if (e.metaKey || e.ctrlKey) {
                        // Command/Ctrl-click: Toggle individual row selection
                        row.toggleSelected();
                        // Update last clicked row ID for future shift-clicks
                        lastClickedRowIdRef.current = row.id;
                      } else {
                        // Single click: Select only this row and clear others
                        table.resetRowSelection();
                        row.toggleSelected(true);
                        // Update last clicked row ID
                        lastClickedRowIdRef.current = row.id;
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
                      row.getVisibleCells().map((cell, index) => {
                        if (cell.getIsGrouped()) return null;
                        const isLastCell =
                          index === row.getVisibleCells().length - 1;
                        return (
                          <TableCell
                            key={cell.id}
                            style={{
                              width: isLastCell
                                ? "auto"
                                : `${cell.column.getSize()}px`,
                              minWidth: `${cell.column.getSize()}px`,
                            }}
                          >
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
        </DndContext>
      </div>
    </div>
  );
}
