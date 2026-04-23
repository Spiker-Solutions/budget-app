import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse } from "@/lib/utils";
import { updateEnvelopeSchema } from "@/lib/validations";

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

  const isAdmin = budgetMembership?.role === "ADMIN" || envelopeMembership?.role === "ADMIN";

  return { envelope, isAdmin };
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
    const access = await checkEnvelopeAccess(id, session.user.id);

    if (!access) {
      return NextResponse.json(errorResponse("Envelope not found"), { status: 404 });
    }

    const envelope = await prisma.envelope.findUnique({
      where: { id },
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
          include: {
            payee: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: { date: "desc" },
        },
        _count: {
          select: { expenses: true },
        },
      },
    });

    return NextResponse.json(successResponse(envelope));
  } catch (error) {
    console.error("Error fetching envelope:", error);
    return NextResponse.json(
      errorResponse("Failed to fetch envelope"),
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
    const access = await checkEnvelopeAccess(id, session.user.id);

    if (!access) {
      return NextResponse.json(errorResponse("Envelope not found"), { status: 404 });
    }

    if (!access.isAdmin) {
      return NextResponse.json(
        errorResponse("Only admins can edit envelopes"),
        { status: 403 }
      );
    }

    const body = await req.json();
    const result = updateEnvelopeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        errorResponse(result.error.errors[0].message),
        { status: 400 }
      );
    }

    const envelope = await prisma.envelope.update({
      where: { id },
      data: result.data,
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

    return NextResponse.json(successResponse(envelope));
  } catch (error) {
    console.error("Error updating envelope:", error);
    return NextResponse.json(
      errorResponse("Failed to update envelope"),
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
    const access = await checkEnvelopeAccess(id, session.user.id);

    if (!access) {
      return NextResponse.json(errorResponse("Envelope not found"), { status: 404 });
    }

    if (!access.isAdmin) {
      return NextResponse.json(
        errorResponse("Only admins can delete envelopes"),
        { status: 403 }
      );
    }

    await prisma.envelope.delete({
      where: { id },
    });

    return NextResponse.json(successResponse({ deleted: true }));
  } catch (error) {
    console.error("Error deleting envelope:", error);
    return NextResponse.json(
      errorResponse("Failed to delete envelope"),
      { status: 500 }
    );
  }
}
