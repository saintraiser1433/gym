import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

/** Returns whether the client can log for the given date: hasAttendance + which workout IDs are already logged today (one log per workout per day). */
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
    return NextResponse.json({ hasAttendance: false, loggedWorkoutIds: [] });
  }

  const active = await prisma.clientMembership.findFirst({
    where: { clientId: profile.id, status: "ACTIVE" },
    include: { membership: { select: { hasCoach: true, type: true } } },
  });
  const isPremium = active?.membership?.type === "PREMIUM" || active?.membership?.hasCoach === true;
  if (isPremium) {
    return NextResponse.json({ hasAttendance: false, loggedWorkoutIds: [], reason: "Your coach logs sessions for you." });
  }

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const d = new Date(dateParam);
  if (Number.isNaN(d.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const startOfDayUTC = new Date(Date.UTC(y, m, day, 0, 0, 0, 0));
  const endOfDayUTC = new Date(Date.UTC(y, m, day, 23, 59, 59, 999));

  const hasAttendance = await prisma.attendance.findFirst({
    where: {
      clientId: profile.id,
      checkInTime: { gte: startOfDayUTC, lte: endOfDayUTC },
    },
  });

  const progressToday = await prisma.workoutProgress.findMany({
    where: {
      clientId: profile.id,
      completedDate: { gte: startOfDayUTC, lte: endOfDayUTC },
    },
    select: {
      workoutId: true,
      workoutExercise: { select: { workoutId: true } },
    },
  });
  const loggedWorkoutIds = [...new Set(progressToday.map((p) => p.workoutId ?? p.workoutExercise?.workoutId).filter(Boolean) as string[])];

  return NextResponse.json({
    hasAttendance: !!hasAttendance,
    loggedWorkoutIds,
    reason: !hasAttendance ? "You must check in first for this date before you can log a session." : undefined,
  });
}
