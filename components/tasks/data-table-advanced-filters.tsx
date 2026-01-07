"use client";

import * as React from "react";
import { Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface DataTableAdvancedFiltersProps<TData> {
  table: Table<TData>;
  externalDateFilter?: { from: Date | undefined; to: Date | undefined };
  onDateFilterChange?: (range: {
    from: Date | undefined;
    to: Date | undefined;
  }) => void;
}

export function DataTableAdvancedFilters<TData>({
  table,
  externalDateFilter,
  onDateFilterChange,
}: DataTableAdvancedFiltersProps<TData>) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Get all unique values for each filterable column
  const getUniqueColumnValues = (columnId: string) => {
    const column = table.getColumn(columnId);
    if (!column) return [];

    const uniqueValues = new Set<string>();
    table.getCoreRowModel().rows.forEach((row) => {
      const value = row.getValue(columnId);
      if (value !== null && value !== undefined && value !== "") {
        uniqueValues.add(String(value));
      }
    });

    return Array.from(uniqueValues).sort();
  };

  // Status filter
  const statusColumn = table.getColumn("status");
  const statusFilter = (statusColumn?.getFilterValue() as string[]) || [];
  const statusOptions = ["Todo", "In Progress", "Done"];

  // Priority filter
  const priorityColumn = table.getColumn("priority");
  const priorityFilter = (priorityColumn?.getFilterValue() as string[]) || [];
  const priorityOptions = ["Low", "Medium", "High"];

  // Course filter
  const courseColumn = table.getColumn("course");
  const courseFilter = (courseColumn?.getFilterValue() as string[]) || [];
  const courseOptions = getUniqueColumnValues("course");

  // Date range filter for due date
  const dueDateColumn = table.getColumn("dueDate");

  // Use external date filter if provided, otherwise use local state
  const [internalDateRange, setInternalDateRange] = React.useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });

  // Only use external filter if it has actual values
  const hasExternalFilter =
    externalDateFilter && (externalDateFilter.from || externalDateFilter.to);
  const dateRange = hasExternalFilter ? externalDateFilter : internalDateRange;
  const setDateRange =
    hasExternalFilter && onDateFilterChange
      ? onDateFilterChange
      : setInternalDateRange;

  // Apply date range filter
  React.useEffect(() => {
    console.log("[AdvancedFilters] Date range changed:", dateRange);

    if (dateRange.from || dateRange.to) {
      // Store date range object as filter value
      // The filterFn in columns.tsx will use this to filter
      const filterValue = {
        from: dateRange.from,
        to: dateRange.to,
      };
      console.log("[AdvancedFilters] Setting date filter value:", {
        from: filterValue.from?.toISOString(),
        to: filterValue.to?.toISOString(),
        fromLocal: filterValue.from?.toString(),
        toLocal: filterValue.to?.toString(),
      });
      dueDateColumn?.setFilterValue(filterValue);
    } else {
      console.log("[AdvancedFilters] Clearing date filter");
      dueDateColumn?.setFilterValue(undefined);
    }
  }, [dateRange, dueDateColumn]);

  // Count active filters
  const activeFilterCount = [
    statusFilter.length > 0,
    priorityFilter.length > 0,
    courseFilter.length > 0,
    dateRange.from || dateRange.to,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    console.log("[AdvancedFilters] Clearing all filters");
    statusColumn?.setFilterValue(undefined);
    priorityColumn?.setFilterValue(undefined);
    courseColumn?.setFilterValue(undefined);
    setDateRange({ from: undefined, to: undefined });
  };

  const toggleArrayFilter = (
    column:
      | {
          id: string;
          getFilterValue: () => unknown;
          setFilterValue: (value: unknown) => void;
        }
      | undefined,
    value: string,
  ) => {
    if (!column) return undefined;

    const currentFilter = (column?.getFilterValue() as string[]) || [];
    const newFilter = currentFilter.includes(value)
      ? currentFilter.filter((v) => v !== value)
      : [...currentFilter, value];

    console.log(`[AdvancedFilters] Toggle ${column.id}: "${value}"`, {
      before: currentFilter,
      after: newFilter,
    });

    column?.setFilterValue(newFilter);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 px-1.5 py-0.5 text-xs group cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                clearAllFilters();
              }}
            >
              <span className="group-hover:hidden size-4">
                {activeFilterCount}
              </span>
              <X className="h-3 w-3 hidden group-hover:inline" />
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Filters</h4>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-auto p-0 text-xs hover:bg-transparent"
            >
              Clear all
            </Button>
          )}
        </div>

        <div className="max-h-[500px] overflow-y-auto p-0">
          {/* Status Filter */}
          <div className="flex flex-col gap-2 p-4 border-b">
            <div className="flex items-center justify-between w-full">
              <Label className="text-sm font-medium">Status</Label>
              {statusFilter.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log("[AdvancedFilters] Clearing status filter");
                    statusColumn?.setFilterValue(undefined);
                  }}
                  className="h-auto p-0 text-xs hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((status) => {
                const isActive = statusFilter.includes(status);
                return (
                  <Button
                    key={status}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleArrayFilter(statusColumn, status)}
                    className="h-7 text-xs"
                  >
                    {status}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Priority Filter */}
          <div className="flex flex-col gap-2 p-4 border-b">
            <div className="flex items-center justify-between w-full">
              <Label className="text-sm font-medium">Priority</Label>
              {priorityFilter.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log("[AdvancedFilters] Clearing priority filter");
                    priorityColumn?.setFilterValue(undefined);
                  }}
                  className="h-auto p-0 text-xs hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {priorityOptions.map((priority) => {
                const isActive = priorityFilter.includes(priority);
                return (
                  <Button
                    key={priority}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleArrayFilter(priorityColumn, priority)}
                    className={cn(
                      "h-7 text-xs",
                      isActive &&
                        priority === "High" &&
                        "bg-red-600 hover:bg-red-700",
                      isActive &&
                        priority === "Medium" &&
                        "bg-yellow-600 hover:bg-yellow-700",
                      !isActive &&
                        priority === "High" &&
                        "text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50",
                      !isActive &&
                        priority === "Medium" &&
                        "text-yellow-600 hover:text-yellow-700 border-yellow-200 hover:bg-yellow-50",
                    )}
                  >
                    {priority}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Course Filter */}
          {courseOptions.length > 0 && (
            <div className="flex flex-col gap-2 p-4 border-b">
              <div className="flex items-center justify-between w-full">
                <Label className="text-sm font-medium">Course</Label>
                {courseFilter.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      console.log("[AdvancedFilters] Clearing course filter");
                      courseColumn?.setFilterValue(undefined);
                    }}
                    className="h-auto p-0 text-xs hover:bg-transparent"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
                {courseOptions.map((course) => {
                  const isActive = courseFilter.includes(course);
                  return (
                    <Button
                      key={course}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleArrayFilter(courseColumn, course)}
                      className="h-7 text-xs"
                    >
                      {course}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Due Date Range Filter */}
          <div className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between w-full">
              <Label className="text-sm font-medium">Due Date</Label>
              {(dateRange.from || dateRange.to) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log("[AdvancedFilters] Clearing date range filter");
                    setDateRange({ from: undefined, to: undefined });
                  }}
                  className="h-auto p-0 text-xs hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {dateRange.from && (
                <div className="text-xs text-muted-foreground">
                  From: {format(dateRange.from, "MMM d, yyyy")}
                </div>
              )}
              {dateRange.to && (
                <div className="text-xs text-muted-foreground">
                  To: {format(dateRange.to, "MMM d, yyyy")}
                </div>
              )}
              <Calendar
                classNames={{
                  root: "border-none",
                }}
                mode="range"
                selected={{
                  from: dateRange.from,
                  to: dateRange.to,
                }}
                onSelect={(range) => {
                  setDateRange({
                    from: range?.from,
                    to: range?.to,
                  });
                }}
                className=""
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
