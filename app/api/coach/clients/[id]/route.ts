import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const session = await requireCoach();
  const userId = (session.user as any).id as string;

  const coach = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!coach) {
    return NextResponse.json(
      { error: "Coach profile not found" },
      { status: 404 },
    );
  }

  const client = await prisma.clientProfile.findFirst({
    where: { id, assignedCoachId: coach.id },
    include: {
      user: true,
      goals: { include: { goal: true }, orderBy: { deadline: "asc" } },
      workoutAssignments: {
        include: { workout: { select: { id: true, name: true } } },
        orderBy: { startDate: "desc" },
      },
      memberships: {
        include: { membership: true },
        orderBy: { startDate: "desc" },
      },
    },
  });

  if (!client) {
    return NextResponse.json(
      { error: "Client not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: client });
}

