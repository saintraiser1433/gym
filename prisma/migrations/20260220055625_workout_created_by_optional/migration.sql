-- DropForeignKey
ALTER TABLE "Workout" DROP CONSTRAINT "Workout_createdById_fkey";

-- AlterTable
ALTER TABLE "Workout" ALTER COLUMN "createdById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "CoachProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
