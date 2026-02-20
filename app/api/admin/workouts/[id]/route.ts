import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const data: {
      name?: string;
      description?: string | null;
      duration?: number | null;
      difficulty?: string | null;
      demoMediaUrl?: string | null;
    } = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.description !== undefined)
      data.description = body.description ? String(body.description).trim() : null;
    if (body.duration !== undefined)
      data.duration = body.duration != null ? Number(body.duration) : null;
    if (body.difficulty !== undefined)
      data.difficulty = body.difficulty ? String(body.difficulty).trim() : null;
    if (body.demoMediaUrl !== undefined)
      data.demoMediaUrl = body.demoMediaUrl ? String(body.demoMediaUrl).trim() : null;

    const workout = await prisma.workout.update({
      where: { id },
      data,
    });
    return NextResponse.json(workout);
  } catch {
    return NextResponse.json(
      { error: "Workout not found" },
      { status: 404 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await prisma.workout.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Workout not found" },
      { status: 404 },
    );
  }
}
