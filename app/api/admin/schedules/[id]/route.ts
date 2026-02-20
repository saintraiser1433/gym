import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateScheduleSchema } from "@/lib/validators/admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;
  const json = await req.json();
  const parsed = updateScheduleSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { startTime, endTime, coachId, ...rest } = parsed.data;
  const data: Record<string, unknown> = {
    ...rest,
    ...(startTime !== undefined ? { startTime: new Date(startTime) } : {}),
    ...(endTime !== undefined ? { endTime: new Date(endTime) } : {}),
    ...(coachId !== undefined
      ? coachId
        ? { coach: { connect: { id: coachId } } }
        : { coach: { disconnect: true } }
      : {}),
  };

  try {
    const schedule = await prisma.schedule.update({
      where: { id },
      data,
    });
    return NextResponse.json(schedule);
  } catch {
    return NextResponse.json(
      { error: "Schedule not found" },
      { status: 404 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;

  try {
    await prisma.schedule.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Schedule not found" },
      { status: 404 },
    );
  }
}

