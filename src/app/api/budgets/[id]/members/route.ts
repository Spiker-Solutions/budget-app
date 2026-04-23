import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/utils";
import { inviteMemberSchema } from "@/lib/validations";

async function checkBudgetAdmin(budgetId: string, userId: string) {
  const membership = await prisma.budgetUser.findUnique({
    where: {
      userId_budgetId: {
        userId,
        budgetId,
      },
    },
  });

  return membership?.role === "ADMIN" || membership?.role === "OWNER";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(errorResponse("Unauthorized"), { status: 401 });
  }

  const { id: budgetId } = await params;

  try {
    const isAdmin = await checkBudgetAdmin(budgetId, session.user.id);

    if (!isAdmin) {
      return NextResponse.json(
        errorResponse("Only admins can invite members"),
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = inviteMemberSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.errors[0].message),
        { status: 400 }
      );
    }

    const { email, role } = result.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        errorResponse("User not found. They must create an account first."),
        { status: 404 }
      );
    }

    const existingMembership = await prisma.budgetUser.findUnique({
      where: {
        userId_budgetId: {
          userId: user.id,
          budgetId,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        errorResponse("User is already a member of this budget"),
        { status: 400 }
      );
    }

    const membership = await prisma.budgetUser.create({
      data: {
        userId: user.id,
        budgetId,
        role,
      },
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
    });

    return NextResponse.json(successResponse(membership), { status: 201 });
  } catch (error) {
    console.error("Error inviting member:", error);
    return NextResponse.json(
      errorResponse("Failed to invite member"),
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

  const { id: budgetId } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      errorResponse("User ID is required"),
      { status: 400 }
    );
  }

  try {
    const isAdmin = await checkBudgetAdmin(budgetId, session.user.id);
    const isSelf = userId === session.user.id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        errorResponse("Only admins can remove members"),
        { status: 403 }
      );
    }

    const targetMember = await prisma.budgetUser.findUnique({
      where: {
        userId_budgetId: {
          userId,
          budgetId,
        },
      },
    });

    if (targetMember?.role === "OWNER") {
      return NextResponse.json(
        errorResponse("Cannot remove the owner"),
        { status: 400 }
      );
    }

    await prisma.budgetUser.delete({
      where: {
        userId_budgetId: {
          userId,
          budgetId,
        },
      },
    });

    return NextResponse.json(successResponse({ removed: true }));
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      errorResponse("Failed to remove member"),
      { status: 500 }
    );
  }
}
