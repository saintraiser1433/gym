import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { recalculateClientGoalProgress } from "@/lib/goal-progress";

type Params = { params: Promise<{ id: string }> };

/** Client self-service check-out. */
export async function PATCH(_req: Request, { params }: Params) {
  let session;
  try {
    session = await requireClient();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id as string;
  const { id } = await params;

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
      { error: "Premium members are checked out by the coach. Your coach will record attendance at the gym." },
      { status: 403 },
    );
  }

  const attendance = await prisma.attendance.findFirst({
    where: { id, clientId: profile.id, checkOutTime: null },
    include: { schedule: true },
  });
  if (!attendance) {
    return NextResponse.json({ error: "Attendance not found or already checked out" }, { status: 404 });
  }

  const now = new Date();
  if (attendance.schedule) {
    const start = new Date(attendance.schedule.startTime);
    const end = new Date(attendance.schedule.endTime);
    if (now < start || now > end) {
      const fmt = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      return NextResponse.json(
        {
          error: `Check-out is only allowed during your scheduled slot (${fmt(start)}–${fmt(end)}). You cannot check out during a different time slot.`,
        },
        { status: 403 },
      );
    }
  }

  const updated = await prisma.attendance.update({
    where: { id },
    data: { checkOutTime: now },
    include: { schedule: true },
  });

  await recalculateClientGoalProgress(profile.id);

  return NextResponse.json(updated);
}
