import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/utils";
import { createExpenseSchema } from "@/lib/validations";

async function checkEnvelopeAccess(envelopeId: string, userId: string) {
  const envelope = await prisma.envelope.findUnique({
    where: { id: envelopeId },
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
  });

  if (!envelope) return null;

  const budgetMembership = envelope.budget.members[0];
  const envelopeMembership = envelope.members[0];

  if (!budgetMembership && !envelopeMembership) return null;

  return envelope;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const envelopeId = searchParams.get("envelopeId");
  const budgetId = searchParams.get("budgetId");

  try {
    let whereClause: Record<string, unknown> = {};

    if (envelopeId) {
      const envelope = await checkEnvelopeAccess(envelopeId, session.user.id);
      if (!envelope) {
        return NextResponse.json(errorResponse("Envelope not found"), { status: 404 });
      }
      whereClause = { envelopeId };
    } else if (budgetId) {
      const membership = await prisma.budgetUser.findUnique({
        where: {
          userId_budgetId: {
            userId: session.user.id,
            budgetId,
          },
        },
      });
      if (!membership) {
        return NextResponse.json(errorResponse("Budget not found"), { status: 404 });
      }
      whereClause = {
        envelope: {
          budgetId,
        },
      };
    } else {
      whereClause = {
        envelope: {
          budget: {
            members: {
              some: {
                userId: session.user.id,
              },
            },
          },
        },
      };
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
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
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json(successResponse(expenses));
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      errorResponse("Failed to fetch expenses"),
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
    const result = createExpenseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.errors[0].message),
        { status: 400 }
      );
    }

    const { amount, payee, description, location, date, envelopeId, budgetId, isRecurring, recurrence } = result.data;

    const membership = await prisma.budgetUser.findUnique({
      where: {
        userId_budgetId: {
          userId: session.user.id,
          budgetId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(errorResponse("Budget not found"), { status: 404 });
    }

    if (envelopeId) {
      const envelope = await checkEnvelopeAccess(envelopeId, session.user.id);
      if (!envelope || envelope.budgetId !== budgetId) {
        return NextResponse.json(errorResponse("Envelope not found"), { status: 404 });
      }
    }

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

    const expense = await prisma.expense.create({
      data: {
        amount,
        description,
        location,
        date: date ? new Date(date) : new Date(),
        isRecurring,
        recurrence: recurrence === "NONE" ? null : recurrence,
        payeeId: payeeRecord.id,
        envelopeId,
        createdById: session.user.id,
      },
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

    return NextResponse.json(successResponse(expense), { status: 201 });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      errorResponse("Failed to create expense"),
      { status: 500 }
    );
  }
}
