import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

/** Schedules this client is allowed to see by membership type (and optionally attended). */
export async function GET() {
  let session;
  try {
    session = await requireClient();
  } catch {
    return NextResponse.json({ error: "Unauthorized", data: [] }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true, assignedCoachId: true },
  });

  if (!profile) {
    return NextResponse.json({ data: [] });
  }

  // Client only sees schedules of their assigned coach
  if (!profile.assignedCoachId) {
    return NextResponse.json({ data: [] });
  }

  // Client's active membership types (e.g. PREMIUM)
  const activeMemberships = await prisma.clientMembership.findMany({
    where: { clientId: profile.id, status: "ACTIVE" },
    include: { membership: { select: { type: true } } },
  });
  const clientMembershipTypes = [...new Set(activeMemberships.map((cm) => cm.membership.type))];

  // Schedules from a bit in the past to a year ahead — only for this client's coach
  const from = new Date();
  from.setMonth(from.getMonth() - 1);
  const to = new Date();
  to.setFullYear(to.getFullYear() + 1);

  const allSchedules = await prisma.schedule.findMany({
    where: {
      coachId: profile.assignedCoachId,
      startTime: { gte: from, lte: to },
    },
    orderBy: { startTime: "asc" },
    include: { coach: { include: { user: true } } },
  });

  // Show schedule if: no restriction (null/empty) OR client has at least one allowed type
  const allowed = allSchedules.filter((s) => {
    const raw = s.allowedMembershipTypes;
    if (raw == null) return true;
    let arr: string[];
    try {
      arr = Array.isArray(raw) ? raw : (typeof raw === "string" ? JSON.parse(raw) : []);
    } catch {
      arr = [];
    }
    if (arr.length === 0) return true;
    const allowedTypes = arr.map((x) => String(x).toUpperCase());
    return clientMembershipTypes.some((t) => allowedTypes.includes(t));
  });

  return NextResponse.json({ data: allowed });
}
