import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  sidebarOpen: boolean;
  currentBudgetId: string | null;
  /** ISO string for the selected period reference date; null = current period (today). */
  periodReferenceIso: string | null;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentBudgetId: (id: string | null) => void;
  setPeriodReferenceIso: (iso: string | null) => void;
  resetPeriodReference: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      currentBudgetId: null,
      periodReferenceIso: null,

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setCurrentBudgetId: (id) => set({ currentBudgetId: id }),
      setPeriodReferenceIso: (iso) => set({ periodReferenceIso: iso }),
      resetPeriodReference: () => set({ periodReferenceIso: null }),
    }),
    {
      name: "budget-app-ui",
      partialize: (state) => ({ currentBudgetId: state.currentBudgetId }),
    }
  )
);
