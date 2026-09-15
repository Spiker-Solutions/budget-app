import { create } from "zustand";
import type {
  Goal,
  GoalWithRelations,
  CreateGoalInput,
  UpdateGoalInput,
  CreateGoalChargeInput,
} from "@/types";

interface GoalState {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;

  fetchGoals: (budgetId: string) => Promise<void>;
  createGoal: (data: CreateGoalInput) => Promise<Goal | null>;
  updateGoal: (id: string, data: UpdateGoalInput) => Promise<Goal | null>;
  archiveGoal: (id: string) => Promise<boolean>;
  fetchGoal: (id: string) => Promise<GoalWithRelations | null>;
  createCharge: (goalId: string, data: CreateGoalChargeInput) => Promise<boolean>;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  isLoading: false,
  error: null,

  fetchGoals: async (budgetId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/goals?budgetId=${budgetId}`);
      const result = await response.json();
      if (result.success) {
        set({ goals: result.data, isLoading: false });
      } else {
        set({ error: result.error, isLoading: false });
      }
    } catch {
      set({ error: "Failed to fetch goals", isLoading: false });
    }
  },

  createGoal: async (data: CreateGoalInput) => {
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        set({ goals: [...get().goals, result.data] });
        return result.data;
      }
      set({ error: result.error });
      return null;
    } catch {
      set({ error: "Failed to create goal" });
      return null;
    }
  },

  updateGoal: async (id: string, data: UpdateGoalInput) => {
    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        set({
          goals: get().goals.map((g) => (g.id === id ? result.data : g)),
        });
        return result.data;
      }
      set({ error: result.error });
      return null;
    } catch {
      set({ error: "Failed to update goal" });
      return null;
    }
  },

  archiveGoal: async (id: string) => {
    try {
      const response = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (result.success) {
        set({ goals: get().goals.filter((g) => g.id !== id) });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  fetchGoal: async (id: string) => {
    try {
      const response = await fetch(`/api/goals/${id}`);
      const result = await response.json();
      if (result.success) {
        return result.data as GoalWithRelations;
      }
      return null;
    } catch {
      return null;
    }
  },

  createCharge: async (goalId: string, data: CreateGoalChargeInput) => {
    try {
      const response = await fetch(`/api/goals/${goalId}/charges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      return result.success;
    } catch {
      return false;
    }
  },
}));
