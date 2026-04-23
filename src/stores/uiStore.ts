import { create } from "zustand";

interface UiState {
  sidebarOpen: boolean;
  currentBudgetId: string | null;
  
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentBudgetId: (id: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  currentBudgetId: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentBudgetId: (id) => set({ currentBudgetId: id }),
}));
