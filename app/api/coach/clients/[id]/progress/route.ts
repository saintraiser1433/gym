import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
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
    where: { id: params.id, assignedCoachId: coach.id },
    select: { id: true },
  });

  if (!client) {
    return NextResponse.json(
      { error: "Client not found" },
      { status: 404 },
    );
  }

  const progress = await prisma.workoutProgress.findMany({
    where: { clientId: client.id },
    orderBy: { completedDate: "desc" },
  });

  return NextResponse.json({ data: progress });
}

