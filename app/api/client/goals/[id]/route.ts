import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

/** Delete one of the client's goals. */
export async function DELETE(req: NextRequest, context: Context) {
  const session = await requireClient();
  const userId = (session.user as any).id as string;
  const { id } = await context.params;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "Client profile not found" },
      { status: 404 },
    );
  }

  const goal = await prisma.clientGoal.findFirst({
    where: { id, clientId: profile.id },
    select: { id: true },
  });

  if (!goal) {
    return NextResponse.json(
      { error: "Goal not found" },
      { status: 404 },
    );
  }

  await prisma.clientGoal.delete({
    where: { id: goal.id },
  });

  return NextResponse.json({ success: true });
}
