import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateAttendanceSchema } from "@/lib/validators/admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;
  const json = await req.json();
  const parsed = updateAttendanceSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data: { checkOutTime?: Date | null } = {};
  if (parsed.data.checkOutTime !== undefined) {
    data.checkOutTime = parsed.data.checkOutTime
      ? new Date(parsed.data.checkOutTime)
      : null;
  }

  try {
    const attendance = await prisma.attendance.update({
      where: { id },
      data,
    });
    return NextResponse.json(attendance);
  } catch {
    return NextResponse.json(
      { error: "Attendance record not found" },
      { status: 404 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;

  try {
    await prisma.attendance.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Attendance record not found" },
      { status: 404 },
    );
  }
}
