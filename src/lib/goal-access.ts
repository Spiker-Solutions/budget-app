import { prisma } from "@/lib/prisma";
import { activeOnly, isArchived } from "@/lib/archive";
import type { GoalType } from "@prisma/client";

export async function checkBudgetGoalAccess(budgetId: string, userId: string) {
  return prisma.budgetUser.findUnique({
    where: {
      userId_budgetId: { userId, budgetId },
    },
  });
}

export async function getGoalForUser(goalId: string, userId: string) {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: {
      budget: {
        include: {
          members: { where: { userId } },
        },
      },
      charges: {
        orderBy: { date: "desc" },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      },
      expenses: {
        include: {
          payee: true,
          envelope: true,
          createdBy: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!goal) return null;
  if (isArchived(goal.archivedAt) || isArchived(goal.budget.archivedAt)) return null;
  if (goal.budget.members.length === 0) return null;

  return goal;
}

export async function validateGoalForExpense(
  goalId: string,
  budgetId: string,
  expectedType?: GoalType
) {
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, budgetId, ...activeOnly },
    select: { id: true, type: true, budget: { select: { archivedAt: true } } },
  });

  if (!goal || isArchived(goal.budget.archivedAt)) {
    return { ok: false as const, error: "Goal not found" };
  }

  if (expectedType && goal.type !== expectedType) {
    return { ok: false as const, error: "Goal type does not match this action" };
  }

  return { ok: true as const, goal };
}
