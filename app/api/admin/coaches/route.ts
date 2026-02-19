import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();

  // List coaches by account role (User.role === COACH), not by CoachProfile existence
  const usersWithRoleCoach = await prisma.user.findMany({
    where: { role: "COACH" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  const data = await Promise.all(
    usersWithRoleCoach.map(async (user) => {
      // Use upsert so we never hit unique constraint if CoachProfile already exists
      const profile = await prisma.coachProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
        select: { id: true },
      });
      return {
        id: profile.id,
        name: user.name,
        email: user.email,
      };
    }),
  );

  return NextResponse.json({ data });
}
