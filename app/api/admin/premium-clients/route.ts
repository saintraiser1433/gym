import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/** List clients who have an active Premium membership (for assigning to coaches). */
export async function GET() {
  await requireAdmin();

  const clientIdsWithPremium = await prisma.clientMembership.findMany({
    where: {
      status: "ACTIVE",
      membership: {
        OR: [{ type: "PREMIUM" }, { hasCoach: true }],
      },
    },
    select: { clientId: true },
    distinct: ["clientId"],
  });
  const ids = clientIdsWithPremium.map((c) => c.clientId);
  if (ids.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const clients = await prisma.clientProfile.findMany({
    where: { id: { in: ids } },
    include: {
      user: { select: { name: true, email: true } },
      assignedCoach: { select: { id: true, user: { select: { name: true, email: true } } } },
    },
    orderBy: { joinDate: "desc" },
  });

  const data = clients.map((c) => ({
    id: c.id,
    name: c.user?.name ?? "—",
    email: c.user?.email ?? "—",
    assignedCoachId: c.assignedCoachId ?? null,
    assignedCoachName: c.assignedCoach?.user?.name ?? null,
    assignedCoachEmail: c.assignedCoach?.user?.email ?? null,
  }));

  return NextResponse.json({ data });
}
