import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { updateEquipmentSchema } from "@/lib/validators/admin";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: Context) {
  await requireAdmin();
  const { id } = await context.params;
  const json = await req.json();
  const parsed = updateEquipmentSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = { ...parsed.data };
  const measureTypes = data.measureTypes as string[] | undefined;
  delete data.measureTypes;
  if (data.purchaseDate) data.purchaseDate = new Date(data.purchaseDate as string);
  if (data.lastMaintenance) data.lastMaintenance = new Date(data.lastMaintenance as string);
  if (data.nextMaintenance) data.nextMaintenance = new Date(data.nextMaintenance as string);

  try {
    const equipment = await prisma.equipment.update({
      where: { id },
      data,
    });
    if (Array.isArray(measureTypes)) {
      const types = measureTypes.filter((t: string) => t === "PER_KG" || t === "PER_PCS");
      if (types.length > 0) {
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE "Equipment" SET "measureTypes" = $1::text[] WHERE id = $2`,
            types,
            id,
          );
        } catch {}
      }
    }
    const out = equipment as Record<string, unknown>;
    out.measureTypes = Array.isArray(measureTypes) ? measureTypes.filter((t: string) => t === "PER_KG" || t === "PER_PCS") : ["PER_PCS"];
    return NextResponse.json(out);
  } catch {
    return NextResponse.json(
      { error: "Equipment not found" },
      { status: 404 },
    );
  }
}

export async function DELETE(_req: NextRequest, context: Context) {
  await requireAdmin();
  const { id } = await context.params;

  try {
    await prisma.equipment.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Equipment not found" },
      { status: 404 },
    );
  }
}

