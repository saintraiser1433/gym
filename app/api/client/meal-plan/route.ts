import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

/** Client reads their coach-authored meal plan (if any). */
export async function GET() {
  const session = await requireClient();
  const userId = (session.user as { id?: string }).id as string;

  const profile = await prisma.clientProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ data: null });
  }

  const mealPlan = await prisma.mealPlan.findUnique({
    where: { clientId: profile.id },
  });

  return NextResponse.json({ data: mealPlan });
}
