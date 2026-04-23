import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/utils";
import { createEnvelopeSchema } from "@/lib/validations";

async function checkBudgetAccess(budgetId: string, userId: string) {
  const membership = await prisma.budgetUser.findUnique({
    where: {
      userId_budgetId: {
        userId,
        budgetId,
      },
    },
  });

  return membership;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const budgetId = searchParams.get("budgetId");

  if (!budgetId) {
    return NextResponse.json(
      errorResponse("Budget ID is required"),
      { status: 400 }
    );
  }

  try {
    const membership = await checkBudgetAccess(budgetId, session.user.id);

    if (!membership) {
      return NextResponse.json(errorResponse("Budget not found"), { status: 404 });
    }

    const envelopes = await prisma.envelope.findMany({
      where: { budgetId },
      include: {
        budget: true,
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
        expenses: {
          orderBy: { date: "desc" },
          take: 5,
        },
        _count: {
          select: { expenses: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(successResponse(envelopes));
  } catch (error) {
    console.error("Error fetching envelopes:", error);
    return NextResponse.json(
      errorResponse("Failed to fetch envelopes"),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
  }

  try {
    const body = await req.json();
    const result = createEnvelopeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.errors[0].message),
        { status: 400 }
      );
    }

    const { name, allocation, description, budgetId, carryOverRemainder } = result.data;

    const membership = await checkBudgetAccess(budgetId, session.user.id);

    if (!membership) {
      return NextResponse.json(errorResponse("Budget not found"), { status: 404 });
    }

    if (membership.role !== "ADMIN" && membership.role !== "OWNER") {
      return NextResponse.json(
        errorResponse("Only admins and owners can create envelopes"),
        { status: 403 }
      );
    }

    const envelope = await prisma.envelope.create({
      data: {
        name,
        allocation,
        description,
        budgetId,
        ...(carryOverRemainder !== undefined ? { carryOverRemainder } : {}),
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
      include: {
        budget: true,
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
        expenses: true,
      },
    });

    return NextResponse.json(successResponse(envelope), { status: 201 });
  } catch (error) {
    console.error("Error creating envelope:", error);
    return NextResponse.json(
      errorResponse("Failed to create envelope"),
      { status: 500 }
    );
  }
}
