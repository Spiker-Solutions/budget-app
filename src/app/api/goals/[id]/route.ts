import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/utils";
import { updateGoalSchema } from "@/lib/validations";
import { getGoalForUser } from "@/lib/goal-access";
import { canManageBudget } from "@/lib/permissions";
import { isArchived } from "@/lib/archive";
import type { GoalType } from "@prisma/client";

function validateGoalAmounts(
  type: GoalType,
  startingAmount: number,
  targetAmount: number
): string | null {
  if (type === "SAVE" && targetAmount <= startingAmount) {
    return "Save target must be greater than starting saved amount";
  }
  if (type === "DEBT" && targetAmount > startingAmount) {
    return "Payoff target cannot exceed starting balance owed";
  }
  return null;
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
    const goal = await getGoalForUser(id, session.user.id);
    if (!goal) {
      return NextResponse.json(errorResponse("Goal not found"), { status: 404 });
    }

    return NextResponse.json(successResponse(goal));
  } catch (error) {
    console.error("Error fetching goal:", error);
    return NextResponse.json(errorResponse("Failed to fetch goal"), { status: 404 });
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
    const existing = await getGoalForUser(id, session.user.id);
    if (!existing) {
      return NextResponse.json(errorResponse("Goal not found"), { status: 404 });
    }

    const role = existing.budget.members[0]?.role;
    if (!role || !canManageBudget(role)) {
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });
    }

    const body = await req.json();
    const result = updateGoalSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.errors[0].message),
        { status: 400 }
      );
    }

    const startingAmount =
      result.data.startingAmount ?? Number(existing.startingAmount);
    const targetAmount = result.data.targetAmount ?? Number(existing.targetAmount);
    const amountError = validateGoalAmounts(existing.type, startingAmount, targetAmount);
    if (amountError) {
      return NextResponse.json(errorResponse(amountError), { status: 400 });
    }

    const goal = await prisma.goal.update({
      where: { id },
      data: result.data,
    });

    return NextResponse.json(successResponse(goal));
  } catch (error) {
    console.error("Error updating goal:", error);
    return NextResponse.json(errorResponse("Failed to update goal"), { status: 500 });
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
    const existing = await getGoalForUser(id, session.user.id);
    if (!existing) {
      return NextResponse.json(errorResponse("Goal not found"), { status: 404 });
    }

    const role = existing.budget.members[0]?.role;
    if (!role || !canManageBudget(role)) {
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });
    }

    if (isArchived(existing.archivedAt)) {
      return NextResponse.json(errorResponse("Goal already archived"), { status: 400 });
    }

    await prisma.goal.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    return NextResponse.json(successResponse({ id }));
  } catch (error) {
    console.error("Error archiving goal:", error);
    return NextResponse.json(errorResponse("Failed to archive goal"), { status: 500 });
  }
}
