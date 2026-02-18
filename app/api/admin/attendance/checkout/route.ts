import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { emit } from "@/lib/websocket";

export async function POST(req: NextRequest) {
  await requireAdmin();
  const { attendanceId } = await req.json();

  const existing = await prisma.attendance.findUnique({
    where: { id: attendanceId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Attendance not found" },
      { status: 404 },
    );
  }

  const updated = await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      checkOutTime: new Date(),
    },
  });

  emit("attendance:checkout", { attendanceId: updated.id, clientId: updated.clientId });

  return NextResponse.json(updated);
}

