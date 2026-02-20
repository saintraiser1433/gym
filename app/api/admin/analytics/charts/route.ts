import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  startOfDay,
  subDays,
  startOfMonth,
  subMonths,
  endOfMonth,
  format,
} from "date-fns";

export async function GET() {
  await requireAdmin();

  const now = new Date();

  // Attendance by day (last 14 days)
  const days = 14;
  const dayStart = startOfDay(subDays(now, days));
  const attendances = await prisma.attendance.findMany({
    where: { checkInTime: { gte: dayStart } },
    select: { checkInTime: true },
  });

  const dayCounts: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = startOfDay(subDays(now, days - 1 - i));
    dayCounts[format(d, "yyyy-MM-dd")] = 0;
  }
  for (const a of attendances) {
    const key = format(startOfDay(a.checkInTime), "yyyy-MM-dd");
    if (key in dayCounts) dayCounts[key]++;
  }
  const attendanceByDay = Object.entries(dayCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // Revenue by month (last 6 months)
  const monthsCount = 6;
  const monthBuckets: { month: string; total: number }[] = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    const start = startOfMonth(subMonths(now, i));
    const end = endOfMonth(start);
    const result = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        date: { gte: start, lte: end },
        status: "COMPLETED",
      },
    });
    monthBuckets.push({
      month: format(start, "MMM yyyy"),
      total: result._sum.amount ?? 0,
    });
  }

  return NextResponse.json({
    attendanceByDay,
    revenueByMonth: monthBuckets,
  });
}
