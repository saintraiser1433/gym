import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateEquipmentSchema } from "@/lib/validators/admin";

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  await requireAdmin();
  const json = await req.json();
  const parsed = updateEquipmentSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data: any = { ...parsed.data };
  if (data.purchaseDate) data.purchaseDate = new Date(data.purchaseDate);
  if (data.lastMaintenance) data.lastMaintenance = new Date(data.lastMaintenance);
  if (data.nextMaintenance) data.nextMaintenance = new Date(data.nextMaintenance);

  try {
    const equipment = await prisma.equipment.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(equipment);
  } catch {
    return NextResponse.json(
      { error: "Equipment not found" },
      { status: 404 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await requireAdmin();

  try {
    await prisma.equipment.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Equipment not found" },
      { status: 404 },
    );
  }
}

