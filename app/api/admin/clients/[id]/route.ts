import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

/** PATCH: update client profile (e.g. assignedCoachId). Admin only. */
export async function PATCH(req: Request, { params }: Params) {
  await requireAdmin();
  const { id } = await params;
  let body: { assignedCoachId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.assignedCoachId !== undefined) {
    const coachId = body.assignedCoachId === null || body.assignedCoachId === "" ? null : body.assignedCoachId;
    if (coachId !== null) {
      const coach = await prisma.coachProfile.findUnique({ where: { id: coachId }, select: { id: true } });
      if (!coach) {
        return NextResponse.json({ error: "Coach not found" }, { status: 404 });
      }
    }
    const profile = await prisma.clientProfile.findUnique({ where: { id }, select: { id: true } });
    if (!profile) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    await prisma.clientProfile.update({
      where: { id },
      data: { assignedCoachId: coachId },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
}
