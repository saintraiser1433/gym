import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createClientMembershipSchema } from "@/lib/validators/admin";

export async function DELETE() {
  await requireAdmin();
  // Delete renewals first to avoid FK issues, then client memberships
  await prisma.membershipRenewal.deleteMany({});
  const result = await prisma.clientMembership.deleteMany({});
  return NextResponse.json({ success: true, count: result.count });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const json = await req.json();
  const parsed = createClientMembershipSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { startDate, endDate, ...rest } = parsed.data;

  const clientMembership = await prisma.clientMembership.create({
    data: {
      ...rest,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
  });

  return NextResponse.json(clientMembership, { status: 201 });
}
