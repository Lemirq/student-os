import { create } from "zustand";
import { Task } from "@/types";

type CommandView =
  | "MAIN"
  | "DUE_DATE"
  | "PRIORITY"
  | "STATUS"
  | "EDIT_TITLE"
  | "EDIT_DESCRIPTION"
  | "EDIT_DO_DATE"
  | "EDIT_SCORE"
  | "EDIT_COURSE"
  | "EDIT_GRADE_WEIGHT";

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
