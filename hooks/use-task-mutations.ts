"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateTask, deleteTask } from "@/actions/tasks";
import { toast } from "sonner";
import { TaskStatus, Task } from "@/types";
import { queryKeys } from "@/lib/query-keys";
import { TaskWithDetails } from "@/components/tasks/columns";

type TaskUpdate = {
  status?: TaskStatus;
  priority?: "Low" | "Medium" | "High";
  title?: string;
  dueDate?: Date | null;
  doDate?: Date | null;
  scoreReceived?: string | null;
  scoreMax?: string | null;
  gradeWeightId?: string | null;
  description?: string | null;
  notes?: unknown;
  courseId?: string | null;
};

type QueryDataWithTasks = {
  tasks?: TaskWithDetails[];
  [key: string]: unknown;
};

type CachedQuery = {
  key: readonly unknown[];
  data: unknown;
};

/**
 * Hook for task mutations with optimistic updates
 * Handles:
 * - Status changes (kanban, checkboxes, command palette)
 * - Priority updates
 * - Score updates
 * - Due date changes
 * - Task deletion
 */
export function useTaskMutations() {
  const queryClient = useQueryClient();

  /**
   * Generic task update mutation with optimistic updates
   */
  const updateTaskMutation = useMutation({
    mutationFn: ({
      taskId,
      updates,
    }: {
      taskId: string;
      updates: TaskUpdate;
    }) => updateTask(taskId, updates),

    onMutate: async ({ taskId, updates }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.semesters.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.courses.all });

      // Snapshot previous values
      const previousData = {
        tasks: queryClient.getQueryData(queryKeys.tasks.all),
        taskDetail: queryClient.getQueryData(queryKeys.tasks.detail(taskId)),
        semesters: [] as CachedQuery[],
        courses: [] as CachedQuery[],
      };

      // Optimistically update the task detail query
      queryClient.setQueryData(queryKeys.tasks.detail(taskId), (old: unknown) => {
        if (!old) return old;
        return { ...old, ...updates };
      });

      // Collect all semester and course queries to update
      const queryCache = queryClient.getQueryCache();
      queryCache.getAll().forEach((query) => {
        const key = query.queryKey;
        if (key[0] === "semesters" && key[1] && key.length === 2) {
          previousData.semesters.push({
            key,
            data: queryClient.getQueryData(key),
          });
        } else if (key[0] === "courses" && key[1] && key[2] === "full") {
          previousData.courses.push({
            key,
            data: queryClient.getQueryData(key),
          });
        }
      });

      // Optimistically update tasks in all queries
      const updateTaskInList = (tasks: TaskWithDetails[] | undefined) => {
        if (!tasks) return tasks;
        return tasks.map((task) =>
          task.id === taskId ? { ...task, ...updates } : task,
        );
      };

      // Update semester queries
      previousData.semesters.forEach(({ key }) => {
        queryClient.setQueryData(key, (old: unknown) => {
          if (!old) return old;
          const oldData = old as QueryDataWithTasks;
          return {
            ...oldData,
            tasks: updateTaskInList(oldData.tasks),
          };
        });
      });

      // Update course queries
      previousData.courses.forEach(({ key }) => {
        queryClient.setQueryData(key, (old: unknown) => {
          if (!old) return old;
          const oldData = old as QueryDataWithTasks;
          return {
            ...oldData,
            tasks: updateTaskInList(oldData.tasks),
          };
        });
      });

      return { previousData };
    },

    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        const { taskDetail, semesters, courses } = context.previousData;

        // Rollback task detail
        if (taskDetail !== undefined) {
          queryClient.setQueryData(queryKeys.tasks.detail(variables.taskId), taskDetail);
        }

        semesters.forEach(({ key, data }) => {
          queryClient.setQueryData(key, data);
        });

        courses.forEach(({ key, data }) => {
          queryClient.setQueryData(key, data);
        });
      }

      toast.error("Failed to update task");
      console.error("Task update failed:", err);
    },

    onSettled: (data, error, variables) => {
      // Mark queries as stale but don't refetch immediately (prevents infinite loops)
      // They'll refetch when accessed next or when staleTime expires
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.all,
        refetchType: 'none' // Don't trigger refetch immediately
      });
      // The task detail query has optimistic updates, so don't invalidate it
      // This prevents the sheet from refetching while typing
      queryClient.invalidateQueries({
        queryKey: queryKeys.semesters.all,
        refetchType: 'none'
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.all,
        refetchType: 'none'
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.all,
        refetchType: 'none'
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.ai.context("user"),
        refetchType: 'none'
      });
    },
  });

  /**
   * Delete task mutation with optimistic updates
   */
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),

    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.semesters.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.courses.all });

      const previousData = {
        semesters: [] as CachedQuery[],
        courses: [] as CachedQuery[],
      };

      // Collect queries
      const queryCache = queryClient.getQueryCache();
      queryCache.getAll().forEach((query) => {
        const key = query.queryKey;
        if (key[0] === "semesters" && key[1] && key.length === 2) {
          previousData.semesters.push({
            key,
            data: queryClient.getQueryData(key),
          });
        } else if (key[0] === "courses" && key[1] && key[2] === "full") {
          previousData.courses.push({
            key,
            data: queryClient.getQueryData(key),
          });
        }
      });

      // Optimistically remove task
      const removeTaskFromList = (tasks: TaskWithDetails[] | undefined) => {
        if (!tasks) return tasks;
        return tasks.filter((task) => task.id !== taskId);
      };

      previousData.semesters.forEach(({ key }) => {
        queryClient.setQueryData(key, (old: unknown) => {
          if (!old) return old;
          const oldData = old as QueryDataWithTasks;
          return {
            ...oldData,
            tasks: removeTaskFromList(oldData.tasks),
          };
        });
      });

      previousData.courses.forEach(({ key }) => {
        queryClient.setQueryData(key, (old: unknown) => {
          if (!old) return old;
          const oldData = old as QueryDataWithTasks;
          return {
            ...oldData,
            tasks: removeTaskFromList(oldData.tasks),
          };
        });
      });

      return { previousData };
    },

    onError: (err, variables, context) => {
      if (context?.previousData) {
        const { semesters, courses } = context.previousData;

        semesters.forEach(({ key, data }) => {
          queryClient.setQueryData(key, data);
        });

        courses.forEach(({ key, data }) => {
          queryClient.setQueryData(key, data);
        });
      }

      toast.error("Failed to delete task");
      console.error("Task deletion failed:", err);
    },

    onSettled: () => {
      // Mark queries as stale but don't refetch immediately
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.all,
        refetchType: 'none'
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.semesters.all,
        refetchType: 'none'
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.all,
        refetchType: 'none'
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.all,
        refetchType: 'none'
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.ai.context("user"),
        refetchType: 'none'
      });
    },
  });

  // Convenience methods
  const setStatus = (task: Task, status: TaskStatus) => {
    const promise = updateTaskMutation.mutateAsync({
      taskId: task.id,
      updates: { status },
    });

    toast.promise(promise, {
      loading: "Updating status...",
      success: `Status set to ${status}`,
      error: "Failed to update status",
    });

    return promise;
  };

  const cycleStatus = (task: Task) => {
    const statuses: TaskStatus[] = ["Todo", "In Progress", "Done"];
    const currentIndex = statuses.indexOf(task.status as TaskStatus);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];

    return setStatus(task, nextStatus);
  };

  const setPriority = (task: Task, priority: "Low" | "Medium" | "High") => {
    const promise = updateTaskMutation.mutateAsync({
      taskId: task.id,
      updates: { priority },
    });

    toast.promise(promise, {
      loading: "Updating priority...",
      success: `Priority set to ${priority}`,
      error: "Failed to update priority",
    });

    return promise;
  };

  const setDueDate = (task: Task, dueDate: Date | null) => {
    const promise = updateTaskMutation.mutateAsync({
      taskId: task.id,
      updates: { dueDate },
    });

    toast.promise(promise, {
      loading: "Updating due date...",
      success: dueDate
        ? `Due date set to ${dueDate.toLocaleDateString()}`
        : "Due date cleared",
      error: "Failed to update due date",
    });

    return promise;
  };

  const setScore = (
    task: Task,
    scoreReceived: string | null,
    scoreMax?: string | null,
  ) => {
    const promise = updateTaskMutation.mutateAsync({
      taskId: task.id,
      updates: { scoreReceived, ...(scoreMax !== undefined && { scoreMax }) },
    });

    toast.promise(promise, {
      loading: "Updating score...",
      success: scoreReceived !== null ? `Score updated` : "Score cleared",
      error: "Failed to update score",
    });

    return promise;
  };

  const removeTask = (task: Task) => {
    const promise = deleteTaskMutation.mutateAsync(task.id);

    toast.promise(promise, {
      loading: "Deleting task...",
      success: "Task deleted",
      error: "Failed to delete task",
    });

    return promise;
  };

  const updateTaskGeneric = (taskId: string, updates: TaskUpdate) => {
    return updateTaskMutation.mutateAsync({ taskId, updates });
  };

  return {
    // Mutations
    updateTaskMutation,
    deleteTaskMutation,

    // Convenience methods
    setStatus,
    cycleStatus,
    setPriority,
    setDueDate,
    setScore,
    removeTask,
    updateTaskGeneric,
  };
}
