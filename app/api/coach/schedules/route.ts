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

  const schedules = await prisma.schedule.findMany({
    where: { coachId: coach.id },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json({ data: schedules });
}

