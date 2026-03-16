import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";
import { recalculateClientGoalProgress } from "@/lib/goal-progress";

/** Coach checks out a client (finds open attendance for client+schedule and sets checkOutTime). */
export async function POST(req: NextRequest) {
  await requireCoach();

  const body = await req.json().catch(() => ({}));
  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : null;
  const scheduleId = typeof body.scheduleId === "string" ? body.scheduleId.trim() : null;
  if (!clientId || !scheduleId) {
    return NextResponse.json({ error: "clientId and scheduleId required" }, { status: 400 });
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const attendance = await prisma.attendance.findFirst({
    where: {
      clientId,
      scheduleId,
      checkInTime: { gte: startOfToday, lt: endOfToday },
      checkOutTime: null,
    },
    orderBy: { checkInTime: "desc" },
    include: { schedule: true },
  });
  if (!attendance) {
    return NextResponse.json(
      { error: "No active check-in found for this client and session" },
      { status: 404 },
    );
  }

  const now = new Date();
  if (attendance.schedule) {
    const start = new Date(attendance.schedule.startTime);
    const end = new Date(attendance.schedule.endTime);
    if (now < start || now > end) {
      const fmt = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      return NextResponse.json(
        {
          error: `Check-out is only allowed during the scheduled slot (${fmt(start)}–${fmt(end)}). You cannot check out during a different time slot.`,
        },
        { status: 403 },
      );
    }
  }

  const updated = await prisma.attendance.update({
    where: { id: attendance.id },
    data: { checkOutTime: now },
    include: { schedule: true, client: { include: { user: true } } },
  });

  await recalculateClientGoalProgress(clientId);

  return NextResponse.json(updated);
}
