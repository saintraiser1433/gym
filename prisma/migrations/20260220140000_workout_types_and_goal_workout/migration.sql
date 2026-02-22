-- CreateEnum
CREATE TYPE "WorkoutType" AS ENUM ('PER_PCS', 'PER_KG');

-- AlterTable Workout: add types column (text array, default empty)
ALTER TABLE "Workout" ADD COLUMN IF NOT EXISTS "types" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable GoalWorkout (explicit join with type + targetValue)
CREATE TABLE "GoalWorkout" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "workoutType" "WorkoutType" NOT NULL,
    "targetValue" DOUBLE PRECISION,

    CONSTRAINT "GoalWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoalWorkout_goalId_workoutId_key" ON "GoalWorkout"("goalId", "workoutId");

-- Migrate data from _WorkoutToWorkoutGoal (A = workoutId, B = goalId)
INSERT INTO "GoalWorkout" ("id", "goalId", "workoutId", "workoutType", "targetValue")
SELECT gen_random_uuid()::text, "B", "A", 'PER_PCS'::"WorkoutType", NULL
FROM "_WorkoutToWorkoutGoal"
ON CONFLICT ("goalId", "workoutId") DO NOTHING;

-- AddForeignKey
ALTER TABLE "GoalWorkout" ADD CONSTRAINT "GoalWorkout_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "WorkoutGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoalWorkout" ADD CONSTRAINT "GoalWorkout_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old join table
DROP TABLE IF EXISTS "_WorkoutToWorkoutGoal";
