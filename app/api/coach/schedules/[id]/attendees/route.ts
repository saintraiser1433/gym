import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const session = await requireCoach();
  const userId = (session.user as any).id as string;

  const coach = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!coach) {
    return NextResponse.json(
      { error: "Coach profile not found" },
      { status: 404 },
    );
  }

  const schedule = await prisma.schedule.findFirst({
    where: { id: params.id, coachId: coach.id },
    select: { id: true },
  });

  if (!schedule) {
    return NextResponse.json(
      { error: "Schedule not found" },
      { status: 404 },
    );
  }

  const attendees = await prisma.attendance.findMany({
    where: { scheduleId: schedule.id },
    include: {
      client: { include: { user: true } },
    },
  });

  return NextResponse.json({ data: attendees });
}

