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

  const progress = await prisma.workoutProgress.findMany({
    where: { clientId: profile.id },
    orderBy: { completedDate: "desc" },
  });

  return NextResponse.json({ data: progress });
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

  const progress = await prisma.workoutProgress.create({
    data: {
      clientId: profile.id,
      workoutExerciseId: body.workoutExerciseId,
      actualSets: body.actualSets,
      actualReps: body.actualReps,
      weight: body.weight,
      notes: body.notes,
      rating: body.rating,
    },
  });

  return NextResponse.json(progress, { status: 201 });
}

