import { create } from "zustand";
import { Task } from "@/types";

type CommandView = "MAIN" | "DUE_DATE" | "PRIORITY" | "STATUS";

interface CommandState {
  isOpen: boolean;
  tasks: Task[];
  view: CommandView;
  open: (tasks: Task | Task[]) => void;
  close: () => void;
  setView: (view: CommandView) => void;
}

export const useCommandStore = create<CommandState>((set) => ({
  isOpen: false,
  tasks: [],
  view: "MAIN",
  open: (tasks) =>
    set({
      isOpen: true,
      tasks: Array.isArray(tasks) ? tasks : [tasks],
      view: "MAIN",
    }),
  close: () => set({ isOpen: false, tasks: [], view: "MAIN" }),
  setView: (view) => set({ view }),
}));
