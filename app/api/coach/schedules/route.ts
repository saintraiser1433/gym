import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

export async function GET() {
  const session = await requireCoach();
  const userId = (session.user as any).id as string;

  const coach = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!coach) {
    return NextResponse.json({ data: [], assignedClientNames: [] });
  }

  const [schedules, assignedProfiles] = await Promise.all([
    prisma.schedule.findMany({
      where: { coachId: coach.id },
      orderBy: { startTime: "asc" },
    }),
    prisma.clientProfile.findMany({
      where: {
        assignedCoachId: coach.id,
        memberships: {
          some: {
            status: "ACTIVE",
            membership: {
              OR: [{ type: "PREMIUM" }, { hasCoach: true }],
            },
          },
        },
      },
      include: { user: { select: { name: true } } },
    }),
  ]);

  const assignedClientNames = assignedProfiles
    .map((p) => p.user?.name?.trim())
    .filter((n): n is string => Boolean(n))
    .sort((a, b) => a.localeCompare(b));

  return NextResponse.json({ data: schedules, assignedClientNames });
}

