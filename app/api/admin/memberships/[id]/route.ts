import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateMembershipSchema } from "@/lib/validators/admin";

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  await requireAdmin();
  const json = await req.json();
  const parsed = updateMembershipSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const membership = await prisma.membership.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json(membership);
  } catch {
    return NextResponse.json(
      { error: "Membership not found" },
      { status: 404 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await requireAdmin();

  try {
    await prisma.membership.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Membership not found" },
      { status: 404 },
    );
  }
}

