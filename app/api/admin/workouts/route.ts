import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/** List all workouts (admin + coach-created). Used in goals and admin workouts page. */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized", data: [] }, { status: 401 });
  }

  try {
    const workouts = await prisma.workout.findMany({
      select: { id: true, name: true, description: true, duration: true, difficulty: true, demoMediaUrl: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ data: workouts });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load workouts", data: [] },
      { status: 500 },
    );
  }
}

/** Create a workout (admin-created; no coach required). */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const description = body.description ? String(body.description).trim() : null;
    const duration = body.duration != null ? Number(body.duration) : null;
    const difficulty = body.difficulty ? String(body.difficulty).trim() : null;
    const demoMediaUrl = body.demoMediaUrl ? String(body.demoMediaUrl).trim() : null;

    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "Workout" (id, name, description, duration, difficulty, "createdById", "demoMediaUrl")
      VALUES (${id}, ${name}, ${description}, ${duration}, ${difficulty}, NULL, ${demoMediaUrl})
    `;
    const workout = await prisma.workout.findUniqueOrThrow({
      where: { id },
      select: { id: true, name: true, description: true, duration: true, difficulty: true, demoMediaUrl: true },
    });
    return NextResponse.json(workout, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to create workout" },
      { status: 500 },
    );
  }
}
