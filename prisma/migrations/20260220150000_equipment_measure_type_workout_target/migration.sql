-- AlterTable Equipment: add measureType (per pcs / per kg)
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "measureType" "WorkoutType" DEFAULT 'PER_PCS';

-- AlterTable WorkoutEquipment: add targetValue (target when using this equipment in this workout)
ALTER TABLE "WorkoutEquipment" ADD COLUMN IF NOT EXISTS "targetValue" DOUBLE PRECISION;
