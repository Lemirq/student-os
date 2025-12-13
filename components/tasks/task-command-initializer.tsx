"use client";

import { useEffect } from "react";
import { useCommandStore } from "@/hooks/use-command-store";
import { Task } from "@/types";

export function TaskCommandInitializer({ task }: { task: Task }) {
  const { open } = useCommandStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        open(task);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [task, open]);

  return null;
}
