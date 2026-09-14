import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizePayeeName } from "@/lib/utils";

type Db = Prisma.TransactionClient | typeof prisma;

/** Goal-linked expenses use the goal name as the payee (envelope-style ledger). */
export async function findOrCreatePayeeForGoalName(
  budgetId: string,
  goalName: string,
  db: Db = prisma
) {
  const name = goalName.trim();
  const normalizedName = normalizePayeeName(name);
  let payeeRecord = await db.payee.findUnique({
    where: {
      budgetId_normalizedName: { budgetId, normalizedName },
    },
  });
  if (!payeeRecord) {
    payeeRecord = await db.payee.create({
      data: { name, normalizedName, budgetId },
    });
  }
  return payeeRecord;
}
