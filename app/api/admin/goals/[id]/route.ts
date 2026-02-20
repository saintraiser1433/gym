import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateGoalSchema } from "@/lib/validators/admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;
  const json = await req.json();
  const parsed = updateGoalSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { workoutIds, ...rest } = parsed.data;

  try {
    const updateData: Parameters<typeof prisma.workoutGoal.update>[0]["data"] = {
      ...rest,
    };
    if (workoutIds !== undefined) {
      updateData.workouts = {
        set: (workoutIds as string[]).map((workoutId) => ({ id: workoutId })),
      };
    }
    const goal = await prisma.workoutGoal.update({
      where: { id },
      data: updateData,
      include: { workouts: { select: { id: true, name: true } } },
    });
    return NextResponse.json(goal);
  } catch {
    return NextResponse.json(
      { error: "Goal not found" },
      { status: 404 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;

  try {
    await prisma.workoutGoal.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Goal not found" },
      { status: 404 },
    );
  }
}

