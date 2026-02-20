-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "description" TEXT,
ALTER COLUMN "duration" DROP NOT NULL;
