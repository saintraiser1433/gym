import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

/** List all memberships (subscriptions) for the logged-in client */
export async function GET() {
  const session = await requireClient();
  const userId = (session.user as { id?: string }).id as string;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ data: [] });
  }

  // Auto-mark expired memberships based on today's date
  const now = new Date();
  await prisma.clientMembership.updateMany({
    where: {
      clientId: profile.id,
      status: "ACTIVE",
      endDate: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  const list = await prisma.clientMembership.findMany({
    where: { clientId: profile.id },
    orderBy: { startDate: "desc" },
    include: {
      membership: true,
    },
  });

  return NextResponse.json({ data: list });
}
