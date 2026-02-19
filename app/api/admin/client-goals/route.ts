import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  createClientGoalSchema,
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
  const where =
    search && search.trim().length > 0
      ? {
          client: {
            user: {
              name: { contains: search, mode: "insensitive" as const },
            },
          },
        }
      : {};

  const [total, rows] = await Promise.all([
    prisma.clientGoal.count({ where }),
    prisma.clientGoal.findMany({
      where,
      orderBy: { deadline: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        client: { include: { user: true } },
        goal: true,
      },
    }),
  ]);

  return NextResponse.json({ data: rows, page, pageSize, total });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const json = await req.json();
  const parsed = createClientGoalSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { deadline, ...rest } = parsed.data;

  const clientGoal = await prisma.clientGoal.create({
    data: {
      ...rest,
      deadline: deadline ? new Date(deadline) : undefined,
    },
  });

  return NextResponse.json(clientGoal, { status: 201 });
}
