-- CreateEnum
CREATE TYPE "ClientGoalWorkoutPlanMode" AS ENUM ('CATALOG', 'CUSTOM');

-- AlterTable
ALTER TABLE "ClientGoal" ADD COLUMN "workoutPlanMode" "ClientGoalWorkoutPlanMode" NOT NULL DEFAULT 'CATALOG';

-- CreateTable
CREATE TABLE "ClientGoalWorkout" (
    "id" TEXT NOT NULL,
    "clientGoalId" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "workoutType" "WorkoutType" NOT NULL,
    "targetValue" DOUBLE PRECISION,
    "planDay" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ClientGoalWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientGoalWorkout_clientGoalId_workoutId_planDay_key" ON "ClientGoalWorkout"("clientGoalId", "workoutId", "planDay");

-- AddForeignKey
ALTER TABLE "ClientGoalWorkout" ADD CONSTRAINT "ClientGoalWorkout_clientGoalId_fkey" FOREIGN KEY ("clientGoalId") REFERENCES "ClientGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientGoalWorkout" ADD CONSTRAINT "ClientGoalWorkout_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
