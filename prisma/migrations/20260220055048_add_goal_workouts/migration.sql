-- CreateTable
CREATE TABLE "_WorkoutToWorkoutGoal" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_WorkoutToWorkoutGoal_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_WorkoutToWorkoutGoal_B_index" ON "_WorkoutToWorkoutGoal"("B");

-- AddForeignKey
ALTER TABLE "_WorkoutToWorkoutGoal" ADD CONSTRAINT "_WorkoutToWorkoutGoal_A_fkey" FOREIGN KEY ("A") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WorkoutToWorkoutGoal" ADD CONSTRAINT "_WorkoutToWorkoutGoal_B_fkey" FOREIGN KEY ("B") REFERENCES "WorkoutGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
