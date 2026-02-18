import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateGoalSchema } from "@/lib/validators/admin";

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  await requireAdmin();
  const json = await req.json();
  const parsed = updateGoalSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const goal = await prisma.workoutGoal.update({
      where: { id: params.id },
      data: parsed.data,
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

  try {
    await prisma.workoutGoal.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Goal not found" },
      { status: 404 },
    );
  }
}

