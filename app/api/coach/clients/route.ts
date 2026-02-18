import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

export async function GET() {
  const session = await requireCoach();
  const userId = (session.user as any).id as string;

  const coach = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!coach) {
    return NextResponse.json({ data: [] });
  }

  const clients = await prisma.clientProfile.findMany({
    where: { assignedCoachId: coach.id },
    include: { user: true },
  });

  return NextResponse.json({ data: clients });
}

