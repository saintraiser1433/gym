import { prisma } from "@/lib/db";

/**
 * When true, the client must not add/remove workout goals themselves — the coach assigns goals.
 * Triggered by premium / coach-inclusive membership, or by having an assigned coach.
 */
export async function isClientGoalsManagedByCoach(userId: string): Promise<boolean> {
  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true, assignedCoachId: true },
  });
  if (!profile) return false;
  if (profile.assignedCoachId) return true;

  const active = await prisma.clientMembership.findFirst({
    where: { clientId: profile.id, status: "ACTIVE" },
    include: { membership: { select: { type: true, hasCoach: true } } },
  });
  const m = active?.membership;
  if (!m) return false;
  return m.type === "PREMIUM" || m.hasCoach === true;
}
