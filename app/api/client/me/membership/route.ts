import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

/** Returns the client's active membership info (hasCoach = Premium-style). */
export async function GET() {
  let session;
  try {
    session = await requireClient();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id as string;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ hasCoach: false });
  }

  const active = await prisma.clientMembership.findFirst({
    where: { clientId: profile.id, status: "ACTIVE" },
    include: { membership: { select: { hasCoach: true, type: true } } },
  });

  const membershipType = active?.membership?.type ?? null;
  const hasCoachFlag = active?.membership?.hasCoach ?? false;
  const isPremium = membershipType === "PREMIUM" || hasCoachFlag;

  return NextResponse.json({
    hasActiveMembership: !!active,
    hasCoach: isPremium,
    membershipType,
  });
}
