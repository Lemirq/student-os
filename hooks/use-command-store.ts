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
  | "EDIT_DUE_DATE"
  | "EDIT_SCORE"
  | "EDIT_COURSE"
  | "EDIT_GRADE_WEIGHT";

interface CommandState {
  isOpen: boolean;
  tasks: Task[];
  view: CommandView;
  previousActiveElement: HTMLElement | null;
  open: (tasks: Task | Task[]) => void;
  close: () => void;
  setView: (view: CommandView) => void;
}

export const useCommandStore = create<CommandState>((set, get) => ({
  isOpen: false,
  tasks: [],
  view: "MAIN",
  previousActiveElement: null,
  open: (tasks) => {
    // Store the currently active element before opening
    const activeElement = document.activeElement as HTMLElement;
    set({
      isOpen: true,
      tasks: Array.isArray(tasks) ? tasks : [tasks],
      view: "MAIN",
      previousActiveElement: activeElement,
    });
  },
  close: () => {
    const { previousActiveElement } = get();
    set({
      isOpen: false,
      tasks: [],
      view: "MAIN",
      previousActiveElement: null,
    });

    // Restore focus to the previously active element after a short delay
    // to ensure the dialog has closed
    if (
      previousActiveElement &&
      typeof previousActiveElement.focus === "function"
    ) {
      setTimeout(() => {
        previousActiveElement.focus();
      }, 0);
    }
  },
  setView: (view) => set({ view }),
}));
