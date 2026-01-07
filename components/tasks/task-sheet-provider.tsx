"use client";

import * as React from "react";
import { TaskSheet } from "@/components/tasks/task-sheet";

interface TaskSheetContextValue {
  openTaskSheet: (taskId: string) => void;
  closeTaskSheet: () => void;
  taskId: string | null;
  isOpen: boolean;
}

const TaskSheetContext = React.createContext<TaskSheetContextValue | undefined>(
  undefined,
);

export function TaskSheetProvider({ children }: { children: React.ReactNode }) {
  const [taskId, setTaskId] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  const openTaskSheet = React.useCallback((id: string) => {
    setTaskId(id);
    setIsOpen(true);
  }, []);

  const closeTaskSheet = React.useCallback(() => {
    setIsOpen(false);
    // Clear taskId after animation completes
    setTimeout(() => setTaskId(null), 300);
  }, []);

  return (
    <TaskSheetContext.Provider
      value={{ openTaskSheet, closeTaskSheet, taskId, isOpen }}
    >
      {children}
      <TaskSheet
        open={isOpen}
        onOpenChange={(open) => {
          if (open) {
            // Shouldn't happen, but handle it
            if (taskId) setIsOpen(true);
          } else {
            closeTaskSheet();
          }
        }}
        taskId={taskId}
      />
    </TaskSheetContext.Provider>
  );
}

export function useTaskSheet() {
  const context = React.useContext(TaskSheetContext);
  if (context === undefined) {
    throw new Error("useTaskSheet must be used within TaskSheetProvider");
  }
  return context;
}
