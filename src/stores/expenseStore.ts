import { create } from "zustand";
import type { ExpenseWithRelations, CreateExpenseInput, UpdateExpenseInput, Payee } from "@/types";

interface ExpenseState {
  expenses: ExpenseWithRelations[];
  payees: Payee[];
  isLoading: boolean;
  error: string | null;

  setExpenses: (expenses: ExpenseWithRelations[]) => void;
  setPayees: (payees: Payee[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  fetchExpenses: (envelopeId?: string, budgetId?: string) => Promise<void>;
  fetchPayees: (budgetId: string) => Promise<void>;
  createExpense: (data: CreateExpenseInput) => Promise<ExpenseWithRelations | null>;
  updateExpense: (id: string, data: UpdateExpenseInput) => Promise<ExpenseWithRelations | null>;
  deleteExpense: (id: string) => Promise<boolean>;
  createOrGetPayee: (name: string, budgetId: string) => Promise<Payee | null>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  payees: [],
  isLoading: false,
  error: null,

  setExpenses: (expenses) => set({ expenses }),
  setPayees: (payees) => set({ payees }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  fetchExpenses: async (envelopeId?: string, budgetId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (envelopeId) params.set("envelopeId", envelopeId);
      if (budgetId) params.set("budgetId", budgetId);

      const response = await fetch(`/api/expenses?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        set({ expenses: result.data, isLoading: false });
      } else {
        set({ error: result.error, isLoading: false });
      }
    } catch (error) {
      set({ error: "Failed to fetch expenses", isLoading: false });
    }
  },

  fetchPayees: async (budgetId: string) => {
    try {
      const response = await fetch(`/api/payees?budgetId=${budgetId}`);
      const result = await response.json();

      if (result.success) {
        set({ payees: result.data });
      }
    } catch (error) {
      console.error("Failed to fetch payees:", error);
    }
  },

  createExpense: async (data: CreateExpenseInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (result.success) {
        const expenses = get().expenses;
        set({ expenses: [result.data, ...expenses], isLoading: false });
        return result.data;
      } else {
        set({ error: result.error, isLoading: false });
        return null;
      }
    } catch (error) {
      set({ error: "Failed to create expense", isLoading: false });
      return null;
    }
  },

  updateExpense: async (id: string, data: UpdateExpenseInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (result.success) {
        const expenses = get().expenses.map((e) =>
          e.id === id ? result.data : e
        );
        set({ expenses, isLoading: false });
        return result.data;
      } else {
        set({ error: result.error, isLoading: false });
        return null;
      }
    } catch (error) {
      set({ error: "Failed to update expense", isLoading: false });
      return null;
    }
  },

  deleteExpense: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        const expenses = get().expenses.filter((e) => e.id !== id);
        set({ expenses, isLoading: false });
        return true;
      } else {
        set({ error: result.error, isLoading: false });
        return false;
      }
    } catch (error) {
      set({ error: "Failed to delete expense", isLoading: false });
      return false;
    }
  },

  createOrGetPayee: async (name: string, budgetId: string) => {
    try {
      const response = await fetch("/api/payees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, budgetId }),
      });
      const result = await response.json();

      if (result.success) {
        const payees = get().payees;
        const exists = payees.some((p) => p.id === result.data.id);
        if (!exists) {
          set({ payees: [...payees, result.data] });
        }
        return result.data;
      }
      return null;
    } catch (error) {
      console.error("Failed to create payee:", error);
      return null;
    }
  },
}));
