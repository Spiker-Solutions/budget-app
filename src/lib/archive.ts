import { prisma } from "@/lib/prisma";

export function isArchived(archivedAt: Date | null | undefined): boolean {
  return archivedAt != null;
}

/** Budgets/envelopes with no archivedAt are visible in normal app flows. */
export const activeOnly = { archivedAt: null } as const;

export type RemoveResult = { archived: boolean; deleted: boolean };

/**
 * Remove a budget: hard-delete when it has no envelopes (payees alone are OK),
 * otherwise soft-archive the budget and all of its envelopes.
 */
export async function removeBudget(budgetId: string): Promise<RemoveResult> {
  const envelopeCount = await prisma.envelope.count({
    where: { budgetId },
  });

  if (envelopeCount > 0) {
    const now = new Date();
    await prisma.$transaction([
      prisma.envelope.updateMany({
        where: { budgetId, archivedAt: null },
        data: { archivedAt: now },
      }),
      prisma.budget.update({
        where: { id: budgetId },
        data: { archivedAt: now },
      }),
    ]);
    return { archived: true, deleted: false };
  }

  await prisma.budget.delete({ where: { id: budgetId } });
  return { archived: false, deleted: true };
}

/**
 * Remove an envelope: hard-delete when it has no expenses, otherwise archive.
 */
export async function removeEnvelope(envelopeId: string): Promise<RemoveResult> {
  const expenseCount = await prisma.expense.count({
    where: { envelopeId },
  });

  if (expenseCount > 0) {
    await prisma.envelope.update({
      where: { id: envelopeId },
      data: { archivedAt: new Date() },
    });
    return { archived: true, deleted: false };
  }

  await prisma.envelope.delete({ where: { id: envelopeId } });
  return { archived: false, deleted: true };
}
