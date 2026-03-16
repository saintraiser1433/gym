import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

/** Self-service check-in for Basic (no coach) clients only. */
export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: "Client profile not found" }, { status: 404 });
  }

  const active = await prisma.clientMembership.findFirst({
    where: { clientId: profile.id, status: "ACTIVE" },
    include: { membership: { select: { hasCoach: true, type: true } } },
  });
  const isPremium = active?.membership?.type === "PREMIUM" || active?.membership?.hasCoach === true;
  if (isPremium) {
    return NextResponse.json(
      { error: "Premium members are checked in by the coach via QR. Use the QR code at the gym." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const scheduleId = typeof body.scheduleId === "string" ? body.scheduleId.trim() : null;
  if (!scheduleId) {
    return NextResponse.json({ error: "scheduleId required" }, { status: 400 });
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

  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const alreadyOpen = await prisma.attendance.findFirst({
    where: {
      clientId: profile.id,
      scheduleId,
      checkInTime: { gte: startOfToday, lt: endOfToday },
      checkOutTime: null,
    },
  });
  if (alreadyOpen) {
    return NextResponse.json({ error: "You are already checked in to this session", attendance: alreadyOpen }, { status: 400 });
  }

  const alreadyCompleted = await prisma.attendance.findFirst({
    where: {
      clientId: profile.id,
      scheduleId,
      checkInTime: { gte: startOfToday, lt: endOfToday },
      checkOutTime: { not: null },
    },
  });
  if (alreadyCompleted) {
    return NextResponse.json({ error: "Already attended this session" }, { status: 400 });
  }

  const attendance = await prisma.attendance.create({
    data: {
      clientId: profile.id,
      scheduleId,
      method: "MANUAL",
    },
    include: { schedule: true },
  });

  return NextResponse.json(attendance, { status: 201 });
}
