import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

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

  const progress = await prisma.workoutProgress.findMany({
    where: { clientId: profile.id },
    orderBy: { completedDate: "desc" },
    include: {
      workoutExercise: {
        include: {
          workout: true,
          exercise: true,
        },
      },
      workout: true,
    },
  });

  return NextResponse.json({ data: progress });
}

export async function POST(req: NextRequest) {
  const session = await requireClient();
  const userId = (session.user as any).id as string;
  const body = await req.json();

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Client profile not found" },
      { status: 404 },
    );
  }

  const activeMembership = await prisma.clientMembership.findFirst({
    where: { clientId: profile.id, status: "ACTIVE" },
    include: { membership: { select: { hasCoach: true, type: true } } },
  });
  const isPremium = activeMembership?.membership?.type === "PREMIUM" || activeMembership?.membership?.hasCoach === true;
  if (isPremium) {
    return NextResponse.json(
      { error: "Premium members cannot log their own progress. Your coach will log sessions for you." },
      { status: 403 },
    );
  }

  const workoutExerciseId = body.workoutExerciseId ?? null;
  const workoutId = body.workoutId ?? null;
  if (!workoutExerciseId && !workoutId) {
    return NextResponse.json(
      { error: "Either workoutExerciseId or workoutId is required" },
      { status: 400 },
    );
  }

  const logDate = body.completedDate ? new Date(body.completedDate) : new Date();
  const y = logDate.getUTCFullYear();
  const m = logDate.getUTCMonth();
  const d = logDate.getUTCDate();
  const startOfDayUTC = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  const endOfDayUTC = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));

  // Must be checked in on that day to log a session (Basic: self check-in; applies to all)
  const hasAttendance = await prisma.attendance.findFirst({
    where: {
      clientId: profile.id,
      checkInTime: { gte: startOfDayUTC, lte: endOfDayUTC },
    },
  });
  if (!hasAttendance) {
    return NextResponse.json(
      { error: "You must check in first before logging a session. Check in from Schedules or the check-in page." },
      { status: 400 },
    );
  }

  // One log per workout per day: can log each workout once per calendar day
  const workoutIdForDuplicateCheck =
    workoutId ||
    (workoutExerciseId
      ? (
          await prisma.workoutExercise.findUnique({
            where: { id: workoutExerciseId },
            select: { workoutId: true },
          })
        )?.workoutId
      : null);
  if (workoutIdForDuplicateCheck) {
    const existingSameWorkoutDay = await prisma.workoutProgress.findFirst({
      where: {
        clientId: profile.id,
        completedDate: { gte: startOfDayUTC, lte: endOfDayUTC },
        OR: [
          { workoutId: workoutIdForDuplicateCheck },
          { workoutExercise: { workoutId: workoutIdForDuplicateCheck } },
        ],
      },
    });
    if (existingSameWorkoutDay) {
      return NextResponse.json(
        { error: "A session for this workout is already logged on this date." },
        { status: 400 },
      );
    }
  }

  const progress = await prisma.workoutProgress.create({
    data: {
      clientId: profile.id,
      workoutExerciseId: workoutExerciseId || undefined,
      workoutId: workoutId || undefined,
      actualSets: body.actualSets != null && body.actualSets !== "" ? Number(body.actualSets) : null,
      actualReps: body.actualReps != null && body.actualReps !== "" ? Number(body.actualReps) : null,
      weight: body.weight != null && body.weight !== "" ? Number(body.weight) : null,
      notes: body.notes && String(body.notes).trim() ? String(body.notes).trim() : null,
      rating: body.rating != null && body.rating !== "" ? Number(body.rating) : null,
      completedDate: logDate,
    },
    include: {
      workoutExercise: { select: { workoutId: true } },
      workout: { select: { id: true } },
    },
  });

  const workoutIdForGoals = progress.workoutExercise?.workoutId ?? progress.workoutId ?? workoutIdForDuplicateCheck ?? null;
  if (!workoutIdForGoals) {
    const { workoutExercise, workout, ...progressPayload } = progress;
    return NextResponse.json(progressPayload, { status: 201 });
  }

  const goalWorkouts = await prisma.goalWorkout.findMany({
    where: { workoutId: workoutIdForGoals },
    select: { goalId: true, workoutType: true },
  });
  const goalIds = [...new Set(goalWorkouts.map((gw) => gw.goalId))];
  if (goalIds.length === 0) {
    const { workoutExercise, workout, ...progressPayload } = progress;
    return NextResponse.json(progressPayload, { status: 201 });
  }

  const clientGoals = await prisma.clientGoal.findMany({
    where: { clientId: profile.id, goalId: { in: goalIds }, status: "ACTIVE" },
    select: { id: true, goalId: true, targetValue: true, targetSessions: true },
  });

  for (const cg of clientGoals) {
    const links = await prisma.goalWorkout.findMany({
      where: { goalId: cg.goalId },
      select: { workoutId: true, workoutType: true },
    });
    const workoutIdsForGoal = links.map((l) => l.workoutId);
    const isKgGoal = links.some((l) => l.workoutType === "PER_KG");

    const exerciseIds = await prisma.workoutExercise.findMany({
      where: { workoutId: { in: workoutIdsForGoal } },
      select: { id: true },
    });
    const weIds = exerciseIds.map((e) => e.id);

    const entries = await prisma.workoutProgress.findMany({
      where: {
        clientId: profile.id,
        OR: [
          ...(weIds.length > 0 ? [{ workoutExerciseId: { in: weIds } }] : []),
          { workoutId: { in: workoutIdsForGoal } },
        ],
      },
      select: { weight: true, actualReps: true, completedDate: true },
    });

    let currentValue: number;
    const targetSessions = cg.targetSessions ?? null;
    if (targetSessions != null) {
      // Session = one day where: check-in + check-out + logged ALL workouts for this goal
      const fullAttendanceRows = await prisma.attendance.findMany({
        where: {
          clientId: profile.id,
          checkOutTime: { not: null },
        },
        select: { checkInTime: true },
      });
      const dayKeysUTC = new Set(
        fullAttendanceRows.map((a) => {
          const d = new Date(a.checkInTime);
          return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
        })
      );
      const entriesWithWorkout = await prisma.workoutProgress.findMany({
        where: {
          clientId: profile.id,
          OR: [
            ...(weIds.length > 0 ? [{ workoutExerciseId: { in: weIds } }] : []),
            { workoutId: { in: workoutIdsForGoal } },
          ],
        },
        select: { completedDate: true, workoutId: true, workoutExercise: { select: { workoutId: true } } },
      });
      const dayToWorkouts = new Map<string, Set<string>>();
      for (const e of entriesWithWorkout) {
        if (!e.completedDate) continue;
        const d = new Date(e.completedDate);
        const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
        if (!dayKeysUTC.has(key)) continue;
        const wid = e.workoutId ?? e.workoutExercise?.workoutId ?? null;
        if (wid && workoutIdsForGoal.includes(wid)) {
          if (!dayToWorkouts.has(key)) dayToWorkouts.set(key, new Set());
          dayToWorkouts.get(key)!.add(wid);
        }
      }
      currentValue = 0;
      for (const key of dayKeysUTC) {
        const logged = dayToWorkouts.get(key);
        const allLogged = workoutIdsForGoal.length > 0 && workoutIdsForGoal.every((wid) => logged?.has(wid));
        if (allLogged) currentValue += 1;
      }
    } else if (isKgGoal) {
      currentValue = entries.reduce((sum, e) => sum + (e.weight ?? 0), 0);
    } else {
      currentValue = entries.reduce((sum, e) => sum + (e.actualReps ?? 0), 0);
    }

    const targetValue = cg.targetValue ?? 0;
    const isSessionGoal = targetSessions != null;
    const target = isSessionGoal ? targetSessions : targetValue;
    const status =
      target > 0 && currentValue >= target ? "COMPLETED" : "ACTIVE";

    await prisma.clientGoal.update({
      where: { id: cg.id },
      data: { currentValue, status },
    });
  }

  const { workoutExercise, workout, ...progressPayload } = progress;
  return NextResponse.json(progressPayload, { status: 201 });
}

