import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/** Mark a notification as read (only the current user's own). */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireAuth();
  const userId = (session.user as { id?: string }).id as string;
  const { id } = await params;

  const notification = await prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!notification) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }

  await prisma.notification.update({
    where: { id },
    data: { read: true },
  });

  return NextResponse.json({ success: true });
}
