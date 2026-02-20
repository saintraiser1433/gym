import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateMembershipSchema } from "@/lib/validators/admin";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;
  const json = await req.json();
  const parsed = updateMembershipSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const { description, ...dataWithoutDescription } = parsed.data;
    const membership = await prisma.membership.update({
      where: { id },
      data: dataWithoutDescription,
    });
    if (description !== undefined) {
      await prisma.$executeRaw`
        UPDATE "Membership" SET "description" = ${description ?? null} WHERE id = ${id}
      `;
    }
    const updated = await prisma.membership.findUnique({
      where: { id },
    });
    return NextResponse.json(updated ?? membership);
  } catch {
    return NextResponse.json(
      { error: "Membership not found" },
      { status: 404 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await requireAdmin();
  const { id } = await params;

  try {
    await prisma.membership.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete membership error", error);
    return NextResponse.json(
      {
        error:
          "Cannot delete membership. It may be in use by client memberships or payments.",
      },
      { status: 400 },
    );
  }
}

