import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/utils";
import {
  remainderWizardDismissSchema,
  remainderWizardSubmitSchema,
} from "@/lib/validations";
import { checkBudgetGoalAccess } from "@/lib/goal-access";
import { activeOnly } from "@/lib/archive";
import { computeEnvelopeRemaindersForPeriod } from "@/lib/remainder-wizard";
import {
  computeCarryAndPeriodTotals,
  getPeriodContaining,
  getPreviousPeriod,
} from "@/lib/budget-period";
import { expensesToPeriodInputs } from "@/lib/expense-period-inputs";
import { findOrCreatePayeeForGoalName } from "@/lib/goal-payee";
import { canManageBudget } from "@/lib/permissions";

async function loadBudgetContext(budgetId: string, userId: string) {
  const membership = await checkBudgetGoalAccess(budgetId, userId);
  if (!membership) return null;

  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, ...activeOnly },
    include: {
      envelopes: { where: activeOnly },
      goals: { where: { ...activeOnly, type: "SAVE" } },
    },
  });

  if (!budget) return null;

  const expenses = await prisma.expense.findMany({
    where: {
      envelope: { budgetId, ...activeOnly },
    },
    include: { refunds: true },
  });

  return { membership, budget, expenses };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
  }

  const { id: budgetId } = await params;
  const referenceDateParam = new URL(req.url).searchParams.get("referenceDate");

  try {
    const ctx = await loadBudgetContext(budgetId, session.user.id);
    if (!ctx) {
      return NextResponse.json(errorResponse("Budget not found"), { status: 404 });
    }

    const { budget, expenses } = ctx;
    const budgetPeriodInput = {
      periodType: budget.periodType,
      periodDay: budget.periodDay,
      customDays: budget.customDays,
      startDate: budget.startDate,
      createdAt: budget.createdAt,
      carryOverRemainder: budget.carryOverRemainder,
    };

    const nowRef = referenceDateParam ? new Date(referenceDateParam) : new Date();
    const currentPeriod = getPeriodContaining(new Date(), budgetPeriodInput);
    const viewedPeriod = getPeriodContaining(nowRef, budgetPeriodInput);
    const previousOfCurrent = getPreviousPeriod(currentPeriod, budgetPeriodInput);

    let targetPeriod: { start: Date; end: Date } | null = null;
    if (viewedPeriod.start.getTime() === currentPeriod.start.getTime()) {
      targetPeriod = previousOfCurrent;
    } else if (
      previousOfCurrent &&
      viewedPeriod.start.getTime() === previousOfCurrent.start.getTime()
    ) {
      targetPeriod = previousOfCurrent;
    }

    if (!targetPeriod) {
      return NextResponse.json(
        successResponse({
          applicable: false,
          reason: "Wizard not available for this period",
        })
      );
    }

    const expenseInputs = expensesToPeriodInputs(expenses);
    const envelopeRows = computeEnvelopeRemaindersForPeriod(
      budgetPeriodInput,
      ctx.budget.envelopes.map((e) => ({
        id: e.id,
        name: e.name,
        allocation: Number(e.allocation),
        allocationType: e.allocationType,
        carryOverRemainder: e.carryOverRemainder,
      })),
      expenseInputs,
      targetPeriod.end,
      Number(budget.amount)
    );

    const totalRemainder = envelopeRows.reduce((s, r) => s + r.remainingThisPeriod, 0);

    const wizardState = await prisma.remainderWizardState.findUnique({
      where: {
        budgetId_periodStart_periodEnd: {
          budgetId,
          periodStart: targetPeriod.start,
          periodEnd: targetPeriod.end,
        },
      },
    });

    const viewingCurrent =
      viewedPeriod.start.getTime() === currentPeriod.start.getTime();
    const showBanner =
      viewingCurrent &&
      totalRemainder > 0 &&
      (!wizardState || wizardState.status === "PENDING");
    const showPeriodButton =
      !viewingCurrent &&
      previousOfCurrent &&
      viewedPeriod.start.getTime() === previousOfCurrent.start.getTime() &&
      totalRemainder > 0 &&
      wizardState?.status !== "COMPLETED";

    return NextResponse.json(
      successResponse({
        applicable: totalRemainder > 0,
        period: targetPeriod,
        envelopeRows,
        saveGoals: ctx.budget.goals,
        totalRemainder,
        wizardStatus: wizardState?.status ?? "PENDING",
        showBanner,
        showPeriodButton,
      })
    );
  } catch (error) {
    console.error("Error loading remainder wizard:", error);
    return NextResponse.json(errorResponse("Failed to load wizard"), { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
  }

  const { id: budgetId } = await params;

  try {
    const body = await req.json();
    const action = body.action as "dismiss" | "submit";

    const ctx = await loadBudgetContext(budgetId, session.user.id);
    if (!ctx) {
      return NextResponse.json(errorResponse("Budget not found"), { status: 404 });
    }

    if (!canManageBudget(ctx.membership.role)) {
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });
    }

    if (action === "dismiss") {
      const parsed = remainderWizardDismissSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          errorResponse(parsed.error.errors[0].message),
          { status: 400 }
        );
      }

      const periodStart = new Date(parsed.data.periodStart);
      const periodEnd = new Date(parsed.data.periodEnd);

      const state = await prisma.remainderWizardState.upsert({
        where: {
          budgetId_periodStart_periodEnd: {
            budgetId,
            periodStart,
            periodEnd,
          },
        },
        create: {
          budgetId,
          periodStart,
          periodEnd,
          status: "DISMISSED",
          userId: session.user.id,
        },
        update: {
          status: "DISMISSED",
          userId: session.user.id,
        },
      });

      return NextResponse.json(successResponse(state));
    }

    if (action === "submit") {
      const parsed = remainderWizardSubmitSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          errorResponse(parsed.error.errors[0].message),
          { status: 400 }
        );
      }

      const periodStart = new Date(parsed.data.periodStart);
      const periodEnd = new Date(parsed.data.periodEnd);

      const budgetPeriodInput = {
        periodType: ctx.budget.periodType,
        periodDay: ctx.budget.periodDay,
        customDays: ctx.budget.customDays,
        startDate: ctx.budget.startDate,
        createdAt: ctx.budget.createdAt,
        carryOverRemainder: ctx.budget.carryOverRemainder,
      };

      const currentPeriod = getPeriodContaining(new Date(), budgetPeriodInput);
      const previousOfCurrent = getPreviousPeriod(currentPeriod, budgetPeriodInput);
      if (
        !previousOfCurrent ||
        previousOfCurrent.start.getTime() !== periodStart.getTime() ||
        previousOfCurrent.end.getTime() !== periodEnd.getTime()
      ) {
        return NextResponse.json(
          errorResponse("Wizard is only available for the immediately previous period"),
          { status: 400 }
        );
      }

      const envelopeRows = computeEnvelopeRemaindersForPeriod(
        budgetPeriodInput,
        ctx.budget.envelopes.map((e) => ({
          id: e.id,
          name: e.name,
          allocation: Number(e.allocation),
          allocationType: e.allocationType,
          carryOverRemainder: e.carryOverRemainder,
        })),
        expensesToPeriodInputs(ctx.expenses),
        periodEnd,
        Number(ctx.budget.amount)
      );

      const remainderByEnvelope = new Map(
        envelopeRows.map((r) => [r.envelopeId, r.remainingThisPeriod])
      );

      const saveGoalIds = new Set(ctx.budget.goals.map((g) => g.id));

      for (const row of parsed.data.allocations) {
        if (row.keepInEnvelope || row.amount <= 0) continue;
        if (!row.goalId || !saveGoalIds.has(row.goalId)) {
          return NextResponse.json(errorResponse("Invalid save goal"), { status: 400 });
        }
        const max = remainderByEnvelope.get(row.envelopeId) ?? 0;
        if (row.amount > max + 0.001) {
          return NextResponse.json(
            errorResponse(`Amount exceeds remaining for envelope ${row.envelopeId}`),
            { status: 400 }
          );
        }
      }

      const goalNames = new Map(
        ctx.budget.goals.map((g) => [g.id, g.name] as const)
      );

      await prisma.$transaction(async (tx) => {
        for (const row of parsed.data.allocations) {
          if (row.keepInEnvelope || row.amount <= 0 || !row.goalId) continue;

          const goalName = goalNames.get(row.goalId);
          if (!goalName) continue;
          const payee = await findOrCreatePayeeForGoalName(budgetId, goalName, tx);

          await tx.expense.create({
            data: {
              amount: row.amount,
              description: "Period remainder allocation",
              date: periodEnd,
              payeeId: payee.id,
              envelopeId: row.envelopeId,
              goalId: row.goalId,
              createdById: session.user!.id,
            },
          });
        }

        await tx.remainderWizardState.upsert({
          where: {
            budgetId_periodStart_periodEnd: {
              budgetId,
              periodStart,
              periodEnd,
            },
          },
          create: {
            budgetId,
            periodStart,
            periodEnd,
            status: "COMPLETED",
            userId: session.user!.id,
          },
          update: {
            status: "COMPLETED",
            userId: session.user!.id,
          },
        });
      });

      return NextResponse.json(successResponse({ ok: true }));
    }

    return NextResponse.json(errorResponse("Invalid action"), { status: 400 });
  } catch (error) {
    console.error("Error in remainder wizard:", error);
    return NextResponse.json(errorResponse("Wizard action failed"), { status: 500 });
  }
}
