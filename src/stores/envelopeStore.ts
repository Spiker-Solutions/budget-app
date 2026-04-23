import { create } from "zustand";
import type { EnvelopeWithRelations, CreateEnvelopeInput, UpdateEnvelopeInput } from "@/types";

interface EnvelopeState {
  envelopes: EnvelopeWithRelations[];
  currentEnvelope: EnvelopeWithRelations | null;
  isLoading: boolean;
  error: string | null;

  setEnvelopes: (envelopes: EnvelopeWithRelations[]) => void;
  setCurrentEnvelope: (envelope: EnvelopeWithRelations | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  fetchEnvelopes: (budgetId: string) => Promise<void>;
  fetchEnvelope: (id: string) => Promise<void>;
  createEnvelope: (data: CreateEnvelopeInput) => Promise<EnvelopeWithRelations | null>;
  updateEnvelope: (id: string, data: UpdateEnvelopeInput) => Promise<EnvelopeWithRelations | null>;
  deleteEnvelope: (id: string) => Promise<boolean>;
}

export const useEnvelopeStore = create<EnvelopeState>((set, get) => ({
  envelopes: [],
  currentEnvelope: null,
  isLoading: false,
  error: null,

  setEnvelopes: (envelopes) => set({ envelopes }),
  setCurrentEnvelope: (envelope) => set({ currentEnvelope: envelope }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  fetchEnvelopes: async (budgetId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/envelopes?budgetId=${budgetId}`);
      const result = await response.json();

      if (result.success) {
        set({ envelopes: result.data, isLoading: false });
      } else {
        set({ error: result.error, isLoading: false });
      }
    } catch (error) {
      set({ error: "Failed to fetch envelopes", isLoading: false });
    }
  },

  fetchEnvelope: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/envelopes/${id}`);
      const result = await response.json();

      if (result.success) {
        set({ currentEnvelope: result.data, isLoading: false });
      } else {
        set({ error: result.error, isLoading: false });
      }
    } catch (error) {
      set({ error: "Failed to fetch envelope", isLoading: false });
    }
  },

  createEnvelope: async (data: CreateEnvelopeInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch("/api/envelopes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (result.success) {
        const envelopes = get().envelopes;
        set({ envelopes: [...envelopes, result.data], isLoading: false });
        return result.data;
      } else {
        set({ error: result.error, isLoading: false });
        return null;
      }
    } catch (error) {
      set({ error: "Failed to create envelope", isLoading: false });
      return null;
    }
  },

  updateEnvelope: async (id: string, data: UpdateEnvelopeInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/envelopes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (result.success) {
        const envelopes = get().envelopes.map((e) =>
          e.id === id ? result.data : e
        );
        set({
          envelopes,
          currentEnvelope: get().currentEnvelope?.id === id ? result.data : get().currentEnvelope,
          isLoading: false,
        });
        return result.data;
      } else {
        set({ error: result.error, isLoading: false });
        return null;
      }
    } catch (error) {
      set({ error: "Failed to update envelope", isLoading: false });
      return null;
    }
  },

  deleteEnvelope: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/envelopes/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        const envelopes = get().envelopes.filter((e) => e.id !== id);
        set({
          envelopes,
          currentEnvelope: get().currentEnvelope?.id === id ? null : get().currentEnvelope,
          isLoading: false,
        });
        return true;
      } else {
        set({ error: result.error, isLoading: false });
        return false;
      }
    } catch (error) {
      set({ error: "Failed to delete envelope", isLoading: false });
      return false;
    }
  },
}));
