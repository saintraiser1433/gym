import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

/** Returns attendance state for this client + schedule on a given date: none | checked_in | completed */
export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireClient();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id as string;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ status: "none" });
  }

  const url = new URL(req.url);
  const scheduleId = url.searchParams.get("scheduleId")?.trim();
  const dateParam = url.searchParams.get("date");

  if (!scheduleId) {
    return NextResponse.json({ error: "scheduleId required" }, { status: 400 });
  }

  let startOfDay: Date;
  let endOfDay: Date;
  if (dateParam) {
    const d = new Date(dateParam);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    startOfDay = new Date(d);
    startOfDay.setHours(0, 0, 0, 0);
    endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
  } else {
    startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
  }

  const open = await prisma.attendance.findFirst({
    where: {
      clientId: profile.id,
      scheduleId,
      checkInTime: { gte: startOfDay, lt: endOfDay },
      checkOutTime: null,
    },
  });
  if (open) {
    return NextResponse.json({ status: "checked_in" });
  }

  const completed = await prisma.attendance.findFirst({
    where: {
      clientId: profile.id,
      scheduleId,
      checkInTime: { gte: startOfDay, lt: endOfDay },
      checkOutTime: { not: null },
    },
  });
  if (completed) {
    return NextResponse.json({ status: "completed" });
  }

  return NextResponse.json({ status: "none" });
}
