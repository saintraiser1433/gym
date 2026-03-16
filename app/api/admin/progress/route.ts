import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/** Delete all workout progress for all users. Admin only. */
export async function DELETE() {
  await requireAdmin();

  const result = await prisma.workoutProgress.deleteMany({});

  return NextResponse.json({
    success: true,
    deleted: result.count,
    message: `Deleted ${result.count} progress record(s).`,
  });
}
