import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/utils";
import { createBudgetSchema } from "@/lib/validations";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
  }

  try {
    const budgets = await prisma.budget.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
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
        _count: {
          select: {
            envelopes: true,
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(successResponse(budgets));
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return NextResponse.json(
      errorResponse("Failed to fetch budgets"),
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
    const result = createBudgetSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.errors[0].message),
        { status: 400 }
      );
    }

    const { name, amount, description, currency, periodType, periodDay, customDays, startDate } = result.data;

    const budget = await prisma.budget.create({
      data: {
        name,
        amount,
        description,
        currency,
        periodType,
        periodDay,
        customDays,
        startDate: startDate ? new Date(startDate) : null,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
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

    return NextResponse.json(successResponse(budget), { status: 201 });
  } catch (error) {
    console.error("Error creating budget:", error);
    return NextResponse.json(
      errorResponse("Failed to create budget"),
      { status: 500 }
    );
  }
}
