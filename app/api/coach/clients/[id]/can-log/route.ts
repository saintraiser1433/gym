import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/** Returns hasAttendance + which workout IDs this client has already logged today (one log per workout per day). */
export async function GET(req: NextRequest, { params }: Params) {
  const session = await requireCoach();
  const userId = (session.user as { id?: string }).id as string;
  const clientId = (await params).id;

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!coachProfile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await prisma.clientProfile.findFirst({
    where: { id: clientId, assignedCoachId: coachProfile.id },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
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
      clientId: client.id,
      checkInTime: { gte: startOfDayUTC, lte: endOfDayUTC },
    },
  });

  const progressToday = await prisma.workoutProgress.findMany({
    where: {
      clientId: client.id,
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
    reason: !hasAttendance ? "Client must be checked in for this date before logging a session." : undefined,
  });
}
