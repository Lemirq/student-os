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
}

export function TaskExplorer({
  tasks,
  storageKey,
  initialView = "list",
  context,
}: TaskExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get view from URL or fall back to initialView
  const viewParam = searchParams.get("view") as ViewType | null;
  const currentView =
    viewParam && ["list", "board", "calendar"].includes(viewParam)
      ? viewParam
      : initialView;

  const handleViewChange = (newView: ViewType) => {
    // Update URL query param
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newView);
    router.push(`${pathname}?${params.toString()}`);
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
        />
      )}

      {currentView === "board" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {/* We can replicate some filters here if needed later, 
                 for now just the view toggle aligned right to match table toolbar layout */}
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
