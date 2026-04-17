-- Drop old unique constraint (goalId + workoutId)
DROP INDEX IF EXISTS "GoalWorkout_goalId_workoutId_key";

-- Allow same workout on multiple plan days for the same goal
CREATE UNIQUE INDEX "GoalWorkout_goalId_workoutId_planDay_key"
ON "GoalWorkout" ("goalId", "workoutId", "planDay");
