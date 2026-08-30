import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/utils";
import { updateExpenseSchema } from "@/lib/validations";

async function checkExpenseAccess(expenseId: string, userId: string) {
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

  const isAdmin = 
    budgetMembership?.role === "ADMIN" || 
    budgetMembership?.role === "OWNER" ||
    envelopeMembership?.role === "ADMIN" ||
    envelopeMembership?.role === "OWNER";
  const isCreator = expense.createdById === userId;

  return { expense, isAdmin, isCreator };
}

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
        payee: true,
        envelope: {
          include: {
            budget: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
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

  try {
    const access = await checkExpenseAccess(id, session.user.id);

    if (!access) {
      return NextResponse.json(errorResponse("Expense not found"), { status: 404 });
    }

    if (!access.isAdmin && !access.isCreator) {
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
        where: { id: envelopeId },
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

    if (date) {
      updateData.date = new Date(date);
    }

    if (recurrence !== undefined) {
      updateData.recurrence = recurrence === "NONE" ? null : recurrence;
    }

    if (payee !== undefined) {
      const normalizedPayeeName = payee.trim().toLowerCase();
      let payeeRecord = await prisma.payee.findUnique({
        where: {
          budgetId_normalizedName: {
            budgetId,
            normalizedName: normalizedPayeeName,
          },
        },
      });

      if (!payeeRecord) {
        payeeRecord = await prisma.payee.create({
          data: {
            name: payee.trim(),
            normalizedName: normalizedPayeeName,
            budgetId,
          },
        });
      }

      updateData.payeeId = payeeRecord.id;
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: updateData,
      include: {
        payee: true,
        envelope: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(successResponse(expense));
  } catch (error) {
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

    if (!access.isAdmin && !access.isCreator) {
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
