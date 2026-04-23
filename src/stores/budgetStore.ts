import { create } from "zustand";
import type { BudgetWithRelations, CreateBudgetInput, UpdateBudgetInput } from "@/types";

interface BudgetState {
  budgets: BudgetWithRelations[];
  currentBudget: BudgetWithRelations | null;
  isLoading: boolean;
  error: string | null;

  setBudgets: (budgets: BudgetWithRelations[]) => void;
  setCurrentBudget: (budget: BudgetWithRelations | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  fetchBudgets: () => Promise<void>;
  fetchBudget: (id: string) => Promise<void>;
  createBudget: (data: CreateBudgetInput) => Promise<BudgetWithRelations | null>;
  updateBudget: (id: string, data: UpdateBudgetInput) => Promise<BudgetWithRelations | null>;
  deleteBudget: (id: string) => Promise<boolean>;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budgets: [],
  currentBudget: null,
  isLoading: false,
  error: null,

  setBudgets: (budgets) => set({ budgets }),
  setCurrentBudget: (budget) => set({ currentBudget: budget }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  fetchBudgets: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/budgets");
      const result = await response.json();

      if (result.success) {
        set({ budgets: result.data, isLoading: false });
      } else {
        set({ error: result.error, isLoading: false });
      }
    } catch (error) {
      set({ error: "Failed to fetch budgets", isLoading: false });
    }
  },

  fetchBudget: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/budgets/${id}`);
      const result = await response.json();

      if (result.success) {
        set({ currentBudget: result.data, isLoading: false });
      } else {
        set({ error: result.error, isLoading: false });
      }
    } catch (error) {
      set({ error: "Failed to fetch budget", isLoading: false });
    }
  },

  createBudget: async (data: CreateBudgetInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (result.success) {
        const budgets = get().budgets;
        set({ budgets: [...budgets, result.data], isLoading: false });
        return result.data;
      } else {
        set({ error: result.error, isLoading: false });
        return null;
      }
    } catch (error) {
      set({ error: "Failed to create budget", isLoading: false });
      return null;
    }
  },

  updateBudget: async (id: string, data: UpdateBudgetInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/budgets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (result.success) {
        const budgets = get().budgets.map((b) =>
          b.id === id ? result.data : b
        );
        set({
          budgets,
          currentBudget: get().currentBudget?.id === id ? result.data : get().currentBudget,
          isLoading: false,
        });
        return result.data;
      } else {
        set({ error: result.error, isLoading: false });
        return null;
      }
    } catch (error) {
      set({ error: "Failed to update budget", isLoading: false });
      return null;
    }
  },

  deleteBudget: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/budgets/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        const budgets = get().budgets.filter((b) => b.id !== id);
        set({
          budgets,
          currentBudget: get().currentBudget?.id === id ? null : get().currentBudget,
          isLoading: false,
        });
        return true;
      } else {
        set({ error: result.error, isLoading: false });
        return false;
      }
    } catch (error) {
      set({ error: "Failed to delete budget", isLoading: false });
      return false;
    }
  },
}));
