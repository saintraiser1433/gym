import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateClientMembershipSchema } from "@/lib/validators/admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;
  const json = await req.json();
  const parsed = updateClientMembershipSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data: { startDate?: Date; endDate?: Date; status?: string } = {};
  if (parsed.data.startDate) data.startDate = new Date(parsed.data.startDate);
  if (parsed.data.endDate) data.endDate = new Date(parsed.data.endDate);
  if (parsed.data.status) data.status = parsed.data.status;

  try {
    const clientMembership = await prisma.clientMembership.update({
      where: { id },
      data,
    });
    return NextResponse.json(clientMembership);
  } catch {
    return NextResponse.json(
      { error: "Client membership not found" },
      { status: 404 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;

  try {
    await prisma.clientMembership.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Client membership not found" },
      { status: 404 },
    );
  }
}
