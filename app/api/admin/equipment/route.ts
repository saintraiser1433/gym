import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  createEquipmentSchema,
  paginationSchema,
} from "@/lib/validators/admin";

export async function GET(req: NextRequest) {
  await requireAdmin();
  const url = new URL(req.url);
  const parsed = paginationSchema.safeParse({
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
    search: url.searchParams.get("search") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query params" },
      { status: 400 },
    );
  }

  const { page, pageSize, search } = parsed.data;
  const where = search
    ? {
        name: { contains: search, mode: "insensitive" as const },
      }
    : {};

  const [total, equipment] = await Promise.all([
    prisma.equipment.count({ where }),
    prisma.equipment.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const ids = equipment.map((e) => e.id);
  let measureTypesById: Record<string, string[]> = {};
  if (ids.length > 0) {
    try {
      const rows = await prisma.$queryRawUnsafe<{ id: string; measureTypes: string[] | null }[]>(
        `SELECT id, "measureTypes" FROM "Equipment" WHERE id = ANY($1::text[])`,
        ids,
      );
      rows.forEach((r) => {
        measureTypesById[r.id] = Array.isArray(r.measureTypes) ? r.measureTypes.filter((t) => t === "PER_KG" || t === "PER_PCS") : ["PER_PCS"];
      });
    } catch {}
  }
  const data = equipment.map((e) => ({ ...e, measureTypes: measureTypesById[e.id] ?? ["PER_PCS"] }));
  return NextResponse.json({ data, page, pageSize, total });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const json = await req.json();
  const parsed = createEquipmentSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { purchaseDate, measureTypes, ...rest } = parsed.data as { name: string; purchaseDate?: string; measureTypes?: string[]; type?: string; brand?: string; status?: string; quantity?: number; [k: string]: unknown };

  const equipment = await prisma.equipment.create({
    data: {
      name: rest.name,
      type: rest.type ?? undefined,
      brand: rest.brand ?? undefined,
      status: (rest.status as "AVAILABLE" | "MAINTENANCE" | "BROKEN") ?? "AVAILABLE",
      quantity: rest.quantity ?? 1,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
    },
  });

  const types = Array.isArray(measureTypes) ? measureTypes.filter((t) => t === "PER_KG" || t === "PER_PCS") : ["PER_PCS"];
  if (types.length === 0) types.push("PER_PCS");
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "Equipment" SET "measureTypes" = $1::text[] WHERE id = $2`,
      types,
      equipment.id,
    );
  } catch {}
  const out = equipment as Record<string, unknown>;
  out.measureTypes = types;
  return NextResponse.json(out, { status: 201 });
}

