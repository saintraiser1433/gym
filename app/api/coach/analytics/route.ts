import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";
import { startOfWeek, subWeeks, format } from "date-fns";

export async function GET() {
  const session = await requireCoach();
  const userId = (session.user as { id?: string }).id as string;

  const coach = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!coach) {
    return NextResponse.json({
      sessionsByWeek: [],
      attendanceByWeek: [],
      todaysSessions: 0,
    });
  }

  const now = new Date();
  const weeksCount = 4;
  const sessionsByWeek: { weekStart: string; count: number }[] = [];
  const attendanceByWeek: { weekStart: string; count: number }[] = [];

  for (let i = weeksCount - 1; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const weekEnd = startOfWeek(subWeeks(now, i - 1), { weekStartsOn: 1 });

    const [sessionsCount, attendanceCount] = await Promise.all([
      prisma.schedule.count({
        where: {
          coachId: coach.id,
          startTime: { gte: weekStart, lt: weekEnd },
        },
      }),
      prisma.attendance.count({
        where: {
          schedule: { coachId: coach.id },
          checkInTime: { gte: weekStart, lt: weekEnd },
        },
      }),
    ]);

    const label = format(weekStart, "MMM d");
    sessionsByWeek.push({ weekStart: label, count: sessionsCount });
    attendanceByWeek.push({ weekStart: label, count: attendanceCount });
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const todaysSessions = await prisma.schedule.count({
    where: {
      coachId: coach.id,
      startTime: { gte: todayStart, lt: todayEnd },
    },
  });

  return NextResponse.json({
    sessionsByWeek,
    attendanceByWeek,
    todaysSessions,
  });
}
