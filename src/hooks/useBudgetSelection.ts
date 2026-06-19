"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUiStore } from "@/stores/uiStore";
import type { BudgetWithRelations } from "@/types";

const BUDGET_QUERY_PARAM = "budget";

function isBudgetAccessible(
  budgets: BudgetWithRelations[],
  budgetId: string | null | undefined
): budgetId is string {
  return Boolean(budgetId && budgets.some((budget) => budget.id === budgetId));
}

export function useBudgetSelection(budgets: BudgetWithRelations[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentBudgetId, setCurrentBudgetId } = useUiStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const finishHydration = () => setHydrated(true);
    const unsubscribe = useUiStore.persist.onFinishHydration(finishHydration);

    if (useUiStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!hydrated || budgets.length === 0) return;

    const budgetFromUrl = searchParams.get(BUDGET_QUERY_PARAM);

    if (isBudgetAccessible(budgets, budgetFromUrl)) {
      if (currentBudgetId !== budgetFromUrl) {
        setCurrentBudgetId(budgetFromUrl);
      }
      return;
    }

    if (!isBudgetAccessible(budgets, currentBudgetId)) {
      setCurrentBudgetId(budgets[0].id);
    }
  }, [hydrated, budgets, searchParams, currentBudgetId, setCurrentBudgetId]);

  const selectBudget = useCallback(
    (budgetId: string | null) => {
      if (!budgetId) return;

      setCurrentBudgetId(budgetId);

      const params = new URLSearchParams(searchParams.toString());
      params.set(BUDGET_QUERY_PARAM, budgetId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams, setCurrentBudgetId]
  );

  return { currentBudgetId, selectBudget, hydrated };
}
