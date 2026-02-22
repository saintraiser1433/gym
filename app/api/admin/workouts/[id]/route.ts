import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const data: {
      name?: string;
      description?: string | null;
      duration?: number | null;
      difficulty?: string | null;
      demoMediaUrl?: string | null;
    } = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.description !== undefined)
      data.description = body.description ? String(body.description).trim() : null;
    if (body.duration !== undefined)
      data.duration = body.duration != null ? Number(body.duration) : null;
    if (body.difficulty !== undefined)
      data.difficulty = body.difficulty ? String(body.difficulty).trim() : null;
    if (body.demoMediaUrl !== undefined)
      data.demoMediaUrl = body.demoMediaUrl ? String(body.demoMediaUrl).trim() : null;

    const equipmentList = Array.isArray(body.equipment)
      ? body.equipment.filter(
          (e: any) => e?.equipmentId && Number(e?.quantity) >= 1,
        ).map((e: any) => ({
          equipmentId: String(e.equipmentId),
          quantity: Math.max(1, Number(e.quantity) || 1),
          targetKg: e.targetKg != null ? Number(e.targetKg) : null,
          targetPcs: e.targetPcs != null ? Number(e.targetPcs) : null,
        }))
      : null;

    if (equipmentList !== null) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "WorkoutEquipment" WHERE "workoutId" = $1`, id);
        if (equipmentList.length > 0) {
          const { randomUUID } = await import("crypto");
          for (const e of equipmentList) {
            await prisma.$executeRawUnsafe(
              `INSERT INTO "WorkoutEquipment" (id, "workoutId", "equipmentId", quantity, "targetKg", "targetPcs") VALUES ($1, $2, $3, $4, $5, $6)`,
              randomUUID(),
              id,
              e.equipmentId,
              e.quantity,
              e.targetKg,
              e.targetPcs,
            );
          }
        }
      } catch {
        // WorkoutEquipment table may not exist yet (migration not run)
      }
    }

    const workout = await prisma.workout.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        duration: true,
        difficulty: true,
        demoMediaUrl: true,
      },
    });
    let equipment: { equipmentId: string; equipmentName: string; quantity: number; measureTypes: string[]; targetKg: number | null; targetPcs: number | null }[] = [];
    try {
      const raw = await prisma.$queryRawUnsafe<{ equipmentId: string; quantity: number; name: string; measureTypes: string[] | null; targetKg: number | null; targetPcs: number | null }[]>(
        `SELECT we."equipmentId", we.quantity, we."targetKg", we."targetPcs", e.name, e."measureTypes" FROM "WorkoutEquipment" we JOIN "Equipment" e ON e.id = we."equipmentId" WHERE we."workoutId" = $1`,
        id,
      );
      equipment = raw.map((r) => ({
        equipmentId: r.equipmentId,
        equipmentName: r.name,
        quantity: r.quantity,
        measureTypes: Array.isArray(r.measureTypes) ? r.measureTypes : ["PER_PCS"],
        targetKg: r.targetKg,
        targetPcs: r.targetPcs,
      }));
    } catch {}
    return NextResponse.json({ ...workout, equipment });
  } catch {
    return NextResponse.json(
      { error: "Workout not found" },
      { status: 404 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await prisma.workout.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Workout not found" },
      { status: 404 },
    );
  }
}
