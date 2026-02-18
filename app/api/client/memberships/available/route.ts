import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireClient } from "@/lib/auth";

export async function GET() {
  await requireClient();

  const memberships = await prisma.membership.findMany({
    where: { status: "ACTIVE" },
    orderBy: { price: "asc" },
  });

  return NextResponse.json({ data: memberships });
}

