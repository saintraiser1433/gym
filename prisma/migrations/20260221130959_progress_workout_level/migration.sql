-- DropForeignKey
ALTER TABLE "WorkoutProgress" DROP CONSTRAINT "WorkoutProgress_workoutExerciseId_fkey";

-- AddForeignKey
ALTER TABLE "WorkoutProgress" ADD CONSTRAINT "WorkoutProgress_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;
