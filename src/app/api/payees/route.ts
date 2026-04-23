import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, normalizePayeeName } from "@/lib/utils";
import { createPayeeSchema } from "@/lib/validations";

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

    const payees = await prisma.payee.findMany({
      where: { budgetId },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(successResponse(payees));
  } catch (error) {
    console.error("Error fetching payees:", error);
    return NextResponse.json(
      errorResponse("Failed to fetch payees"),
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
    const result = createPayeeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.errors[0].message),
        { status: 400 }
      );
    }

    const { name, budgetId } = result.data;

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

    const normalizedName = normalizePayeeName(name);

    const existingPayee = await prisma.payee.findUnique({
      where: {
        budgetId_normalizedName: {
          budgetId,
          normalizedName,
        },
      },
    });

    if (existingPayee) {
      return NextResponse.json(successResponse(existingPayee));
    }

    const payee = await prisma.payee.create({
      data: {
        name: name.trim(),
        normalizedName,
        budgetId,
      },
    });

    return NextResponse.json(successResponse(payee), { status: 201 });
  } catch (error) {
    console.error("Error creating payee:", error);
    return NextResponse.json(
      errorResponse("Failed to create payee"),
      { status: 500 }
    );
  }
}
