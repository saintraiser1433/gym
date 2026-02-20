import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

/** Schedules exclusive to this client: sessions they have attendance for (their schedule). */
export async function GET() {
  let session;
  try {
    session = await requireClient();
  } catch {
    return NextResponse.json({ error: "Unauthorized", data: [] }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ data: [] });
  }

  const attendances = await prisma.attendance.findMany({
    where: { clientId: profile.id, scheduleId: { not: null } },
    select: { scheduleId: true },
  });

  const scheduleIds = [...new Set(attendances.map((a) => a.scheduleId).filter((id): id is string => id != null))];

  if (scheduleIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const schedules = await prisma.schedule.findMany({
    where: { id: { in: scheduleIds } },
    orderBy: { startTime: "asc" },
    include: { coach: { include: { user: true } } },
  });

  return NextResponse.json({ data: schedules });
}
