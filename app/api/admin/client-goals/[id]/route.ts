import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateClientGoalSchema } from "@/lib/validators/admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;
  const json = await req.json();
  const parsed = updateClientGoalSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data: {
    targetValue?: number | null;
    currentValue?: number | null;
    deadline?: Date | null;
    status?: string;
  } = {};
  if (parsed.data.targetValue !== undefined) data.targetValue = parsed.data.targetValue;
  if (parsed.data.currentValue !== undefined) data.currentValue = parsed.data.currentValue;
  if (parsed.data.deadline !== undefined) {
    data.deadline = parsed.data.deadline ? new Date(parsed.data.deadline) : null;
  }
  if (parsed.data.status) data.status = parsed.data.status;

  try {
    const clientGoal = await prisma.clientGoal.update({
      where: { id },
      data,
    });
    return NextResponse.json(clientGoal);
  } catch {
    return NextResponse.json(
      { error: "Client goal not found" },
      { status: 404 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;

  try {
    await prisma.clientGoal.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Client goal not found" },
      { status: 404 },
    );
  }
}
