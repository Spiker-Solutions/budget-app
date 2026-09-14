import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/utils";
import { createGoalSchema } from "@/lib/validations";
import { checkBudgetGoalAccess } from "@/lib/goal-access";
import { activeOnly, isArchived } from "@/lib/archive";
import { canManageBudget } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
  }

  const budgetId = new URL(req.url).searchParams.get("budgetId");
  if (!budgetId) {
    return NextResponse.json(errorResponse("Budget ID is required"), { status: 400 });
  }

  try {
    const membership = await checkBudgetGoalAccess(budgetId, session.user.id);
    if (!membership) {
      return NextResponse.json(errorResponse("Budget not found"), { status: 404 });
    }

    const goals = await prisma.goal.findMany({
      where: { budgetId, ...activeOnly },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(successResponse(goals));
  } catch (error) {
    console.error("Error fetching goals:", error);
    return NextResponse.json(errorResponse("Failed to fetch goals"), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
  }

  try {
    const body = await req.json();
    const result = createGoalSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.errors[0].message),
        { status: 400 }
      );
    }

    const { budgetId, ...data } = result.data;

    const membership = await checkBudgetGoalAccess(budgetId, session.user.id);
    if (!membership || !canManageBudget(membership.role)) {
      return NextResponse.json(errorResponse("Forbidden"), { status: 403 });
    }

    const budget = await prisma.budget.findUnique({
      where: { id: budgetId },
      select: { archivedAt: true },
    });
    if (!budget || isArchived(budget.archivedAt)) {
      return NextResponse.json(errorResponse("Budget not found"), { status: 404 });
    }

    const goal = await prisma.goal.create({
      data: {
        ...data,
        budgetId,
      },
    });

    return NextResponse.json(successResponse(goal), { status: 201 });
  } catch (error) {
    console.error("Error creating goal:", error);
    return NextResponse.json(errorResponse("Failed to create goal"), { status: 500 });
  }
}
