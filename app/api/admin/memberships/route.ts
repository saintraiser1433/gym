import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  createMembershipSchema,
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

  const [total, memberships] = await Promise.all([
    prisma.membership.count({ where }),
    prisma.membership.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({ data: memberships, page, pageSize, total });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const json = await req.json();
  const parsed = createMembershipSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { description, ...dataWithoutDescription } = parsed.data;
  const membership = await prisma.membership.create({
    data: dataWithoutDescription,
  });
  if (description != null && description !== "") {
    await prisma.$executeRaw`
      UPDATE "Membership" SET "description" = ${description} WHERE id = ${membership.id}
    `;
  }
  const created = await prisma.membership.findUnique({
    where: { id: membership.id },
  });
  return NextResponse.json(created ?? membership, { status: 201 });
}

