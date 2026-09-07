import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/utils";
import { createRefundSchema } from "@/lib/validations";
import { checkExpenseAccess } from "@/lib/expense-access";
import { refundInclude, refundsForExpense } from "@/lib/expense-queries";
import { assertRefundFitsExpense, mapRefundGuardError } from "@/lib/refund-guard";

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

    const refunds = await prisma.refund.findMany({
      where: { expenseId: id },
      include: refundInclude,
      orderBy: refundsForExpense.orderBy,
    });

    return NextResponse.json(successResponse(refunds));
  } catch (error) {
    console.error("Error fetching refunds:", error);
    return NextResponse.json(errorResponse("Failed to fetch refunds"), {
      status: 500,
    });
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

  const { id } = await params;
  const userId = session.user.id;
  let currency: string | undefined;

  try {
    const access = await checkExpenseAccess(id, userId);

    if (!access) {
      return NextResponse.json(errorResponse("Expense not found"), { status: 404 });
    }

    currency = access.expense.envelope.budget.currency;

    if (!access.canWrite) {
      return NextResponse.json(
        errorResponse("You can only add refunds to your own expenses"),
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = createRefundSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(errorResponse(result.error.errors[0].message), {
        status: 400,
      });
    }

    const { amount, description } = result.data;

    const refund = await prisma.$transaction(async (tx) => {
      const expense = await assertRefundFitsExpense(tx, { expenseId: id, amount });

      return tx.refund.create({
        data: {
          amount,
          description,
          // Inherited from the expense, never taken from the request body.
          date: expense.date,
          expenseId: id,
          createdById: userId,
        },
        include: refundInclude,
      });
    });

    return NextResponse.json(successResponse(refund), { status: 201 });
  } catch (error) {
    const guardError = mapRefundGuardError(error, currency);
    if (guardError) {
      return NextResponse.json(errorResponse(guardError.message), {
        status: guardError.status,
      });
    }

    console.error("Error creating refund:", error);
    return NextResponse.json(errorResponse("Failed to create refund"), {
      status: 500,
    });
  }
}
