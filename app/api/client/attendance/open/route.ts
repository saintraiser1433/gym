import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

/** Returns today's attendances for this client that have no check-out (still "checked in"). */
export async function GET() {
  let session;
  try {
    session = await requireClient();
  } catch {
    return NextResponse.json({ error: "Unauthorized", data: [] }, { status: 401 });
  }
  const userId = (session.user as { id?: string }).id as string;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ data: [] });
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const open = await prisma.attendance.findMany({
    where: {
      clientId: profile.id,
      checkInTime: { gte: startOfToday, lt: endOfToday },
      checkOutTime: null,
    },
    orderBy: { checkInTime: "desc" },
    include: { schedule: true },
  });

  return NextResponse.json({ data: open });
}
