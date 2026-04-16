-- CreateEnum
CREATE TYPE "WorkoutMediaType" AS ENUM ('GIF', 'VIDEO');

-- CreateTable
CREATE TABLE "WorkoutMedia" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mediaType" "WorkoutMediaType" NOT NULL DEFAULT 'GIF',
    "durationSeconds" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "WorkoutMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientGoalUpdate" (
    "id" TEXT NOT NULL,
    "clientGoalId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientGoalUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutMedia_workoutId_order_idx" ON "WorkoutMedia"("workoutId", "order");

-- CreateIndex
CREATE INDEX "ClientGoalUpdate_clientGoalId_createdAt_idx" ON "ClientGoalUpdate"("clientGoalId", "createdAt");

-- AddForeignKey
ALTER TABLE "WorkoutMedia" ADD CONSTRAINT "WorkoutMedia_workoutId_fkey"
FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientGoalUpdate" ADD CONSTRAINT "ClientGoalUpdate_clientGoalId_fkey"
FOREIGN KEY ("clientGoalId") REFERENCES "ClientGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
