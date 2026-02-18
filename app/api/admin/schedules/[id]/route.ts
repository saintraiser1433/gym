import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateScheduleSchema } from "@/lib/validators/admin";

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  await requireAdmin();
  const json = await req.json();
  const parsed = updateScheduleSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data: any = { ...parsed.data };
  if (data.startTime) data.startTime = new Date(data.startTime);
  if (data.endTime) data.endTime = new Date(data.endTime);

  try {
    const schedule = await prisma.schedule.update({
      where: { id: params.id },
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

  try {
    await prisma.schedule.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Schedule not found" },
      { status: 404 },
    );
  }
}

