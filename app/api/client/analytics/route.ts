import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { startOfDay, startOfWeek, subWeeks, format } from "date-fns";

export async function GET() {
  const session = await requireClient();
  const userId = (session.user as { id?: string }).id as string;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ attendanceByWeek: [], attendanceThisMonth: 0 });
  }

  const now = new Date();
  const weeksCount = 4;
  const weekStarts: { weekStart: string; count: number }[] = [];
  for (let i = weeksCount - 1; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const weekEnd = startOfWeek(subWeeks(now, i - 1), { weekStartsOn: 1 });
    const count = await prisma.attendance.count({
      where: {
        clientId: profile.id,
        checkInTime: { gte: weekStart, lt: weekEnd },
      },
    });
    weekStarts.push({
      weekStart: format(weekStart, "MMM d"),
      count,
    });
  }

  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const attendanceThisMonth = await prisma.attendance.count({
    where: {
      clientId: profile.id,
      checkInTime: { gte: startOfThisMonth },
    },
  });

  return NextResponse.json({
    attendanceByWeek: weekStarts,
    attendanceThisMonth,
  });
}
