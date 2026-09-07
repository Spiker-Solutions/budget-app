import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/utils";
import { updateRefundSchema } from "@/lib/validations";
import { checkRefundAccess } from "@/lib/expense-access";
import { refundInclude } from "@/lib/expense-queries";
import { assertRefundFitsExpense, mapRefundGuardError } from "@/lib/refund-guard";

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
    const access = await checkRefundAccess(id, session.user.id);

    if (!access) {
      return NextResponse.json(errorResponse("Refund not found"), { status: 404 });
    }

    currency = access.expense.envelope.budget.currency;

    if (!access.canWrite) {
      return NextResponse.json(
        errorResponse("You can only edit refunds on your own expenses"),
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = updateRefundSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(errorResponse(result.error.errors[0].message), {
        status: 400,
      });
    }

    const { amount, description } = result.data;

    const refund = await prisma.$transaction(async (tx) => {
      if (amount !== undefined) {
        // Excluding this refund lets it grow into the room its own current
        // amount occupies, rather than double-counting itself.
        await assertRefundFitsExpense(tx, {
          expenseId: access.expense.id,
          amount,
          excludeRefundId: id,
        });
      }

      return tx.refund.update({
        where: { id },
        data: {
          ...(amount !== undefined ? { amount } : {}),
          ...(description !== undefined ? { description: description || null } : {}),
        },
        include: refundInclude,
      });
    });

    return NextResponse.json(successResponse(refund));
  } catch (error) {
    const guardError = mapRefundGuardError(error, currency);
    if (guardError) {
      return NextResponse.json(errorResponse(guardError.message), {
        status: guardError.status,
      });
    }

    console.error("Error updating refund:", error);
    return NextResponse.json(errorResponse("Failed to update refund"), {
      status: 500,
    });
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
    const access = await checkRefundAccess(id, session.user.id);

    if (!access) {
      return NextResponse.json(errorResponse("Refund not found"), { status: 404 });
    }

    if (!access.canWrite) {
      return NextResponse.json(
        errorResponse("You can only delete refunds on your own expenses"),
        { status: 403 }
      );
    }

    await prisma.refund.delete({ where: { id } });

    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error) {
    console.error("Error deleting refund:", error);
    return NextResponse.json(errorResponse("Failed to delete refund"), {
      status: 500,
    });
  }
}
