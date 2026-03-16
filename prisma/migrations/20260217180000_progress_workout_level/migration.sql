-- AlterTable: allow logging progress at workout level (no exercise) when workout has no exercises
ALTER TABLE "WorkoutProgress" ADD COLUMN "workoutId" TEXT;

ALTER TABLE "WorkoutProgress" ALTER COLUMN "workoutExerciseId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "WorkoutProgress" ADD CONSTRAINT "WorkoutProgress_workoutId_fkey" 
  FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
