import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/utils";
import { createGoalChargeSchema } from "@/lib/validations";
import { getGoalForUser } from "@/lib/goal-access";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
  }

  const { id: goalId } = await params;

  try {
    const goal = await getGoalForUser(goalId, session.user.id);
    if (!goal) {
      return NextResponse.json(errorResponse("Goal not found"), { status: 404 });
    }

    if (goal.type !== "DEBT") {
      return NextResponse.json(
        errorResponse("Charges are only allowed on debt goals"),
        { status: 400 }
      );
    }

    const body = await req.json();
    const result = createGoalChargeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.errors[0].message),
        { status: 400 }
      );
    }

    const charge = await prisma.goalCharge.create({
      data: {
        goalId,
        amount: result.data.amount,
        date: result.data.date ? new Date(result.data.date) : new Date(),
        description: result.data.description,
        createdById: session.user.id,
      },
    });

    return NextResponse.json(successResponse(charge), { status: 201 });
  } catch (error) {
    console.error("Error creating goal charge:", error);
    return NextResponse.json(errorResponse("Failed to create charge"), { status: 500 });
  }
}
