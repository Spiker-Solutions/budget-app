import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/utils";
import { updateExpenseSchema } from "@/lib/validations";
import { checkExpenseAccess } from "@/lib/expense-access";
import { expenseInclude } from "@/lib/expense-queries";
import {
  assertExpenseAmountCoversRefunds,
  mapRefundGuardError,
} from "@/lib/refund-guard";
import { activeOnly, isArchived } from "@/lib/archive";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
  }

  const { id } = await params;

  try {
    const access = await checkExpenseAccess(id, session.user.id);

    if (!access) {
      return NextResponse.json(errorResponse("Expense not found"), { status: 404 });
    }

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        ...expenseInclude,
        envelope: {
          include: {
            budget: true,
          },
        },
      },
    });

    return NextResponse.json(successResponse(expense));
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json(
      errorResponse("Failed to fetch expense"),
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
  }

  const { id } = await params;
  let currency: string | undefined;

  try {
    const access = await checkExpenseAccess(id, session.user.id);

    if (!access) {
      return NextResponse.json(errorResponse("Expense not found"), { status: 404 });
    }

    currency = access.expense.envelope.budget.currency;

    if (!access.canWrite) {
      return NextResponse.json(
        errorResponse("You can only edit your own expenses"),
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = updateExpenseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.errors[0].message),
        { status: 400 }
      );
    }

    const {
      payee,
      budgetId: _budgetId,
      date,
      recurrence,
      envelopeId,
      ...rest
    } = result.data;

    const budgetId = access.expense.envelope.budgetId;

    if (envelopeId && envelopeId !== access.expense.envelopeId) {
      const envelope = await prisma.envelope.findUnique({
        where: { id: envelopeId, ...activeOnly },
      });
      if (!envelope || envelope.budgetId !== budgetId) {
        return NextResponse.json(
          errorResponse("Envelope not found"),
          { status: 404 }
        );
      }
    }

    const updateData: Record<string, unknown> = { ...rest };

    if (envelopeId) {
      updateData.envelopeId = envelopeId;
    }

    const newDate = date ? new Date(date) : null;
    if (newDate) {
      updateData.date = newDate;
    }

    if (recurrence !== undefined) {
      updateData.recurrence = recurrence === "NONE" ? null : recurrence;
    }

    // Refunds mirror the expense date, so a date change has to propagate to
    // them or they would drift into a different budget period than the
    // expense they offset.
    const dateChanged =
      newDate !== null && newDate.getTime() !== access.expense.date.getTime();

    const expense = await prisma.$transaction(async (tx) => {
      if (rest.amount !== undefined) {
        await assertExpenseAmountCoversRefunds(tx, {
          expenseId: id,
          newAmount: rest.amount,
        });
      }

      if (payee !== undefined) {
        const normalizedPayeeName = payee.trim().toLowerCase();
        let payeeRecord = await tx.payee.findUnique({
          where: {
            budgetId_normalizedName: {
              budgetId,
              normalizedName: normalizedPayeeName,
            },
          },
        });

        if (!payeeRecord) {
          payeeRecord = await tx.payee.create({
            data: {
              name: payee.trim(),
              normalizedName: normalizedPayeeName,
              budgetId,
            },
          });
        }

        updateData.payeeId = payeeRecord.id;
      }

      const updated = await tx.expense.update({
        where: { id },
        data: updateData,
        include: expenseInclude,
      });

      if (dateChanged && newDate) {
        await tx.refund.updateMany({
          where: { expenseId: id },
          data: { date: newDate },
        });

        return tx.expense.findUniqueOrThrow({
          where: { id },
          include: expenseInclude,
        });
      }

      return updated;
    });

    return NextResponse.json(successResponse(expense));
  } catch (error) {
    const guardError = mapRefundGuardError(error, currency);
    if (guardError) {
      return NextResponse.json(errorResponse(guardError.message), {
        status: guardError.status,
      });
    }

    console.error("Error updating expense:", error);
    return NextResponse.json(
      errorResponse("Failed to update expense"),
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
  }

  const { id } = await params;

  try {
    const access = await checkExpenseAccess(id, session.user.id);

    if (!access) {
      return NextResponse.json(errorResponse("Expense not found"), { status: 404 });
    }

    if (!access.canWrite) {
      return NextResponse.json(
        errorResponse("You can only delete your own expenses"),
        { status: 403 }
      );
    }

    await prisma.expense.delete({
      where: { id },
    });

    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      errorResponse("Failed to delete expense"),
      { status: 500 }
    );
  }
}
