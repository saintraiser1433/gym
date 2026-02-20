import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

/** Notifications for the current user (any role). */
export async function GET() {
  const session = await requireAuth();
  const userId = (session.user as { id?: string }).id as string;

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ data: notifications });
}
