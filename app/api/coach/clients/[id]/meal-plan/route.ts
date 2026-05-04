import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id: clientId } = await params;
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

  const mealPlan = await prisma.mealPlan.findUnique({
    where: { clientId },
  });

  return NextResponse.json({ data: mealPlan });
}

/** Create or replace the meal plan for this client (one per client). */
export async function PUT(req: Request, { params }: Params) {
  const { id: clientId } = await params;
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

  let body: { title?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title =
    typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Meal plan";
  const content = typeof body.content === "string" ? body.content : "";

  const saved = await prisma.mealPlan.upsert({
    where: { clientId },
    create: {
      clientId,
      coachId: coach.id,
      title,
      content,
    },
    update: {
      coachId: coach.id,
      title,
      content,
    },
  });

  return NextResponse.json({ data: saved });
}
