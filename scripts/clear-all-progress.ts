/**
 * Wipes all workout progress and all attendance for all users; resets client goal progress.
 * Run with: npm run clear-progress
 * Requires DATABASE_URL in .env
 */
import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const progressCount = await prisma.workoutProgress.count();
  console.log(`Found ${progressCount} workout progress record(s).`);
  const deletedProgress = await prisma.workoutProgress.deleteMany({});
  console.log(`Deleted ${deletedProgress.count} workout progress record(s).`);

  const attendanceCount = await prisma.attendance.count();
  console.log(`Found ${attendanceCount} attendance record(s).`);
  const deletedAttendance = await prisma.attendance.deleteMany({});
  console.log(`Deleted ${deletedAttendance.count} attendance record(s).`);

  const goalsUpdated = await prisma.clientGoal.updateMany({
    data: {
      currentValue: 0,
      status: "ACTIVE",
    },
  });
  console.log(`Reset currentValue and status to ACTIVE for ${goalsUpdated.count} client goal(s).`);

  console.log("Done. All progress and attendance cleared.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
