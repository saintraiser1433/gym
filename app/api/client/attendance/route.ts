import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

function addScheduleMetrics(r: {
  checkInTime: Date | string;
  checkOutTime: Date | string | null;
  schedule?: { startTime: Date | string; endTime: Date | string } | null;
}) {
  const checkIn = new Date(r.checkInTime);
  const schedule = r.schedule;
  const scheduleStart = schedule ? new Date(schedule.startTime) : null;
  const scheduleEnd = schedule ? new Date(schedule.endTime) : null;
  const checkOut = r.checkOutTime ? new Date(r.checkOutTime) : null;

  const lateMinutes =
    scheduleStart && checkIn > scheduleStart
      ? Math.round((checkIn.getTime() - scheduleStart.getTime()) / 60000)
      : 0;
  const undertimeMinutes =
    scheduleEnd && checkOut && checkOut < scheduleEnd
      ? Math.round((scheduleEnd.getTime() - checkOut.getTime()) / 60000)
      : null;

  return {
    ...r,
    scheduleStart: scheduleStart?.toISOString() ?? null,
    scheduleEnd: scheduleEnd?.toISOString() ?? null,
    lateMinutes,
    undertimeMinutes,
  };
}

export async function GET() {
  const session = await requireClient();
  const userId = (session.user as any).id as string;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ data: [] });
  }

  const records = await prisma.attendance.findMany({
    where: { clientId: profile.id },
    orderBy: { checkInTime: "desc" },
    include: {
      schedule: true,
    },
  });

  const data = records.map((r) => addScheduleMetrics(r));
  return NextResponse.json({ data });
}

