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
        name: { contains: search, mode: "insensitive" },
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

  return NextResponse.json({ data: equipment, page, pageSize, total });
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

  const { purchaseDate, ...rest } = parsed.data;

  const equipment = await prisma.equipment.create({
    data: {
      ...rest,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
    },
  });

  return NextResponse.json(equipment, { status: 201 });
}

