import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

export async function GET() {
  const session = await requireCoach();
  const userId = (session.user as any).id as string;

  const coach = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!coach) {
    return NextResponse.json({ data: [] });
  }

  const workouts = await prisma.workout.findMany({
    where: { createdById: coach.id },
    include: {
      exercises: {
        include: { exercise: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: workouts });
}

export async function POST(req: NextRequest) {
  const session = await requireCoach();
  const userId = (session.user as any).id as string;
  const body = await req.json();

  const coach = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!coach) {
    return NextResponse.json(
      { error: "Coach profile not found" },
      { status: 404 },
    );
  }

  const { name, description, targetGoals, duration, difficulty, exercises } =
    body;

  const workout = await prisma.workout.create({
    data: {
      name,
      description,
      targetGoals,
      duration,
      difficulty,
      createdById: coach.id,
      exercises: {
        create: (exercises ?? []).map((e: any, index: number) => ({
          exerciseId: e.exerciseId,
          sets: e.sets,
          reps: e.reps,
          duration: e.duration,
          restTime: e.restTime,
          order: index,
        })),
      },
    },
    include: {
      exercises: {
        include: { exercise: true },
      },
    },
  });

  return NextResponse.json(workout, { status: 201 });
}

