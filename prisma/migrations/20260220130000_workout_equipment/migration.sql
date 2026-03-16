-- CreateTable
CREATE TABLE "WorkoutEquipment" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "WorkoutEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutEquipment_workoutId_equipmentId_key" ON "WorkoutEquipment"("workoutId", "equipmentId");

-- AddForeignKey
ALTER TABLE "WorkoutEquipment" ADD CONSTRAINT "WorkoutEquipment_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutEquipment" ADD CONSTRAINT "WorkoutEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
