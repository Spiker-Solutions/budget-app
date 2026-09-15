/**
 * Ensures the demo user has a save goal and leftover in the immediately previous
 * budget period so the remainder wizard can be recorded end-to-end.
 */
import { PrismaClient } from "@prisma/client";
import {
  getPeriodContaining,
  getPreviousPeriod,
  type BudgetPeriodInput,
} from "../src/lib/budget-period";

const prisma = new PrismaClient();
const EMAIL = process.env.SEED_USER_EMAIL ?? "test@test.com";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error(`User ${EMAIL} not found`);

  const membership = await prisma.budgetUser.findFirst({
    where: { userId: user.id },
    include: { budget: { include: { envelopes: true, goals: true } } },
  });
  if (!membership?.budget) throw new Error("No budget for demo user");

  const budget = membership.budget;
  const budgetInput: BudgetPeriodInput = {
    periodType: budget.periodType,
    periodDay: budget.periodDay,
    customDays: budget.customDays,
    startDate: budget.startDate,
    createdAt: budget.createdAt,
    carryOverRemainder: budget.carryOverRemainder,
  };

  const current = getPeriodContaining(new Date(), budgetInput);
  const previous = getPreviousPeriod(current, budgetInput);
  if (!previous) throw new Error("No previous period");

  let saveGoal = budget.goals.find((g) => g.type === "SAVE" && !g.archivedAt);
  if (!saveGoal) {
    saveGoal = await prisma.goal.create({
      data: {
        budgetId: budget.id,
        type: "SAVE",
        name: "Vacation Fund Demo",
        startingAmount: 0,
        targetAmount: 5000,
      },
    });
  }

  const envelope = budget.envelopes.find((e) => !e.archivedAt);
  if (!envelope) throw new Error("No envelope");

  await prisma.remainderWizardState.deleteMany({
    where: {
      budgetId: budget.id,
      periodStart: previous.start,
      periodEnd: previous.end,
    },
  });

  await prisma.expense.deleteMany({
    where: {
      envelopeId: envelope.id,
      date: { gte: previous.start, lte: previous.end },
    },
  });

  console.log(
    JSON.stringify({
      budgetId: budget.id,
      saveGoalId: saveGoal.id,
      envelopeId: envelope.id,
      previousPeriod: { start: previous.start.toISOString(), end: previous.end.toISOString() },
    })
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
