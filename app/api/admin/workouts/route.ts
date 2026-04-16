import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/** List all workouts (admin + coach-created). Used in goals and admin workouts page. */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized", data: [] }, { status: 401 });
  }

  try {
    const [workouts, allEquipment] = await Promise.all([
      prisma.workout.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          duration: true,
          difficulty: true,
          demoMediaUrl: true,
          media: {
            select: {
              id: true,
              url: true,
              stepName: true,
              description: true,
              mediaType: true,
              durationSeconds: true,
              order: true,
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.equipment.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
    const workoutIds = workouts.map((w) => w.id);
    const equipmentIds = allEquipment.map((e) => e.id);
    const measureTypesById: Record<string, string[]> = {};
    if (equipmentIds.length > 0) {
      try {
        const rows = await prisma.$queryRawUnsafe<{ id: string; measureTypes: string[] | null }[]>(
          `SELECT id, "measureTypes" FROM "Equipment" WHERE id = ANY($1::text[])`,
          equipmentIds,
        );
        rows.forEach((r) => {
          measureTypesById[r.id] = Array.isArray(r.measureTypes) ? r.measureTypes.filter((t) => t === "PER_KG" || t === "PER_PCS") : ["PER_PCS"];
        });
      } catch {}
    }
    const equipment = allEquipment.map((e) => ({
      id: e.id,
      name: e.name,
      measureTypes: measureTypesById[e.id] ?? ["PER_PCS"],
    }));
    type EquipmentRow = { workoutId: string; equipmentId: string; quantity: number; equipmentName: string; measureTypes: string[] | null; targetKg: number | null; targetPcs: number | null };
    let equipmentRows: EquipmentRow[] = [];
    if (workoutIds.length > 0) {
      try {
        const raw = await prisma.$queryRawUnsafe<{ workoutId: string; equipmentId: string; quantity: number; name: string; measureTypes: string[] | null; targetKg: number | null; targetPcs: number | null }[]>(
          `SELECT we."workoutId", we."equipmentId", we.quantity, we."targetKg", we."targetPcs", e.name, e."measureTypes"
           FROM "WorkoutEquipment" we
           JOIN "Equipment" e ON e.id = we."equipmentId"
           WHERE we."workoutId" = ANY($1::text[])`,
          workoutIds,
        );
        equipmentRows = raw.map((r) => ({
          ...r,
          equipmentName: r.name,
          measureTypes: Array.isArray(r.measureTypes) ? r.measureTypes : ["PER_PCS"],
        }));
      } catch {
        equipmentRows = [];
      }
    }
    const equipmentByWorkout = equipmentRows.reduce((acc, r) => {
      if (!acc[r.workoutId]) acc[r.workoutId] = [];
      acc[r.workoutId].push({
        equipmentId: r.equipmentId,
        equipmentName: r.equipmentName,
        quantity: r.quantity,
        measureTypes: r.measureTypes ?? ["PER_PCS"],
        targetKg: r.targetKg,
        targetPcs: r.targetPcs,
      });
      return acc;
    }, {} as Record<string, { equipmentId: string; equipmentName: string; quantity: number; measureTypes: string[]; targetKg: number | null; targetPcs: number | null }[]>);
    const data = workouts.map((w) => ({
      ...w,
      media: w.media.length
        ? w.media
        : w.demoMediaUrl
          ? [
              {
                id: `legacy-${w.id}`,
                url: w.demoMediaUrl,
                stepName: null,
                description: null,
                mediaType: w.demoMediaUrl.toLowerCase().endsWith(".gif") ? "GIF" : "VIDEO",
                durationSeconds: w.duration ? w.duration * 60 : 60,
                order: 0,
              },
            ]
          : [],
      equipment: equipmentByWorkout[w.id] ?? [],
    }));
    return NextResponse.json({ data, equipment });
  } catch {
    return NextResponse.json(
      { error: "Failed to load workouts", data: [] },
      { status: 500 },
    );
  }
}

/** Create a workout (admin-created; no coach required). */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const description = body.description ? String(body.description).trim() : null;
    const duration = body.duration != null ? Number(body.duration) : null;
    const difficulty = body.difficulty ? String(body.difficulty).trim() : null;
    const demoMediaUrl = body.demoMediaUrl ? String(body.demoMediaUrl).trim() : null;
    const mediaList = Array.isArray(body.media)
      ? body.media
          .map((m: unknown, index: number) => {
            const item = (typeof m === "object" && m !== null ? m : {}) as {
              url?: unknown;
              stepName?: unknown;
              description?: unknown;
              mediaType?: unknown;
              durationSeconds?: unknown;
              order?: unknown;
            };
            return {
              url: String(item.url ?? "").trim(),
              stepName: item.stepName != null ? String(item.stepName).trim() : null,
              description: item.description != null ? String(item.description).trim() : null,
              mediaType: String(item.mediaType ?? "").toUpperCase() === "VIDEO" ? "VIDEO" : "GIF",
              durationSeconds: Number(item.durationSeconds),
              order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
            };
          })
          .filter((m: { url: string; durationSeconds: number }) => m.url.length > 0 && Number.isFinite(m.durationSeconds) && m.durationSeconds > 0)
      : [];
    const equipmentList = Array.isArray(body.equipment)
      ? body.equipment
          .filter(
            (e: unknown) =>
              typeof e === "object" &&
              e !== null &&
              "equipmentId" in e &&
              "quantity" in e &&
              Number((e as { quantity: unknown }).quantity) >= 1,
          )
          .map((e: unknown) => {
            const item = e as {
              equipmentId: unknown;
              quantity: unknown;
              targetKg?: unknown;
              targetPcs?: unknown;
            };
            return {
              equipmentId: String(item.equipmentId),
              quantity: Math.max(1, Number(item.quantity) || 1),
              targetKg: item.targetKg != null ? Number(item.targetKg) : null,
              targetPcs: item.targetPcs != null ? Number(item.targetPcs) : null,
            };
          })
      : [];

    const workout = await prisma.workout.create({
      data: { name, description, duration, difficulty, demoMediaUrl },
      select: { id: true, name: true, description: true, duration: true, difficulty: true, demoMediaUrl: true },
    });

    if (mediaList.length > 0) {
      await prisma.workoutMedia.createMany({
        data: mediaList.map((m: { url: string; stepName: string | null; description: string | null; mediaType: "GIF" | "VIDEO"; durationSeconds: number; order: number }) => ({
          workoutId: workout.id,
          url: m.url,
          stepName: m.stepName,
          description: m.description,
          mediaType: m.mediaType,
          durationSeconds: m.durationSeconds,
          order: m.order,
        })),
      });
    }

    let equipment: { equipmentId: string; equipmentName: string; quantity: number; measureTypes: string[]; targetKg: number | null; targetPcs: number | null }[] = [];
    let media: { id: string; url: string; stepName: string | null; description: string | null; mediaType: "GIF" | "VIDEO"; durationSeconds: number; order: number }[] = [];
    if (equipmentList.length > 0) {
      try {
        const { randomUUID } = await import("crypto");
        for (const e of equipmentList) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO "WorkoutEquipment" (id, "workoutId", "equipmentId", quantity, "targetKg", "targetPcs") VALUES ($1, $2, $3, $4, $5, $6)`,
            randomUUID(),
            workout.id,
            e.equipmentId,
            e.quantity,
            e.targetKg,
            e.targetPcs,
          );
        }
        const equipmentRows = await prisma.$queryRawUnsafe<{ equipmentId: string; quantity: number; name: string; measureTypes: string[] | null; targetKg: number | null; targetPcs: number | null }[]>(
          `SELECT we."equipmentId", we.quantity, we."targetKg", we."targetPcs", e.name, e."measureTypes" FROM "WorkoutEquipment" we JOIN "Equipment" e ON e.id = we."equipmentId" WHERE we."workoutId" = $1`,
          workout.id,
        );
        equipment = equipmentRows.map((r) => ({
          equipmentId: r.equipmentId,
          equipmentName: r.name,
          quantity: r.quantity,
          measureTypes: Array.isArray(r.measureTypes) ? r.measureTypes : ["PER_PCS"],
          targetKg: r.targetKg,
          targetPcs: r.targetPcs,
        }));
      } catch {
        equipment = [];
      }
    }
    media = await prisma.workoutMedia.findMany({
      where: { workoutId: workout.id },
      select: { id: true, url: true, stepName: true, description: true, mediaType: true, durationSeconds: true, order: true },
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ ...workout, equipment, media }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create workout" },
      { status: 500 },
    );
  }
}
