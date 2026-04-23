import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/utils";
import { updateBudgetSchema } from "@/lib/validations";

async function checkBudgetAccess(budgetId: string, userId: string, requireAdmin = false) {
  const membership = await prisma.budgetUser.findUnique({
    where: {
      userId_budgetId: {
        userId,
        budgetId,
      },
    },
  });

  if (!membership) return null;
  if (requireAdmin && membership.role !== "ADMIN") return null;

  return membership;
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
    const membership = await checkBudgetAccess(id, session.user.id);

    if (!membership) {
      return NextResponse.json(errorResponse("Budget not found"), { status: 404 });
    }

    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        envelopes: {
          include: {
            _count: {
              select: { expenses: true },
            },
          },
        },
        payees: true,
      },
    });

    return NextResponse.json(successResponse(budget));
  } catch (error) {
    console.error("Error fetching budget:", error);
    return NextResponse.json(
      errorResponse("Failed to fetch budget"),
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
    const membership = await checkBudgetAccess(id, session.user.id, true);

    if (!membership) {
      return NextResponse.json(
        errorResponse("You don't have permission to edit this budget"),
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = updateBudgetSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.errors[0].message),
        { status: 400 }
      );
    }

    const updateData = {
      ...result.data,
      startDate: result.data.startDate ? new Date(result.data.startDate) : undefined,
    };

    const budget = await prisma.budget.update({
      where: { id },
      data: updateData,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        envelopes: true,
        payees: true,
      },
    });

    return NextResponse.json(successResponse(budget));
  } catch (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json(
      errorResponse("Failed to update budget"),
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
    const membership = await checkBudgetAccess(id, session.user.id, true);

    if (!membership) {
      return NextResponse.json(
        errorResponse("You don't have permission to delete this budget"),
        { status: 403 }
      );
    }

    await prisma.budget.delete({
      where: { id },
    });

    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error) {
    console.error("Error deleting budget:", error);
    return NextResponse.json(
      errorResponse("Failed to delete budget"),
      { status: 500 }
    );
  }
}
