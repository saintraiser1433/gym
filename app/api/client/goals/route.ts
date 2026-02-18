import { NextRequest, NextResponse } from "next/server";
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

  const goals = await prisma.clientGoal.findMany({
    where: { clientId: profile.id },
    include: { goal: true },
    orderBy: { deadline: "asc" },
  });

  return NextResponse.json({ data: goals });
}

export async function POST(req: NextRequest) {
  const session = await requireClient();
  const userId = (session.user as any).id as string;
  const body = await req.json();

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

  const goal = await prisma.clientGoal.create({
    data: {
      clientId: profile.id,
      goalId: body.goalId,
      targetValue: body.targetValue ?? null,
      deadline: body.deadline ? new Date(body.deadline) : null,
    },
  });

  return NextResponse.json(goal, { status: 201 });
}

