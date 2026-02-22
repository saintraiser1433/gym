import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

/** Returns attendance state for a client + schedule today: none | checked_in | completed */
export async function GET(req: NextRequest) {
  await requireCoach();

  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId")?.trim();
  const scheduleId = url.searchParams.get("scheduleId")?.trim();

  if (!clientId || !scheduleId) {
    return NextResponse.json(
      { error: "clientId and scheduleId required" },
      { status: 400 },
    );
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const open = await prisma.attendance.findFirst({
    where: {
      clientId,
      scheduleId,
      checkInTime: { gte: startOfToday, lt: endOfToday },
      checkOutTime: null,
    },
  });

  if (open) {
    return NextResponse.json({ status: "checked_in" });
  }

  const completed = await prisma.attendance.findFirst({
    where: {
      clientId,
      scheduleId,
      checkInTime: { gte: startOfToday, lt: endOfToday },
      checkOutTime: { not: null },
    },
  });

  if (completed) {
    return NextResponse.json({ status: "completed" });
  }

  return NextResponse.json({ status: "none" });
}
