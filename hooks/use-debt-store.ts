import { create } from "zustand";

interface DebtStore {
  isRepaymentMode: boolean;
  toggleRepaymentMode: () => void;
  setRepaymentMode: (value: boolean) => void;
}

export const useDebtStore = create<DebtStore>((set) => ({
  isRepaymentMode: false,
  toggleRepaymentMode: () =>
    set((state) => ({ isRepaymentMode: !state.isRepaymentMode })),
  setRepaymentMode: (value) => set({ isRepaymentMode: value }),
}));
