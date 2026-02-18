import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();

  const [totalMembers, activeMemberships, todaysAttendance, revenueThisMonth] =
    await Promise.all([
      prisma.clientProfile.count(),
      prisma.clientMembership.count({ where: { status: "ACTIVE" } }),
      prisma.attendance.count({
        where: {
          checkInTime: {
            gte: new Date(new Date().toDateString()),
          },
        },
      }),
      (async () => {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const payments = await prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            date: { gte: startOfMonth },
            status: "COMPLETED",
          },
        });
        return payments._sum.amount ?? 0;
      })(),
    ]);

  return NextResponse.json({
    totalMembers,
    activeMemberships,
    todaysAttendance,
    revenueThisMonth,
  });
}

