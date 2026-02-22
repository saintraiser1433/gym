import { prisma } from "@/lib/db";

/**
 * Recalculates currentValue and status for all active ClientGoals for a client.
 * For session goals: currentValue = number of days where (check-in + check-out) AND logged ALL workouts for that goal.
 */
export async function recalculateClientGoalProgress(clientId: string): Promise<void> {
  const clientGoals = await prisma.clientGoal.findMany({
    where: { clientId },
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
        clientId,
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
      const fullAttendanceRows = await prisma.attendance.findMany({
        where: { clientId, checkOutTime: { not: null } },
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
          clientId,
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
    const status = target > 0 && currentValue >= target ? "COMPLETED" : "ACTIVE";

    await prisma.clientGoal.update({
      where: { id: cg.id },
      data: { currentValue, status },
    });
  }
}
