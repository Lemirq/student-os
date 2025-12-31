"use client";

import { Task } from "@/types";
import { updateTask, deleteTask } from "@/actions/tasks";
import { toast } from "sonner";
import { TaskStatus } from "@/types";

export const useTaskActions = () => {
  const cycleStatus = async (task: Task) => {
    const statuses: TaskStatus[] = ["Todo", "In Progress", "Done"];
    const currentIndex = statuses.indexOf(task.status as TaskStatus);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];

    toast.promise(updateTask(task.id, { status: nextStatus }), {
      loading: "Updating status...",
      success: `Status set to ${nextStatus}`,
      error: "Failed to update status",
    });
  };

  const setStatus = async (task: Task, status: TaskStatus) => {
    const promise = updateTask(task.id, { status });
    toast.promise(promise, {
      loading: "Updating status...",
      success: `Status set to ${status}`,
      error: "Failed to update status",
    });
    return promise;
  };

  const removeTask = async (task: Task) => {
    toast.promise(deleteTask(task.id), {
      loading: "Deleting task...",
      success: "Task deleted",
      error: "Failed to delete task",
    });
  };

  const setDueDate = async (task: Task, date: Date | null) => {
    const promise = updateTask(task.id, { dueDate: date });
    toast.promise(promise, {
      loading: "Updating due date...",
      success: date
        ? `Due date set to ${date.toLocaleDateString()}`
        : "Due date cleared",
      error: "Failed to update due date",
    });
    return promise;
  };

  return { cycleStatus, setStatus, removeTask, setDueDate };
};
