import { create } from "zustand";

interface UiState {
  sidebarOpen: boolean;
  currentBudgetId: string | null;
  /** `null` = calendar current period; otherwise period start timestamp (ms). */
  viewingPeriodStartMs: number | null;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentBudgetId: (id: string | null) => void;
  setViewingPeriodStartMs: (ms: number | null) => void;
  resetPeriodViewToCurrent: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  currentBudgetId: null,
  viewingPeriodStartMs: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentBudgetId: (id) => set({ currentBudgetId: id, viewingPeriodStartMs: null }),
  setViewingPeriodStartMs: (ms) => set({ viewingPeriodStartMs: ms }),
  resetPeriodViewToCurrent: () => set({ viewingPeriodStartMs: null }),
}));
