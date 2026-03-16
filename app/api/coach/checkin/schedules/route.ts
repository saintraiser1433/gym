import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

/** Returns today's schedules for this coach (for check-in dropdown). */
export async function GET() {
  const session = await requireCoach();
  const userId = (session.user as { id?: string }).id as string;

  const coach = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!coach) {
    return NextResponse.json({ data: [] });
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const schedules = await prisma.schedule.findMany({
    where: {
      coachId: coach.id,
      startTime: { gte: startOfToday, lt: endOfToday },
    },
    orderBy: { startTime: "asc" },
    select: { id: true, title: true, startTime: true, endTime: true },
  });

  return NextResponse.json({ data: schedules });
}
