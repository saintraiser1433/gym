import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await requireCoach();
  const userId = (session.user as any).id as string;
  const body = await req.json();

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

  const { clientId, workoutId, startDate, endDate, frequency } = body;

  const assignment = await prisma.workoutAssignment.create({
    data: {
      clientId,
      workoutId,
      assignedById: coach.id,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      frequency,
    },
  });

  return NextResponse.json(assignment, { status: 201 });
}

