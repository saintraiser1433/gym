import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

/** Coach checks in a client via QR (method QR). */
export async function POST(req: NextRequest) {
  await requireCoach();

  const body = await req.json().catch(() => ({}));
  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : null;
  const scheduleId = typeof body.scheduleId === "string" ? body.scheduleId.trim() : null;
  if (!clientId || !scheduleId) {
    return NextResponse.json({ error: "clientId and scheduleId required" }, { status: 400 });
  }

  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
  });
  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (new Date(schedule.startTime) < startOfToday) {
    return NextResponse.json(
      { error: "Cannot check in for a past session." },
      { status: 400 },
    );
  }

  const client = await prisma.clientProfile.findUnique({
    where: { id: clientId },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const alreadyOpen = await prisma.attendance.findFirst({
    where: {
      clientId,
      scheduleId,
      checkInTime: { gte: startOfToday, lt: endOfToday },
      checkOutTime: null,
    },
  });
  if (alreadyOpen) {
    return NextResponse.json(
      { error: "Client is already checked in to this session", attendance: alreadyOpen },
      { status: 400 },
    );
  }

  const alreadyCompleted = await prisma.attendance.findFirst({
    where: {
      clientId,
      scheduleId,
      checkInTime: { gte: startOfToday, lt: endOfToday },
      checkOutTime: { not: null },
    },
  });
  if (alreadyCompleted) {
    return NextResponse.json(
      { error: "Already attended this session" },
      { status: 400 },
    );
  }

  const attendance = await prisma.attendance.create({
    data: {
      clientId,
      scheduleId,
      method: "QR",
    },
    include: { schedule: true, client: { include: { user: true } } },
  });

  return NextResponse.json(attendance, { status: 201 });
}
