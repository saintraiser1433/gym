import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateUserSchema } from "@/lib/validators/admin";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  await requireAdmin();
  const { id } = await params;
  const json = await req.json();
  const parsed = updateUserSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  await requireAdmin();
  const { id } = await params;

  try {
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 },
    );
  }
}

