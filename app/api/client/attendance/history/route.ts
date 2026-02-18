import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

export async function GET() {
  const session = await requireClient();
  const userId = (session.user as any).id as string;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ data: [] });
  }

  const attendance = await prisma.attendance.findMany({
    where: { clientId: profile.id },
    orderBy: { checkInTime: "desc" },
  });

  return NextResponse.json({ data: attendance });
}

