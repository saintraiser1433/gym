import { NextResponse } from "next/server";
import { GoalStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

type Params = { params: Promise<{ id: string; clientGoalId: string }> };

function parseOptionalFloat(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseOptionalInt(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

/** PATCH: coach updates client goal targets (kg/sessions), deadline, status. */
export async function PATCH(req: Request, { params }: Params) {
  const { id: clientId, clientGoalId } = await params;
  const session = await requireCoach();
  const userId = (session.user as { id?: string }).id as string;

  const coach = await prisma.coachProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!coach) {
    return NextResponse.json({ error: "Coach profile not found" }, { status: 404 });
  }

  const client = await prisma.clientProfile.findFirst({
    where: { id: clientId, assignedCoachId: coach.id },
    select: { id: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.clientGoal.findFirst({
    where: { id: clientGoalId, clientId },
    include: { goal: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const data: {
    targetValue?: number | null;
    targetSessions?: number | null;
    deadline?: Date | null;
    status?: GoalStatus;
  } = {};

  if ("targetValue" in body) {
    const v = parseOptionalFloat(body.targetValue);
    if (v !== undefined) data.targetValue = v;
  }
  if ("targetSessions" in body) {
    const v = parseOptionalInt(body.targetSessions);
    if (v !== undefined) data.targetSessions = v;
  }

  if ("deadline" in body) {
    const d = body.deadline;
    if (d === null || d === undefined || d === "") {
      data.deadline = null;
    } else if (typeof d === "string") {
      const dt = new Date(d);
      if (!Number.isFinite(dt.getTime())) {
        return NextResponse.json({ error: "Invalid deadline" }, { status: 400 });
      }
      data.deadline = dt;
    }
  }

  if ("status" in body && typeof body.status === "string") {
    const s = body.status as GoalStatus;
    if (!Object.values(GoalStatus).includes(s)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = s;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  }

  const updated = await prisma.clientGoal.update({
    where: { id: clientGoalId },
    data,
    include: { goal: true },
  });

  return NextResponse.json({ data: updated });
}
