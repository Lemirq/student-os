"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { TaskWithDetails, columns } from "./columns";
import { DataTable } from "./data-table";
import { TaskBoardView } from "./task-board-view";
import { TaskCalendarView } from "./task-calendar-view";
import { TaskViewToggle, ViewType } from "./task-view-toggle";

interface TaskExplorerProps {
  tasks: TaskWithDetails[];
  storageKey?: string;
  initialView?: ViewType;
  context?: { type: "semester" | "course"; id: string };
  externalDateFilter?: { from: Date | undefined; to: Date | undefined };
  onDateFilterChange?: (range: {
    from: Date | undefined;
    to: Date | undefined;
  }) => void;
}

export function TaskExplorer({
  tasks,
  storageKey,
  initialView = "list",
  context,
  externalDateFilter,
  onDateFilterChange,
}: TaskExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get initial view from URL or fall back to initialView
  const viewParam = searchParams.get("view") as ViewType | null;
  const initialViewFromUrl =
    viewParam && ["list", "board", "calendar"].includes(viewParam)
      ? viewParam
      : initialView;

  // Use local state for instant view switching
  const [currentView, setCurrentView] =
    React.useState<ViewType>(initialViewFromUrl);

  // Sync URL when view changes (non-blocking, for shareable links)
  const handleViewChange = (newView: ViewType) => {
    // Update state immediately (instant UI update)
    setCurrentView(newView);

    // Update URL in background (non-blocking)
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newView);

    // Use replace instead of push to avoid history pollution
    // This runs async and doesn't block the view switch
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  };

  const viewToggle = (
    <TaskViewToggle view={currentView} onViewChange={handleViewChange} />
  );

  return (
    <div className="space-y-4">
      {currentView === "list" && (
        <DataTable
          columns={columns}
          data={tasks}
          storageKey={storageKey}
          viewToggle={viewToggle}
          externalDateFilter={externalDateFilter}
          onDateFilterChange={onDateFilterChange}
        />
      )}

      {currentView === "board" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1" />
            <div className="flex items-center gap-2">{viewToggle}</div>
          </div>
          <TaskBoardView tasks={tasks} context={context} />
        </div>
      )}

      {currentView === "calendar" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1" />
            <div className="flex items-center gap-2">{viewToggle}</div>
          </div>
          <TaskCalendarView tasks={tasks} context={context} />
        </div>
      )}
    </div>
  );
}
