import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

async function resolveClientProfileId(userId: string) {
  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

export async function GET(_req: NextRequest, context: Context) {
  const session = await requireClient();
  const userId = (session.user as { id?: string }).id as string;
  const { id } = await context.params;
  const profileId = await resolveClientProfileId(userId);

  if (!profileId) {
    return NextResponse.json({ error: "Client profile not found" }, { status: 404 });
  }

  const goal = await prisma.clientGoal.findFirst({
    where: { id, clientId: profileId },
    select: { id: true },
  });
  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const updates = await prisma.clientGoalUpdate.findMany({
    where: { clientGoalId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, message: true, createdAt: true },
  });

  return NextResponse.json({ data: updates });
}

export async function POST(req: NextRequest, context: Context) {
  const session = await requireClient();
  const userId = (session.user as { id?: string }).id as string;
  const { id } = await context.params;
  const profileId = await resolveClientProfileId(userId);

  if (!profileId) {
    return NextResponse.json({ error: "Client profile not found" }, { status: 404 });
  }

  const goal = await prisma.clientGoal.findFirst({
    where: { id, clientId: profileId },
    select: { id: true },
  });
  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const message = String(body?.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (message.length > 500) {
    return NextResponse.json({ error: "Message is too long (max 500 chars)" }, { status: 400 });
  }

  const update = await prisma.clientGoalUpdate.create({
    data: {
      clientGoalId: id,
      message,
    },
    select: { id: true, message: true, createdAt: true },
  });

  return NextResponse.json(update, { status: 201 });
}
