-- Equipment: add measureTypes (array)
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "measureTypes" TEXT[] DEFAULT ARRAY['PER_PCS']::TEXT[];
-- Backfill from measureType if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Equipment' AND column_name = 'measureType') THEN
    UPDATE "Equipment" SET "measureTypes" = ARRAY["measureType"::text] WHERE "measureType" IS NOT NULL;
    ALTER TABLE "Equipment" DROP COLUMN "measureType";
  END IF;
END $$;

-- WorkoutEquipment: add targetKg and targetPcs
ALTER TABLE "WorkoutEquipment" ADD COLUMN IF NOT EXISTS "targetKg" DOUBLE PRECISION;
ALTER TABLE "WorkoutEquipment" ADD COLUMN IF NOT EXISTS "targetPcs" DOUBLE PRECISION;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'WorkoutEquipment' AND column_name = 'targetValue') THEN
    UPDATE "WorkoutEquipment" SET "targetPcs" = "targetValue" WHERE "targetValue" IS NOT NULL;
    ALTER TABLE "WorkoutEquipment" DROP COLUMN "targetValue";
  END IF;
END $$;
