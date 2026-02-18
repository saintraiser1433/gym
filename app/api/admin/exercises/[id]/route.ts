import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateExerciseSchema } from "@/lib/validators/admin";

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  await requireAdmin();
  const json = await req.json();
  const parsed = updateExerciseSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const exercise = await prisma.exercise.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json(exercise);
  } catch {
    return NextResponse.json(
      { error: "Exercise not found" },
      { status: 404 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await requireAdmin();

  try {
    await prisma.exercise.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Exercise not found" },
      { status: 404 },
    );
  }
}

