import { prisma } from "@/lib/prisma";
import { canManageEnvelope } from "@/lib/permissions";

/**
 * Membership + authorization for a single expense.
 *
 * Read access requires membership of either the expense's envelope or its
 * parent budget. Write access additionally requires being the expense creator
 * or an admin/owner of either. Refunds inherit these rules from their parent
 * expense, so the refund routes share this helper.
 */
export async function checkExpenseAccess(expenseId: string, userId: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      envelope: {
        include: {
          budget: {
            include: {
              members: {
                where: { userId },
              },
            },
          },
          members: {
            where: { userId },
          },
        },
      },
    },
  });

  if (!expense) return null;

  const budgetMembership = expense.envelope.budget.members[0];
  const envelopeMembership = expense.envelope.members[0];

  if (!budgetMembership && !envelopeMembership) return null;

  const isAdmin = canManageEnvelope(budgetMembership?.role, envelopeMembership?.role);
  const isCreator = expense.createdById === userId;

  return { expense, isAdmin, isCreator, canWrite: isAdmin || isCreator };
}

export type ExpenseAccess = NonNullable<Awaited<ReturnType<typeof checkExpenseAccess>>>;

/** Resolves a refund to its parent expense and applies the expense's access rules. */
export async function checkRefundAccess(refundId: string, userId: string) {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    select: { id: true, expenseId: true },
  });

  if (!refund) return null;

  const access = await checkExpenseAccess(refund.expenseId, userId);
  if (!access) return null;

  return { ...access, refundId: refund.id };
}
