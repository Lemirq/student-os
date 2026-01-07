"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { TaskMainContent } from "@/components/tasks/task-main-content";
import { TaskCommandInitializer } from "@/components/tasks/task-command-initializer";
import { getTask } from "@/actions/tasks";
import { Task } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface TaskSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
}

export function TaskSheet({ open, onOpenChange, taskId }: TaskSheetProps) {
  const queryClient = useQueryClient();
  const saveOnCloseRef = React.useRef<(() => Promise<void>) | null>(null);

  // Use React Query to automatically handle caching and updates
  const {
    data: task,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.tasks.detail(taskId || ""),
    queryFn: () => getTask(taskId!),
    enabled: open && !!taskId,
    staleTime: 0, // Always refetch to get latest data
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  React.useEffect(() => {
    if (!open) {
      // Save all pending changes before closing
      if (saveOnCloseRef.current) {
        saveOnCloseRef
          .current()
          .then(() => {
            // Refetch after saving to ensure we have latest data
            if (taskId) {
              refetch();
            }
          })
          .catch((error) => {
            console.error("Error saving on close:", error);
          });
      }
      saveOnCloseRef.current = null;
    }
  }, [open, taskId, refetch]);

  // Watch for query invalidations and refetch
  React.useEffect(() => {
    if (!open || !taskId) return;

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // When queries are invalidated, refetch our task
      if (event?.type === "removed" && event.query.queryKey[0] === "tasks") {
        // Check if this affects our task
        const queryKey = event.query.queryKey;
        if (
          queryKey[1] === taskId || // Direct task detail invalidation
          queryKey[0] === "tasks" // Any task query invalidation
        ) {
          // Small delay to ensure mutation completes
          setTimeout(() => {
            refetch();
          }, 200);
        }
      }
    });

    return unsubscribe;
  }, [open, taskId, queryClient, refetch]);

  // Cast task to Task type for the command menu - ensure compatibility
  const taskForMenu = task
    ? (task as unknown as Task)
    : (null as unknown as Task);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 gap-0 flex flex-col h-full">
        {isLoading ? (
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : task ? (
          <>
            <TaskCommandInitializer task={taskForMenu} />
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-6 pb-20">
                <SheetHeader className="mb-6 pb-4 border-b">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link
                      href={`/courses/${task.course?.id || ""}`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-foreground transition-colors"
                    >
                      {task.course?.code || "No Course"}
                    </Link>
                    <span>/</span>
                    <span>Tasks</span>
                    <span>/</span>
                    <span className="text-foreground font-medium">
                      T-{task.id.slice(0, 4)}
                    </span>
                  </div>
                </SheetHeader>
                <TaskMainContent
                  task={task}
                  onSaveRef={(saveFn) => {
                    saveOnCloseRef.current = saveFn;
                  }}
                  onTaskUpdate={() => {
                    // Task updates will be handled by query refetch
                    refetch();
                  }}
                />
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
